"use client";

import { useState, useEffect, useRef } from "react";
import {
  fetchAccessibleRepositoriesAction,
  connectRepositoryAction,
  getConnectedRepositoriesAction,
} from "@/modules/ingestion/actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function RepositoryList() {
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  // Pagination & Dropdown State
  const [currentPage, setCurrentPage] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const itemsPerPage = 5;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetchAccessibleRepositoriesAction(),
      getConnectedRepositoriesAction(),
    ])
      .then(([available, connected]) => {
        const connectedExternalIds = new Set(
          connected.map((r: any) => r.externalId),
        );
        setAvailableRepos(
          available.filter((r: any) => !connectedExternalIds.has(r.externalId)),
        );
        setConnectedRepos(connected);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnect = async () => {
    const repoToConnect = availableRepos.find(
      (r) => r.externalId === selectedRepoId,
    );
    if (!repoToConnect) return;

    setConnecting(repoToConnect.externalId);
    try {
      const newRepo = await connectRepositoryAction(repoToConnect);
      alert(`Successfully connected ${repoToConnect.name}`);

      setAvailableRepos((prev) =>
        prev.filter((r) => r.externalId !== repoToConnect.externalId),
      );
      setConnectedRepos((prev) => [
        { ...newRepo, _count: { findings: 0 } },
        ...prev,
      ]);
      setSelectedRepoId(null);
      setIsDropdownOpen(false);
    } catch (err: any) {
      alert(`Failed to connect: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  // Pagination logic for connected repos
  const totalPages = Math.ceil(connectedRepos.length / itemsPerPage);
  const paginatedRepos = connectedRepos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const selectedRepo = availableRepos.find(
    (r) => r.externalId === selectedRepoId,
  );

  if (loading)
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--color-muted-foreground)",
        }}
      >
        Loading repositories...
      </div>
    );
  if (error)
    return (
      <div
        style={{
          color: "var(--color-critical)",
          padding: "1rem",
          border: "1px solid var(--color-critical)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-critical-bg)",
        }}
      >
        Error loading repositories: {error}
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
      }}
    >
      {/* AVAILABLE REPOSITORIES */}
      <section>
        <h2
          className="text-h2"
          style={{
            marginBottom: "var(--space-4)",
            paddingBottom: "var(--space-2)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          Available to Connect
        </h2>

        {availableRepos.length === 0 ? (
          <p className="text-muted" style={{ padding: "var(--space-4) 0" }}>
            No additional accessible repositories found on GitHub.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{ position: "relative", flex: 1, maxWidth: "400px" }}
              ref={dropdownRef}
            >
              <button
                className="form-input"
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "var(--color-surface)",
                  cursor: "pointer",
                  minHeight: "42px",
                }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span
                  style={{
                    color: selectedRepo
                      ? "var(--color-foreground)"
                      : "var(--color-muted-foreground)",
                  }}
                >
                  {selectedRepo
                    ? selectedRepo.name
                    : "Select a repository to connect..."}
                </span>
                <span
                  style={{
                    transform: isDropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform var(--transition-fast)",
                  }}
                >
                  ▼
                </span>
              </button>

              {isDropdownOpen && (
                <div
                  className="panel"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    marginTop: "var(--space-2)",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 50,
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  {availableRepos.map((repo) => (
                    <div
                      key={repo.externalId}
                      onClick={() => {
                        setSelectedRepoId(repo.externalId);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderBottom: "1px solid var(--color-border)",
                        cursor: "pointer",
                        backgroundColor:
                          selectedRepoId === repo.externalId
                            ? "var(--color-surface-active)"
                            : "transparent",
                        transition: "background-color var(--transition-fast)",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--color-surface-hover)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          selectedRepoId === repo.externalId
                            ? "var(--color-surface-active)"
                            : "transparent")
                      }
                    >
                      <div className="text-body" style={{ fontWeight: 500 }}>
                        {repo.name}
                      </div>
                      <div
                        className="text-small"
                        style={{ marginTop: "var(--space-1)" }}
                      >
                        {repo.isPrivate ? "Private" : "Public"} •{" "}
                        {repo.defaultBranch}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleConnect}
              disabled={!selectedRepoId || connecting !== null}
              className="btn-primary"
              style={{ minHeight: "42px" }}
            >
              {connecting ? "Connecting..." : "Connect Repository"}
            </button>
          </div>
        )}
      </section>

      {/* CONNECTED REPOSITORIES */}
      <section>
        <h2
          className="text-h2"
          style={{
            marginBottom: "var(--space-4)",
            paddingBottom: "var(--space-2)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          Connected Repositories
        </h2>

        {connectedRepos.length === 0 ? (
          <p className="text-muted" style={{ padding: "var(--space-4) 0" }}>
            No repositories are currently connected to this organization.
          </p>
        ) : (
          <>
            <div
              className="panel"
              style={{ overflow: "hidden", marginBottom: "var(--space-4)" }}
            >
              {paginatedRepos.map((repo, index) => (
                <div
                  key={repo.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "var(--space-4) var(--space-5)",
                    borderBottom:
                      index < paginatedRepos.length - 1
                        ? "1px solid var(--color-border)"
                        : "none",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: "0 0 var(--space-1) 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                      }}
                    >
                      <Link
                        href={`/dashboard/repos/${repo.id}`}
                        className="text-h3"
                      >
                        {repo.name}
                      </Link>
                      {repo.isPrivate && <Badge variant="info">Private</Badge>}
                    </h3>
                    <p className="text-small" style={{ margin: 0 }}>
                      Last sync:{" "}
                      <span suppressHydrationWarning>
                        {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-6)",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <p className="text-h3" style={{ margin: 0 }}>
                        {repo._count?.findings || 0}
                      </p>
                      <p className="text-small" style={{ margin: 0 }}>
                        Open Findings
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/repos/${repo.id}`}
                      className="btn-secondary"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--color-border)",
                  paddingTop: "var(--space-4)",
                }}
              >
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  &larr; Previous
                </button>
                <span className="text-small">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
