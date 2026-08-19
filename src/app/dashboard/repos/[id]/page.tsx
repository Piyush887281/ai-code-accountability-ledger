import { auth, MembershipRepository } from "@/modules/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import styles from "../../../page.module.css";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function RepositoryViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  // Verify tenant isolation
  const memberships = await MembershipRepository.findByUserId(session.user.id);
  const organizationIds = memberships.map((m) => m.organizationId);

  const repository = await prisma.repository.findFirst({
    where: {
      id: id,
      organizationId: {
        in: organizationIds,
      },
    },
  });

  if (!repository) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>404 - Not Found</h1>
          <p>This repository does not exist or you do not have access to it.</p>
          <Link href="/dashboard/repos" style={{ color: "var(--muted)" }}>
            &larr; Back to repositories
          </Link>
        </div>
      </main>
    );
  }

  // Pagination logic
  const PAGE_SIZE = 10;
  const currentPage = parseInt(page || "1", 10);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // Fetch Findings for this repo via PullRequest
  const [totalFindings, findings] = await Promise.all([
    prisma.finding.count({
      where: { pullRequest: { repositoryId: repository.id } },
    }),
    prisma.finding.findMany({
      where: { pullRequest: { repositoryId: repository.id } },
      orderBy: [
        { reviewDepthScore: "desc" }, // Sort by criticality score first
        { createdAt: "desc" },
      ],
      skip,
      take: PAGE_SIZE,
      include: {
        pullRequest: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalFindings / PAGE_SIZE);

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--space-4)",
          }}
        >
          <div>
            <h1 className="text-h1" style={{ marginBottom: "var(--space-1)" }}>
              {repository.name}
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>
              Default Branch: {repository.defaultBranch}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              alignItems: "center",
            }}
          >
            <a href={`/api/export/${repository.id}`} className="btn-primary">
              Export CSV &darr;
            </a>
            <Link href="/dashboard/repos" className="text-small">
              &larr; Back to list
            </Link>
          </div>
        </div>
      </div>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "var(--space-2)",
            marginBottom: "var(--space-4)",
          }}
        >
          <h2 className="text-h2">Findings</h2>
          <span className="text-small">
            Showing {findings.length} of {totalFindings}
          </span>
        </div>

        {findings.length === 0 ? (
          <div
            className="panel"
            style={{
              padding: "var(--space-12) var(--space-4)",
              textAlign: "center",
            }}
          >
            <p
              className="text-muted"
              style={{ margin: "0 0 var(--space-2) 0" }}
            >
              No findings generated yet.
            </p>
            <p className="text-small" style={{ margin: 0 }}>
              Findings will appear here as the system analyzes new commits and
              pull requests.
            </p>
          </div>
        ) : (
          <div className="panel" style={{ overflow: "hidden" }}>
            {findings.map((finding, index) => {
              const sourceTitle = finding.pullRequest
                ? `PR #${finding.pullRequest.externalId}: ${finding.pullRequest.title}`
                : "Unknown Source";

              const author = finding.pullRequest?.authorName || "Unknown";

              // Determine severity badge variant based on score
              let severityVariant: "critical" | "high" | "medium" | "low" =
                "low";
              let severityLabel = "Low";
              if (finding.isCritical) {
                severityVariant = "critical";
                severityLabel = "Critical";
              } else if (finding.reviewDepthScore > 60) {
                severityVariant = "high";
                severityLabel = "High";
              } else if (finding.reviewDepthScore > 40) {
                severityVariant = "medium";
                severityLabel = "Medium";
              }

              return (
                <div
                  key={finding.id}
                  style={{
                    padding: "var(--space-4) var(--space-5)",
                    borderBottom:
                      index < findings.length - 1
                        ? "1px solid var(--color-border)"
                        : "none",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    <div>
                      <h3
                        className="text-h3"
                        style={{ margin: "0 0 var(--space-1) 0" }}
                      >
                        <Link
                          href={`/dashboard/findings/${finding.id}`}
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {sourceTitle}
                        </Link>
                      </h3>
                      <p className="text-small" style={{ margin: 0 }}>
                        Author: {author} • Date:{" "}
                        <span suppressHydrationWarning>
                          {new Date(finding.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-2)",
                        alignItems: "center",
                      }}
                    >
                      <Badge variant={severityVariant}>
                        {severityLabel} Risk ({finding.reviewDepthScore})
                      </Badge>
                      {finding.aiAuthorshipConfidence !== null && (
                        <Badge
                          variant={
                            finding.aiAuthorshipConfidence > 70 ? "ai" : "human"
                          }
                        >
                          {finding.aiAuthorshipConfidence > 70
                            ? "AI Authored"
                            : "Human Authored"}
                        </Badge>
                      )}
                      <Badge variant="info">{finding.status}</Badge>
                    </div>
                  </div>

                  <p
                    className="text-body"
                    style={{
                      margin: "var(--space-2) 0 0 0",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    AI analysis evaluated this pull request with a depth score
                    of {finding.reviewDepthScore}. Requires review.
                  </p>

                  <div
                    style={{
                      marginTop: "var(--space-3)",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Link
                      href={`/dashboard/findings/${finding.id}`}
                      className="text-small"
                      style={{ color: "var(--color-primary)" }}
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "var(--space-8)",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <Link
              href={`/dashboard/repos/${repository.id}?page=${Math.max(1, currentPage - 1)}`}
              className="btn-secondary"
              style={{
                pointerEvents: currentPage === 1 ? "none" : "auto",
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              &larr; Previous
            </Link>
            <span className="text-small">
              Page {currentPage} of {totalPages}
            </span>
            <Link
              href={`/dashboard/repos/${repository.id}?page=${Math.min(totalPages, currentPage + 1)}`}
              className="btn-secondary"
              style={{
                pointerEvents: currentPage === totalPages ? "none" : "auto",
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next &rarr;
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
