import { auth, MembershipRepository } from "@/modules/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import styles from "../../../page.module.css";

export default async function RepositoryViewPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  // Verify tenant isolation: The user must be a member of the organization that owns this repo
  const memberships = await MembershipRepository.findByUserId(session.user.id);
  const organizationIds = memberships.map(m => m.organizationId);

  const repository = await prisma.repository.findFirst({
    where: {
      id: params.id,
      organizationId: {
        in: organizationIds
      }
    },
    include: {
      commits: {
        orderBy: { date: 'desc' },
        take: 20
      },
      pullRequests: {
        orderBy: { updatedAt: 'desc' },
        take: 10
      }
    }
  });

  if (!repository) {
    // If not found, it might not exist OR the user doesn't have access. Return 404 to prevent info leakage.
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>404 - Not Found</h1>
          <p>This repository does not exist or you do not have access to it.</p>
          <a href="/dashboard/repos" style={{ color: 'var(--text-secondary)' }}>&larr; Back to repositories</a>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container} style={{ maxWidth: '1000px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.title} style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{repository.name}</h1>
            <p className={styles.subtitle} style={{ margin: 0 }}>
              Default Branch: {repository.defaultBranch}
            </p>
          </div>
          <a href="/dashboard/repos" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
            &larr; Back to list
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '3rem' }}>
          {/* Commits Section */}
          <div>
            <h2 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Recent Commits</h2>
            {repository.commits.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No commits ingested yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {repository.commits.map(commit => (
                  <li key={commit.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <a href={commit.url} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                        {commit.message.split('\n')[0]}
                      </a>
                      <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{commit.sha.substring(0, 7)}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <span>{commit.authorName}</span>
                      <span>{new Date(commit.date).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* PRs Section */}
          <div>
            <h2 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Recent Pull Requests</h2>
            {repository.pullRequests.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No pull requests ingested yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {repository.pullRequests.map(pr => (
                  <li key={pr.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <a href={pr.url} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                        #{pr.externalId}: {pr.title}
                      </a>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '999px',
                        backgroundColor: pr.state === 'open' ? 'var(--surface-100)' : 'var(--surface-50)',
                        border: '1px solid var(--border)'
                      }}>
                        {pr.state}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <span>{pr.authorName}</span>
                      <span>Updated: {new Date(pr.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
