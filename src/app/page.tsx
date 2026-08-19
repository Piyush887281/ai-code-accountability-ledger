import styles from "./page.module.css";
import { auth, signIn, signOut } from "@/modules/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>AI-Code Accountability Ledger</h1>
        <p className={styles.subtitle}>
          Continuous visibility into which code was AI-generated, how deeply it
          was reviewed, and where unowned business-critical code risk is
          concentrated.
        </p>

        <div className={styles.authContainer}>
          {session?.user ? (
            <div className={styles.authCard}>
              <p>Logged in as: {session.user.name ?? session.user.email}</p>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button type="submit" className={styles.button}>Sign Out</button>
              </form>
            </div>
          ) : (
            <div className={styles.authCard}>
              <p>System initializing — authentication setup active.</p>
              <form
                action={async () => {
                  "use server";
                  await signIn("github");
                }}
              >
                <button type="submit" className={styles.button}>Sign in with GitHub</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
