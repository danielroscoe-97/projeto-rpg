"use client";

import { useEffect, useState, useCallback } from "react";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  campaign_count: number;
}

export function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/admin/users${params}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setUsers(json.data ?? []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers("");
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  return (
    <div data-testid="user-manager">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="flex-1 px-3 py-2 bg-white/[0.06] border border-border rounded-md text-foreground text-sm min-h-[44px]"
          data-testid="user-search-input"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
          data-testid="user-search-btn"
        >
          Search
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-sm">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="user-table">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Registered</th>
                <th className="pb-2 pr-4">Campaigns</th>
                <th className="pb-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] text-foreground/80" data-testid={`user-row-${u.id}`}>
                  <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 font-mono">{u.campaign_count}</td>
                  <td className="py-2">
                    {u.is_admin ? (
                      <span className="text-xs text-gold font-medium">Admin</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">DM</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
