import { auth, MembershipRepository } from "@/modules/auth";
import { updateCriticalityPolicyAction } from "@/modules/analysis/actions";
import { CriticalityService } from "@/modules/analysis/services/criticality.service";
import { redirect } from "next/navigation";
import styles from "../../page.module.css";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const memberships = await MembershipRepository.findByUserId(session.user.id);
  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const membership = memberships[0];
  const isAdmin = membership.role === "org_admin";

  // Fetch current policy
  // Passing null equivalent for repositoryId to fetch the org-level policy
  const policy = await CriticalityService.getPolicyForRepository(membership.organizationId, "fallback_id_never_used");
  const keywordsString = policy.keywords.join(", ");

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="text-h1" style={{ marginBottom: 'var(--space-1)' }}>Organization Settings</h1>
        <p className="text-muted">Manage your organization's compliance and risk policies.</p>
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <h2 className="text-h2">Criticality Policy</h2>
        </div>
        <div className="panel-body">
          <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>
            Define keywords or paths that indicate business-critical code (e.g., auth, payments). 
            Pull Requests touching these files will be flagged as Critical Findings.
          </p>

          <form action={updateCriticalityPolicyAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label htmlFor="keywords" style={{ fontWeight: 500, color: 'var(--color-foreground)', fontSize: '0.875rem' }}>
                Path Keywords (comma-separated)
              </label>
              <input 
                type="text" 
                id="keywords" 
                name="keywords" 
                defaultValue={keywordsString}
                disabled={!isAdmin}
                placeholder="e.g. auth, payment, billing, crypto"
                className="form-input"
                style={{ 
                  backgroundColor: isAdmin ? 'var(--color-background)' : 'var(--color-surface-hover)',
                }}
              />
            </div>
            
            {isAdmin ? (
              <button 
                type="submit" 
                className="btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                Save Policy
              </button>
            ) : (
              <p className="text-small" style={{ color: 'var(--color-medium)' }}>
                Only organization admins can update this policy.
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
