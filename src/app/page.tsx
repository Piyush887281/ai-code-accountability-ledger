import styles from "./page.module.css";
import { auth, signIn, signOut, MembershipRepository } from "@/modules/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Redirect logic for logged-in users
  if (session?.user?.id) {
    const memberships = await MembershipRepository.findByUserId(session.user.id);
    if (memberships.length === 0) {
      redirect("/onboarding");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Left Panel: Brand & Value Proposition ── */}
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <div className={styles.logoMark} aria-hidden="true">
            AL
          </div>

          <h1 className={styles.brandTitle}>
            AI-Code Accountability Ledger
          </h1>

          <p className={styles.brandDescription}>
            Continuous visibility into which code was AI-generated, how deeply it
            was reviewed, and where unowned business-critical risk is
            concentrated.
          </p>

          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon} aria-hidden="true">✓</span>
              <span className={styles.featureText}>
                <strong>AI-Detection</strong> — Automatically identify AI-generated code across every pull request
              </span>
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon} aria-hidden="true">✓</span>
              <span className={styles.featureText}>
                <strong>Review Depth</strong> — Measure how thoroughly each change was actually reviewed
              </span>
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon} aria-hidden="true">✓</span>
              <span className={styles.featureText}>
                <strong>Risk Mapping</strong> — Surface unowned critical code before it becomes a liability
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Right Panel: Authentication ── */}
      <div className={styles.authPanel}>
        <div className={styles.authWrapper}>
          {session?.user ? (
            /* Logged-in state (edge case — redirect should handle this) */
            <div className={styles.loggedInCard}>
              <p className={styles.loggedInLabel}>Signed in as</p>
              <p className={styles.loggedInName}>
                {session.user.name ?? session.user.email}
              </p>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button type="submit" className={styles.signOutButton}>
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            /* Sign-in state */
            <>
              <div className={styles.authCard}>
                <h2 className={styles.authHeading}>Sign in</h2>
                <p className={styles.authSubtext}>
                  Authenticate with your GitHub account to connect repositories
                  and start tracking AI-generated code.
                </p>

                <div className={styles.authDivider} />

                <form
                  action={async () => {
                    "use server";
                    await signIn("github");
                  }}
                >
                  <button type="submit" className={styles.githubButton}>
                    <span className={styles.githubIcon}>
                      {/* GitHub Octicon Mark — inline SVG for zero-dependency rendering */}
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </span>
                    Continue with GitHub
                  </button>
                </form>

                <p className={styles.permissionsHint}>
                  <span className={styles.lockIcon} aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  Read-only access to your repositories
                </p>
              </div>

              <p className={styles.footer}>
                By continuing, you agree to grant read access to your GitHub repositories for analysis purposes only.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
