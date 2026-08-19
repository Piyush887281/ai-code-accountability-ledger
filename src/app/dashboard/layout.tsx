import { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/modules/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="layout-container">
      {/* Sidebar Navigation */}
      <aside className="layout-sidebar">
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--color-foreground)" }}>
            AI-Code Ledger
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: "0.25rem" }}>
            {session.user.name || session.user.email}
          </div>
        </div>

        <nav style={{ flex: 1, padding: "1rem 0" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <Link href="/dashboard" style={{ display: "block", padding: "0.5rem 1.5rem", color: "var(--color-foreground)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Overview
              </Link>
            </li>
            <li>
              <Link href="/dashboard/repos" style={{ display: "block", padding: "0.5rem 1.5rem", color: "var(--color-muted-foreground)", textDecoration: "none", fontSize: "0.875rem" }}>
                Repositories
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings" style={{ display: "block", padding: "0.5rem 1.5rem", color: "var(--color-muted-foreground)", textDecoration: "none", fontSize: "0.875rem" }}>
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logout Section */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--color-border)" }}>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-sidebar-logout" style={{ 
              background: "none", 
              border: "none", 
              color: "var(--color-muted-foreground)", 
              cursor: "pointer", 
              fontSize: "0.875rem", 
              padding: "0.5rem 0", 
              width: "100%", 
              textAlign: "left",
              transition: "color var(--transition-fast)" 
            }}>
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="layout-main">
        <div className="layout-content">
          {children}
        </div>
      </main>
    </div>
  );
}
