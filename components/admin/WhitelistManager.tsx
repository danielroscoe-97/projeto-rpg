"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface WhitelistEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name: string | null;
  granted_by_email: string;
  granted_at: string;
  revoked_at: string | null;
  notes: string | null;
}

interface AgreementEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name: string | null;
  user_created_at: string | null;
  user_role: string | null;
  agreed_at: string;
  agreement_version: number;
  ip_address: string | null;
}

interface UserResult {
  id: string;
  email: string;
  display_name: string | null;
}

export function WhitelistManager() {
  const t = useTranslations("admin");
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [agreements, setAgreements] = useState<AgreementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / autocomplete
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<WhitelistEntry | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist");
      const json = await res.json();
      if (json.error) setError(json.error);
      else {
        setEntries(json.data ?? []);
        setAgreements(json.agreements ?? []);
      }
    } catch {
      setError("Failed to load whitelist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(query)}`
      );
      const json = await res.json();
      setSearchResults(json.data ?? []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(value), 300);
  };

  const handleAddUser = async (user: UserResult) => {
    setShowDropdown(false);
    setSearch("");
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(
          json.error === "User is already whitelisted"
            ? t("whitelist_already_exists")
            : json.error
        );
        return;
      }
      toast.success(
        t("whitelist_added", { name: user.display_name || user.email })
      );
      fetchEntries();
    } catch {
      toast.error("Failed to add user");
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: revokeTarget.id }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      toast.success(
        t("whitelist_revoked", {
          name: revokeTarget.user_display_name || revokeTarget.user_email,
        })
      );
      setRevokeTarget(null);
      fetchEntries();
    } catch {
      toast.error("Failed to revoke");
    } finally {
      setRevoking(false);
    }
  };

  const active = entries.filter((e) => !e.revoked_at);
  const revoked = entries.filter((e) => !!e.revoked_at);

  return (
    <div data-testid="whitelist-manager">
      {/* Search / Add */}
      <div className="relative mb-6" ref={dropdownRef}>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("whitelist_search_placeholder")}
          className="w-full px-3 py-2 bg-white/[0.06] border border-border rounded-md text-foreground text-sm min-h-[44px]"
          data-testid="whitelist-search-input"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            ...
          </div>
        )}

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-surface-primary border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((user) => {
              const isWhitelisted = active.some(
                (e) => e.user_id === user.id
              );
              return (
                <button
                  key={user.id}
                  type="button"
                  disabled={isWhitelisted}
                  onClick={() => handleAddUser(user)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-white/[0.04] last:border-0 transition-colors ${
                    isWhitelisted
                      ? "text-muted-foreground cursor-not-allowed opacity-50"
                      : "text-foreground hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="font-mono text-xs">{user.email}</span>
                  {user.display_name && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      ({user.display_name})
                    </span>
                  )}
                  {isWhitelisted && (
                    <span className="ml-2 text-xs text-gold">
                      {t("whitelist_already_badge")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {showDropdown && search.length >= 2 && searchResults.length === 0 && !searching && (
          <div className="absolute z-10 mt-1 w-full bg-surface-primary border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
            {t("whitelist_no_users_found")}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!loading && active.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {t("whitelist_active_count", { count: active.length })}
        </p>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("whitelist_loading")}</p>
      ) : active.length === 0 && revoked.length === 0 ? (
        <div className="py-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
          </svg>
          <p className="text-muted-foreground text-sm">
            {t("whitelist_empty")}
          </p>
        </div>
      ) : (
        <>
          {/* Active testers */}
          {active.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="whitelist-active-table">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">{t("whitelist_col_name")}</th>
                    <th className="pb-2 pr-4">{t("whitelist_col_added")}</th>
                    <th className="pb-2 pr-4">{t("whitelist_col_by")}</th>
                    <th className="pb-2">{t("whitelist_col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-white/[0.04] text-foreground/80"
                      data-testid={`whitelist-row-${e.user_id}`}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">
                        {e.user_email}
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {e.user_display_name || "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(e.granted_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {e.granted_by_email}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(e)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          data-testid={`whitelist-revoke-${e.user_id}`}
                        >
                          {t("whitelist_revoke")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Users with agreement (accepted terms) */}
          {agreements.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-foreground mb-3">
                {t("agreements_title", { count: agreements.length })}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="agreements-table">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">{t("whitelist_col_name")}</th>
                      <th className="pb-2 pr-4">{t("agreements_col_role")}</th>
                      <th className="pb-2 pr-4">{t("agreements_col_accepted")}</th>
                      <th className="pb-2 pr-4">{t("agreements_col_registered")}</th>
                      <th className="pb-2">v</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-white/[0.04] text-foreground/80"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">
                          {a.user_email}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {a.user_display_name || "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground capitalize">
                          {a.user_role || "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {new Date(a.agreed_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {a.user_created_at
                            ? new Date(a.user_created_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground font-mono">
                          {a.agreement_version}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Revoked testers */}
          {revoked.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                {t("whitelist_revoked_section", { count: revoked.length })}
              </summary>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm opacity-60">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">{t("whitelist_col_name")}</th>
                      <th className="pb-2 pr-4">{t("whitelist_col_revoked_at")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revoked.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-white/[0.04] text-muted-foreground"
                      >
                        <td className="py-2 pr-4 font-mono text-xs line-through">
                          {e.user_email}
                        </td>
                        <td className="py-2 pr-4 text-xs line-through">
                          {e.user_display_name || "—"}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {e.revoked_at
                            ? new Date(e.revoked_at).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("whitelist_revoke_title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("whitelist_revoke_confirm", {
              name:
                revokeTarget?.user_display_name || revokeTarget?.user_email || "",
            })}
          </p>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              type="button"
              onClick={() => setRevokeTarget(null)}
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("whitelist_cancel")}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              className="px-3 py-1.5 text-sm rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {revoking ? "..." : t("whitelist_revoke_btn")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
