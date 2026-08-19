import { auth } from "@/modules/auth";
import { createOrganizationAction } from "@/modules/auth";
import { redirect } from "next/navigation";
import styles from "../page.module.css"; // Reuse some basic styles for now

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Welcome, {session.user.name || session.user.email}!</h1>
        <p className={styles.subtitle}>
          To get started with AI-Code Accountability Ledger, please create an organization.
          This will act as the workspace for connecting your repositories.
        </p>

        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <form action={createOrganizationAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="name" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Organization Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="e.g. Acme Corp"
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-50)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <button type="submit" className={styles.button} style={{ width: '100%', marginTop: '1rem' }}>
                Create Organization
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
