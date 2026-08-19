import boss from "@/lib/queue";
import prisma from "@/lib/db";
import { Job } from "pg-boss";

export const BACKFILL_JOB_NAME = "github-repo-backfill";

interface BackfillJobData {
  repositoryId: string;
  integrationId: string;
  externalId: string; // GitHub Repo ID
  owner: string;
  repo: string;
  since?: string; // ISO Date string for bounded lookback
}

export class BackfillJobService {
  /**
   * Enqueues a backfill job for a newly connected repository.
   */
  static async enqueue(data: BackfillJobData) {
    // Default bounded lookback: 6 months
    if (!data.since) {
      const date = new Date();
      date.setMonth(date.getMonth() - 6);
      data.since = date.toISOString();
    }

    const jobId = await boss.send(BACKFILL_JOB_NAME, data, {
      retryLimit: 3,
      retryBackoff: true,
    });
    
    console.log(`[Backfill] Enqueued job ${jobId} for repo ${data.owner}/${data.repo}`);
    return jobId;
  }

  /**
   * Starts the worker to process backfill jobs.
   * In a real app, this would run in a separate worker process.
   */
  static async startWorker() {
    await boss.work(BACKFILL_JOB_NAME, async (job: Job<BackfillJobData>) => {
      const data = job.data;
      console.log(`[Backfill] Processing job ${job.id} for ${data.owner}/${data.repo}`);

      try {
        const integration = await prisma.integration.findUnique({
          where: { id: data.integrationId },
        });

        if (!integration || !integration.accessToken) {
          throw new Error(`Integration ${data.integrationId} not found or missing access token`);
        }

        const token = integration.accessToken;

        // Fetch Commits
        await this.fetchAndStoreCommits(data, token);

        // Fetch PRs
        await this.fetchAndStorePullRequests(data, token);

        console.log(`[Backfill] Completed job ${job.id} for ${data.owner}/${data.repo}`);
      } catch (error) {
        console.error(`[Backfill] Job ${job.id} failed:`, error);
        throw error; // Let pg-boss handle retries
      }
    });
  }

  private static async fetchAndStoreCommits(data: BackfillJobData, token: string) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.github.com/repos/${data.owner}/${data.repo}/commits?since=${data.since}&per_page=100&page=${page}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        // Simple rate limit handling
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          throw new Error(`Rate limit exceeded. Reset at ${resetTime}`);
        }
        throw new Error(`Failed to fetch commits: ${response.statusText}`);
      }

      const commits = await response.json();
      
      if (commits.length === 0) {
        hasMore = false;
        break;
      }

      // Store in DB idempotently
      for (const commit of commits) {
        await prisma.commit.upsert({
          where: {
            repositoryId_sha: {
              repositoryId: data.repositoryId,
              sha: commit.sha,
            }
          },
          create: {
            repositoryId: data.repositoryId,
            sha: commit.sha,
            message: commit.commit.message,
            authorName: commit.commit.author?.name || 'Unknown',
            authorEmail: commit.commit.author?.email || 'Unknown',
            date: new Date(commit.commit.author?.date || commit.commit.committer?.date),
            url: commit.html_url,
          },
          update: {} // No updates needed for immutable commits
        });
      }

      console.log(`[Backfill] Stored ${commits.length} commits for ${data.owner}/${data.repo} (Page ${page})`);
      
      // Check pagination links
      const linkHeader = response.headers.get('link');
      if (!linkHeader || !linkHeader.includes('rel="next"')) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  private static async fetchAndStorePullRequests(data: BackfillJobData, token: string) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.github.com/repos/${data.owner}/${data.repo}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PRs: ${response.statusText}`);
      }

      const prs = await response.json();
      
      if (prs.length === 0) {
        hasMore = false;
        break;
      }

      // Store in DB idempotently
      for (const pr of prs) {
        // If the PR was created before our 'since' date AND updated before our 'since' date, we can stop
        // because we are sorting by updated desc
        const updatedAt = new Date(pr.updated_at);
        if (data.since && updatedAt < new Date(data.since)) {
          hasMore = false;
          break;
        }

        await prisma.pullRequest.upsert({
          where: {
            repositoryId_externalId: {
              repositoryId: data.repositoryId,
              externalId: pr.number.toString(),
            }
          },
          create: {
            repositoryId: data.repositoryId,
            externalId: pr.number.toString(),
            title: pr.title,
            state: pr.state,
            authorName: pr.user?.login || 'Unknown',
            url: pr.html_url,
            createdAt: new Date(pr.created_at),
            updatedAt: new Date(pr.updated_at),
          },
          update: {
            state: pr.state,
            title: pr.title,
            updatedAt: new Date(pr.updated_at),
          }
        });
      }

      console.log(`[Backfill] Processed ${prs.length} PRs for ${data.owner}/${data.repo} (Page ${page})`);
      
      if (!hasMore) break;

      const linkHeader = response.headers.get('link');
      if (!linkHeader || !linkHeader.includes('rel="next"')) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }
}
