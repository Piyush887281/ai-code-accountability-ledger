export class ScoringService {
  /**
   * Computes a deterministic review-depth score for a pull request.
   * 
   * Heuristic (V1):
   * - Base Score: 100
   * - Fast Merge (< 10 minutes): -40
   * - No Comments: -30
   * - Self-Merged / No Reviewers: -100
   * 
   * Minimum score is 0.
   * 
   * @param prMetadata - Metadata fetched from the GitHub API
   */
  static calculateReviewDepthScore(prMetadata: {
    createdAt: Date;
    mergedAt: Date | null;
    commentsCount: number;
    reviewCommentsCount: number;
    requestedReviewersCount: number;
    isMerged: boolean;
    author: string;
    mergedBy: string | null;
  }): number {
    let score = 100;

    // We only penalize if it's actually merged
    if (prMetadata.isMerged && prMetadata.mergedAt) {
      const timeToMergeMinutes = (prMetadata.mergedAt.getTime() - prMetadata.createdAt.getTime()) / (1000 * 60);
      
      if (timeToMergeMinutes < 10) {
        score -= 40; // Penalty for suspiciously fast merges
      }

      const totalComments = prMetadata.commentsCount + prMetadata.reviewCommentsCount;
      if (totalComments === 0) {
        score -= 30; // Penalty for zero discussion
      }

      // Self-merged without reviewers is basically an unreviewed PR
      if (prMetadata.author === prMetadata.mergedBy && prMetadata.requestedReviewersCount === 0 && totalComments === 0) {
        score -= 100;
      }
    } else {
      // If not merged yet, but no one is assigned or reviewing
      if (prMetadata.requestedReviewersCount === 0 && (prMetadata.commentsCount + prMetadata.reviewCommentsCount) === 0) {
        score -= 50; 
      }
    }

    return Math.max(0, score);
  }
}
