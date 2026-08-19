import { auth } from "@/modules/auth";
import prisma from "@/lib/db";

export class GitHubService {
  /**
   * Fetches the user's access token from the database.
   */
  private static async getUserAccessToken(userId: string): Promise<string> {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "github",
      },
    });

    if (!account?.access_token) {
      throw new Error("GitHub access token not found for user.");
    }

    return account.access_token;
  }

  /**
   * Fetches repositories accessible to the user via the GitHub API.
   */
  static async getAccessibleRepositories(userId: string) {
    const token = await this.getUserAccessToken(userId);

    // Using the GitHub REST API to get installations (if using GitHub App)
    // or user repos (if using OAuth). Since we set up an OAuth app in Phase 1,
    // we fetch the user's repos.

    // Note: To fetch repos from orgs, the OAuth app needs the 'repo' scope.
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `GitHub API authentication failed: ${response.statusText}. Please ensure your GitHub App has the correct permissions (Metadata, Contents, PRs).`,
        );
      }
      throw new Error(
        `Failed to fetch repositories from GitHub: ${response.statusText}`,
      );
    }

    const repos = await response.json();

    return repos.map((repo: any) => ({
      externalId: repo.id.toString(),
      name: repo.full_name,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
    }));
  }

  /**
   * Connects a specific repository to an organization.
   * Now accepts userId so we can copy the OAuth token into the Integration record.
   */
  static async connectRepository(
    organizationId: string,
    userId: string,
    repoData: any,
  ) {
    // Fetch the user's GitHub OAuth token so downstream services can use it
    const accessToken = await this.getUserAccessToken(userId);

    // Ensure an integration record exists for this org, storing the access token
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: "github",
        },
      },
      create: {
        organizationId,
        provider: "github",
        status: "active",
        accessToken,
      },
      update: {
        // Always refresh the token in case it changed since last connect
        accessToken,
      },
    });

    // Create the repository record
    const repository = await prisma.repository.upsert({
      where: {
        integrationId_externalId: {
          integrationId: integration.id,
          externalId: repoData.externalId,
        },
      },
      create: {
        organizationId,
        integrationId: integration.id,
        externalId: repoData.externalId,
        name: repoData.name,
        url: repoData.url,
        defaultBranch: repoData.defaultBranch,
      },
      update: {
        name: repoData.name,
        url: repoData.url,
        defaultBranch: repoData.defaultBranch,
        isActive: true,
      },
    });

    const [owner, repo] = repository.name.split("/");

    // Enqueue backfill job
    import("../jobs/backfill.job").then((module) => {
      module.BackfillJobService.enqueue({
        repositoryId: repository.id,
        integrationId: integration.id,
        externalId: repository.externalId,
        owner,
        repo,
      }).catch(console.error);
    });

    return repository;
  }
}
