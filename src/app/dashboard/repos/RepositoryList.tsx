"use client";

import { useState, useEffect } from "react";
import { fetchAccessibleRepositoriesAction, connectRepositoryAction } from "@/modules/ingestion/actions";

export default function RepositoryList() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccessibleRepositoriesAction()
      .then((data) => {
        setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleConnect = async (repo: any) => {
    setConnecting(repo.externalId);
    try {
      await connectRepositoryAction(repo);
      alert(`Successfully connected ${repo.name}`);
      // In a real app, redirect to the repo view page or update local state
    } catch (err: any) {
      alert(`Failed to connect: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  if (loading) return <div>Loading repositories from GitHub...</div>;
  if (error) return (
    <div style={{ color: 'red', padding: '1rem', border: '1px solid red', borderRadius: '4px' }}>
      Error: {error}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {repos.length === 0 ? (
        <p>No accessible repositories found.</p>
      ) : (
        repos.map((repo) => (
          <div 
            key={repo.externalId} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>{repo.name}</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {repo.isPrivate ? "Private" : "Public"} • {repo.defaultBranch}
              </p>
            </div>
            <button 
              onClick={() => handleConnect(repo)}
              disabled={connecting === repo.externalId}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--foreground)',
                color: 'var(--background)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: connecting === repo.externalId ? 'not-allowed' : 'pointer'
              }}
            >
              {connecting === repo.externalId ? "Connecting..." : "Connect"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
