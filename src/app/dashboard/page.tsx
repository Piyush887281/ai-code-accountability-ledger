import { auth, MembershipRepository } from "@/modules/auth";
import { redirect } from "next/navigation";
import styles from "../page.module.css";

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

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Active Organization: <strong>{activeOrg.name}</strong>
        </p>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <p>Phase 2 Implementation: Repository Integration coming next.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
