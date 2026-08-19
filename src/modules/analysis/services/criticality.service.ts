import prisma from "@/lib/db";
import { GitHubService } from "@/modules/ingestion/services/github.service";

export class CriticalityService {
  /**
   * Retrieves the criticality policy for a given repository.
   * Falls back to the organization-level policy if no repo-specific policy exists.
   */
  static async getPolicyForRepository(
    organizationId: string,
    repositoryId: string,
  ) {
    // Try to get repo-specific policy
    let policy = await prisma.criticalityPolicy.findUnique({
      where: {
        organizationId_repositoryId: {
          organizationId,
          repositoryId,
        },
      },
    });

    if (policy) {
      return policy;
    }

    // Fall back to org-level policy
    // We use findFirst because organizationId_repositoryId where repositoryId is null is unique
    policy = await prisma.criticalityPolicy.findFirst({
      where: {
        organizationId,
        repositoryId: null,
      },
    });

    // If no org policy exists, return an empty default
    if (!policy) {
      return { keywords: [] };
    }

    return policy;
  }

  /**
   * Updates the organization-level criticality policy.
   */
  static async updateOrgPolicy(organizationId: string, keywords: string[]) {
    // We need to use findFirst to check existence since prisma doesn't support
    // upsert with a null field in a unique constraint easily in some versions.
    const existing = await prisma.criticalityPolicy.findFirst({
      where: {
        organizationId,
        repositoryId: null,
      },
    });

    if (existing) {
      return prisma.criticalityPolicy.update({
        where: { id: existing.id },
        data: { keywords },
      });
    } else {
      return prisma.criticalityPolicy.create({
        data: {
          organizationId,
          keywords,
        },
      });
    }
  }

  /**
   * Evaluates if a pull request touches critical code paths based on the policy.
   * Note: Requires fetching the PR files from GitHub.
   */
  static async evaluatePullRequest(
    organizationId: string,
    repositoryId: string,
    prNumber: string,
  ): Promise<boolean> {
    const policy = await this.getPolicyForRepository(
      organizationId,
      repositoryId,
    );

    if (!policy.keywords || policy.keywords.length === 0) {
      return false; // No critical paths defined
    }

    // Fetch the repository to get the external ID (owner/repo)
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { integration: true },
    });

    if (!repo || !repo.integration.accessToken) {
      throw new Error("Repository or Integration Access Token not found");
    }

    // Fetch files changed in the PR from GitHub
    const url = `https://api.github.com/repos/${repo.name}/pulls/${prNumber}/files`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${repo.integration.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch PR files for ${repo.name}#${prNumber}: ${response.statusText}`,
      );
      // Fallback: If we can't fetch files, assume non-critical for now,
      // but in a strict compliance system you might fail closed (assume critical).
      return false;
    }

    const files = await response.json();
    const fileNames = files.map((f: any) => f.filename);

    // Check if any file matches any keyword (simple substring match for V1)
    for (const fileName of fileNames) {
      for (const keyword of policy.keywords) {
        if (fileName.includes(keyword)) {
          return true;
        }
      }
    }

    return false;
  }
}
