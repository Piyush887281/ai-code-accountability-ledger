import styles from "../../page.module.css";
import RepositoryList from "./RepositoryList";
import { auth } from "@/modules/auth";
import { redirect } from "next/navigation";

export default async function RepositoriesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.title} style={{ fontSize: '2rem' }}>Connect Repository</h1>
          <a href="/dashboard" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
            &larr; Back to Dashboard
          </a>
        </div>
        <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
          Select a GitHub repository to connect to your organization. The system will ingest historical commits and pull requests.
        </p>

        <RepositoryList />
      </div>
    </main>
  );
}
