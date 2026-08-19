import { auth, MembershipRepository } from "@/modules/auth";
import { redirect } from "next/navigation";
import styles from "../page.module.css";
import prisma from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const memberships = await MembershipRepository.findByUserId(session.user.id);
  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const activeOrg = memberships[0].organization;
  const orgId = activeOrg.id;

  // Fetch aggregate stats
  const totalRepos = await prisma.repository.count({
    where: { integration: { organizationId: orgId } }
  });

  const totalFindings = await prisma.finding.count({
    where: { pullRequest: { repository: { integration: { organizationId: orgId } } } }
  });

  const totalEvaluated = await prisma.finding.count({
    where: { 
      pullRequest: { repository: { integration: { organizationId: orgId } } },
      aiAuthorshipConfidence: { not: null }
    }
  });

  const aiAuthored = await prisma.finding.count({
    where: {
      pullRequest: { repository: { integration: { organizationId: orgId } } },
      aiAuthorshipConfidence: { gt: 70 } // Assuming > 70 is AI authored
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 className="text-h1" style={{ marginBottom: 'var(--space-1)' }}>Dashboard Overview</h1>
          <p className="text-muted">
            Active Organization: <strong>{activeOrg.name}</strong>
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 'var(--space-6)',
        marginBottom: 'var(--space-8)'
      }}>
        {/* Stat Card 1 */}
        <div className="panel">
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h3 className="text-small" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected Repos</h3>
            <p className="text-h1" style={{ fontSize: '2.5rem' }}>{totalRepos}</p>
          </div>
        </div>
        
        {/* Stat Card 2 */}
        <div className="panel">
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h3 className="text-small" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Open Findings</h3>
            <p className="text-h1" style={{ fontSize: '2.5rem' }}>{totalFindings}</p>
          </div>
        </div>
        
        {/* Stat Card 3 */}
        <div className="panel">
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h3 className="text-small" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Authored Findings</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
              <p className="text-h1" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>{aiAuthored}</p>
              <span className="text-muted">/ {totalEvaluated}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
