import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>AI-Code Accountability Ledger</h1>
        <p className={styles.subtitle}>
          Continuous visibility into which code was AI-generated, how deeply it
          was reviewed, and where unowned business-critical code risk is
          concentrated.
        </p>
        <div className={styles.status}>
          <span className={styles.statusDot} />
          <span>System initializing — authentication setup pending</span>
        </div>
      </div>
    </main>
  );
}
