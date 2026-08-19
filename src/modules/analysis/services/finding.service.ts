import prisma from "@/lib/db";
import { CriticalityService } from "./criticality.service";
import { ScoringService } from "./scoring.service";
import { AiOrchestratorService } from "@/modules/ai/services/orchestrator.service";

export class FindingService {
  /**
   * Generates or updates a Finding for a specific Pull Request.
   * Fetches the latest metadata from GitHub to calculate the review depth score.
   */
  static async analyzePullRequest(organizationId: string, repositoryId: string, prExternalId: string) {
    // 1. Get the local PR record
    const pr = await prisma.pullRequest.findUnique({
      where: {
        repositoryId_externalId: {
          repositoryId,
          externalId: prExternalId,
        }
      },
      include: {
        repository: {
          include: { integration: true }
        }
      }
    });

    if (!pr || !pr.repository.integration.accessToken) {
      throw new Error("PullRequest or Integration Access Token not found");
    }

    const repoName = pr.repository.name;
    const accessToken = pr.repository.integration.accessToken;

    // 2. Fetch PR metadata from GitHub for scoring
    const prUrl = `https://api.github.com/repos/${repoName}/pulls/${prExternalId}`;
    const prResponse = await fetch(prUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!prResponse.ok) {
      throw new Error(`Failed to fetch PR metadata from GitHub: ${prResponse.statusText}`);
    }

    const prData = await prResponse.json();

    const prMetadata = {
      createdAt: new Date(prData.created_at),
      mergedAt: prData.merged_at ? new Date(prData.merged_at) : null,
      commentsCount: prData.comments || 0,
      reviewCommentsCount: prData.review_comments || 0,
      requestedReviewersCount: prData.requested_reviewers?.length || 0,
      isMerged: !!prData.merged_at,
      author: prData.user?.login || "",
      mergedBy: prData.merged_by?.login || null,
    };

    // 3. Compute deterministic score
    const reviewDepthScore = ScoringService.calculateReviewDepthScore(prMetadata);

    // 4. Evaluate criticality
    const isCritical = await CriticalityService.evaluatePullRequest(organizationId, repositoryId, prExternalId);

    // 5. Fetch PR Diff for AI Analysis
    const diffResponse = await fetch(prUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Use the v3.diff media type to get the raw diff
        Accept: "application/vnd.github.v3.diff", 
      },
    });

    let aiAuthorshipConfidence = null;
    if (diffResponse.ok) {
      const diffContent = await diffResponse.text();
      // 6. Call AI Orchestrator Layer
      aiAuthorshipConfidence = await AiOrchestratorService.evaluateAuthorship(organizationId, diffContent);
    } else {
      console.warn(`[FindingService] Failed to fetch diff for PR ${prExternalId}, skipping AI classification.`);
    }

    // 7. Upsert Finding record
    const finding = await prisma.finding.upsert({
      where: {
        pullRequestId: pr.id,
      },
      update: {
        status: prData.state === "closed" ? (prData.merged_at ? "resolved" : "ignored") : "open",
        reviewDepthScore,
        isCritical,
        aiAuthorshipConfidence,
      },
      create: {
        pullRequestId: pr.id,
        status: prData.state === "closed" ? (prData.merged_at ? "resolved" : "ignored") : "open",
        reviewDepthScore,
        isCritical,
        aiAuthorshipConfidence,
      },
    });

    return finding;
  }
}
