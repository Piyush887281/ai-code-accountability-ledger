import { auth, MembershipRepository } from "@/modules/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import styles from "../../../page.module.css";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeSnippetViewer } from "@/components/ui/code-snippet";
import { revalidatePath } from "next/cache";

// Server action to update finding status
async function updateFindingStatusAction(formData: FormData) {
  "use server";
  
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const findingId = formData.get("findingId") as string;
  const status = formData.get("status") as string;
  
  await prisma.finding.update({
    where: { id: findingId },
    data: { status }
  });
  
  revalidatePath(`/dashboard/findings/${findingId}`);
}

export default async function FindingViewPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  // Tenant isolation
  const memberships = await MembershipRepository.findByUserId(session.user.id);
  const organizationIds = memberships.map(m => m.organizationId);

  const finding = await prisma.finding.findFirst({
    where: {
      id: params.id,
      pullRequest: {
        repository: {
          integration: {
            organizationId: {
              in: organizationIds
            }
          }
        }
      }
    },
    include: {
      pullRequest: {
        include: {
          repository: true
        }
      }
    }
  });

  if (!finding || !finding.pullRequest) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>404 - Finding Not Found</h1>
          <p>This finding does not exist or you do not have access to it.</p>
          <Link href="/dashboard" style={{ color: 'var(--muted)' }}>&larr; Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const sourceTitle = `PR #${finding.pullRequest.externalId}: ${finding.pullRequest.title}`;
  const author = finding.pullRequest.authorName || 'Unknown';
  
  let severityVariant: 'critical' | 'high' | 'medium' | 'low' = 'low';
  let severityLabel = 'Low';
  if (finding.isCritical) { severityVariant = 'critical'; severityLabel = 'Critical'; }
  else if (finding.reviewDepthScore > 60) { severityVariant = 'high'; severityLabel = 'High'; }
  else if (finding.reviewDepthScore > 40) { severityVariant = 'medium'; severityLabel = 'Medium'; }

  // PR description or dummy snippet
  const codeSnippet = finding.pullRequest.title + "\n\n" + "No specific code snippet available. The AI determined this PR required a deep review.";
  const language = 'markdown';

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h1 className="text-h1" style={{ margin: 0 }}>Finding Details</h1>
              <Badge variant={severityVariant}>{severityLabel} Risk ({finding.reviewDepthScore})</Badge>
              {finding.aiAuthorshipConfidence !== null && (
                <Badge variant={finding.aiAuthorshipConfidence > 70 ? 'ai' : 'human'}>
                  {finding.aiAuthorshipConfidence > 70 ? 'AI Authored' : 'Human Authored'}
                </Badge>
              )}
              <Badge variant={finding.status === 'open' ? 'critical' : 'info'}>
                {finding.status}
              </Badge>
            </div>
            <p className="text-body" style={{ margin: 0 }}>
              Repository: <Link href={`/dashboard/repos/${finding.pullRequest.repositoryId}`} style={{ color: 'var(--color-primary)' }}>{finding.pullRequest.repository.name}</Link>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <Link href={`/dashboard/repos/${finding.pullRequest.repositoryId}`} className="text-small">
              &larr; Back to Repository
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Code Snippet Viewer */}
          <section className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-header">
              <h2 className="text-h3" style={{ margin: 0 }}>Context</h2>
            </div>
            <CodeSnippetViewer 
              code={codeSnippet} 
              language={language}
              filename="Pull Request Description"
            />
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Actions Section */}
          <section className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-header">
              <h2 className="text-h3" style={{ margin: 0 }}>Actions</h2>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <form action={updateFindingStatusAction}>
                <input type="hidden" name="findingId" value={finding.id} />
                <input type="hidden" name="status" value="resolved" />
                  <button 
                    type="submit" 
                    disabled={finding.status === 'resolved'}
                    className="btn-primary"
                    style={{ width: '100%' }}
                  >
                    Acknowledge & Resolve
                  </button>
              </form>
              
              <form action={updateFindingStatusAction}>
                <input type="hidden" name="findingId" value={finding.id} />
                <input type="hidden" name="status" value="ignored" />
                  <button 
                    type="submit" 
                    disabled={finding.status === 'ignored'}
                    className="btn-secondary"
                    style={{ width: '100%' }}
                  >
                    Dismiss
                  </button>
              </form>
              
              {finding.status !== 'open' && (
                <form action={updateFindingStatusAction}>
                  <input type="hidden" name="findingId" value={finding.id} />
                  <input type="hidden" name="status" value="open" />
                    <button 
                      type="submit" 
                      className="btn-secondary"
                      style={{ width: '100%' }}
                    >
                      Reopen
                    </button>
                </form>
              )}
            </div>
          </section>

          {/* Summary Section */}
          <section className="panel" style={{ overflow: 'hidden' }}>
            <div className="panel-header">
              <h2 className="text-h3" style={{ margin: 0 }}>
                AI Rationale & Summary
              </h2>
            </div>
            <div className="panel-body">
              <p className="text-body" style={{ marginBottom: 'var(--space-4)' }}>
                AI analysis evaluated this pull request with a depth score of {finding.reviewDepthScore}. This finding was flagged for manual review based on the repository's criticality policies.
              </p>
              {finding.aiAuthorshipConfidence !== null && (
                <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                  <strong className="text-small" style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--color-foreground)' }}>AI Assesment Rationale</strong>
                  <p className="text-small" style={{ margin: 0 }}>
                    The orchestrator determined this code was likely {finding.aiAuthorshipConfidence > 70 ? 'AI generated' : 'human written'} with a confidence score of {finding.aiAuthorshipConfidence}/100.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Source Details */}
          <section className="panel" style={{ overflow: 'hidden' }}>
             <div className="panel-header">
               <h2 className="text-h3" style={{ margin: 0 }}>
                Source Information
              </h2>
             </div>
            <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
              <div>
                <p className="text-small" style={{ margin: '0 0 var(--space-1) 0' }}>Source</p>
                <p className="text-body" style={{ margin: 0, fontWeight: 500 }}>
                  <a href={finding.pullRequest.url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                    {sourceTitle} &nearr;
                  </a>
                </p>
              </div>
              <div>
                <p className="text-small" style={{ margin: '0 0 var(--space-1) 0' }}>Author</p>
                <p className="text-body" style={{ margin: 0, fontWeight: 500 }}>{author}</p>
              </div>
              <div>
                <p className="text-small" style={{ margin: '0 0 var(--space-1) 0' }}>Date</p>
                <p className="text-body" style={{ margin: 0, fontWeight: 500 }} suppressHydrationWarning>{new Date(finding.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
