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
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm min-h-[44px]"
          data-testid="user-search-input"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#e94560] text-white font-medium rounded-md hover:bg-[#c73652] transition-colors text-sm min-h-[44px]"
          data-testid="user-search-btn"
        >
          Search
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-white/40 text-sm">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-white/40 text-sm">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="user-table">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Registered</th>
                <th className="pb-2 pr-4">Campaigns</th>
                <th className="pb-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 text-white/80" data-testid={`user-row-${u.id}`}>
                  <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                  <td className="py-2 pr-4 text-xs text-white/50">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 font-mono">{u.campaign_count}</td>
                  <td className="py-2">
                    {u.is_admin ? (
                      <span className="text-xs text-[#e94560] font-medium">Admin</span>
                    ) : (
                      <span className="text-xs text-white/40">DM</span>
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
