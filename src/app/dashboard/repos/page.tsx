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
    <div>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="text-h1" style={{ marginBottom: 'var(--space-1)' }}>Repositories</h1>
        <p className="text-muted">
          Select a GitHub repository to connect to your organization. The system will ingest historical commits and pull requests.
        </p>
      </div>

      <RepositoryList />
    </div>
  );
}
