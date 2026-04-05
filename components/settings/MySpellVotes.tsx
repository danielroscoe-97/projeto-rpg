"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type SpellTier = "S" | "A" | "B" | "C" | "D" | "E";
const TIERS: SpellTier[] = ["S", "A", "B", "C", "D", "E"];

interface UserVote {
  spell_name: string;
  vote: SpellTier;
  voted_at: string;
}

const TIER_COLORS: Record<SpellTier, { bg: string; text: string; border: string; selected: string }> = {
  S: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40", selected: "border-amber-400/60 bg-amber-500/30 text-amber-200" },
  A: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/40", selected: "border-purple-400/60 bg-purple-500/30 text-purple-200" },
  B: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/40", selected: "border-blue-400/60 bg-blue-500/30 text-blue-200" },
  C: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/40", selected: "border-green-400/60 bg-green-500/30 text-green-200" },
  D: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/40", selected: "border-gray-400/60 bg-gray-500/30 text-gray-200" },
  E: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/40", selected: "border-red-400/60 bg-red-500/30 text-red-200" },
};

function toDisplayName(spellName: string): string {
  return spellName
    .split(/[-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toSpellSlug(spellName: string): string {
  return spellName.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function MySpellVotes() {
  const t = useTranslations("settings");
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [editingSpell, setEditingSpell] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tierLabels: Record<SpellTier, string> = useMemo(() => ({
    S: t("votes_tier_s"),
    A: t("votes_tier_a"),
    B: t("votes_tier_b"),
    C: t("votes_tier_c"),
    D: t("votes_tier_d"),
    E: t("votes_tier_e"),
  }), [t]);

  const fetchAllVotes = useCallback(async () => {
    const r = await fetch("/api/methodology/spell-vote?my=true&limit=200&offset=0");
    if (!r.ok) throw new Error("fetch failed");
    const data = await r.json();
    return (data.votes ?? []) as UserVote[];
  }, []);

  useEffect(() => {
    fetchAllVotes()
      .then((v) => setVotes(v))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fetchAllVotes]);

  async function changeVote(spellName: string, newTier: SpellTier) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/methodology/spell-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spell_name: spellName, vote: newTier }),
      });
      if (!res.ok) throw new Error("vote failed");

      // Sync localStorage
      try {
        const raw = JSON.parse(localStorage.getItem("spell_votes_cast") ?? "{}");
        raw[spellName] = newTier;
        localStorage.setItem("spell_votes_cast", JSON.stringify(raw));
      } catch {}

      // Refetch all votes from server to stay in sync
      const fresh = await fetchAllVotes();
      setVotes(fresh);

      setEditingSpell(null);
      toast.success(t("votes_updated"));
    } catch {
      toast.error(t("votes_update_error"));
    } finally {
      setSubmitting(false);
    }
  }

  // Filter by search — safe because we fetched all votes
  const filtered = useMemo(() => {
    if (!search.trim()) return votes;
    const q = search.toLowerCase().trim();
    return votes.filter((v) => toDisplayName(v.spell_name).toLowerCase().includes(q));
  }, [votes, search]);

  // Group votes by tier for summary
  const tierCounts = votes.reduce<Record<SpellTier, number>>(
    (acc, v) => {
      acc[v.vote] = (acc[v.vote] || 0) + 1;
      return acc;
    },
    { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0 }
  );

  return (
    <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
      <div>
        <h2 className="text-foreground font-semibold mb-1">{t("votes_title")}</h2>
        <p className="text-muted-foreground text-sm">{t("votes_description")}</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.03] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-red-400 text-sm">{t("votes_error")}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && votes.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gold/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-gold/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="text-foreground/50 text-sm mb-3">{t("votes_empty")}</p>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 rounded-md px-4 py-2 transition-all duration-200"
          >
            {t("votes_go_vote")}
          </Link>
        </div>
      )}

      {/* Votes summary + list */}
      {!loading && !error && votes.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <span className="text-foreground/50 text-xs shrink-0">
              {votes.length} {t("votes_total")}
            </span>
            <div className="flex gap-2 flex-wrap flex-1 justify-end">
              {TIERS.map((tier) => {
                if (tierCounts[tier] === 0) return null;
                const colors = TIER_COLORS[tier];
                return (
                  <span key={tier} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${colors.bg} ${colors.text} ${colors.border} tabular-nums`}>
                    {tier}: {tierCounts[tier]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("votes_search_placeholder")}
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-white/[0.08] bg-white/[0.02] text-foreground placeholder:text-foreground/25 focus:border-gold/30 focus:outline-none transition-colors duration-200"
            />
          </div>

          {/* Vote list */}
          <div className="space-y-1.5">
            {filtered.map((vote) => {
              const colors = TIER_COLORS[vote.vote];
              const slug = toSpellSlug(vote.spell_name);
              const displayName = toDisplayName(vote.spell_name);
              const date = new Date(vote.voted_at);
              const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              const isEditing = editingSpell === vote.spell_name;

              return (
                <div
                  key={vote.spell_name}
                  className={`rounded-lg border px-4 py-3 transition-colors duration-150 ${
                    isEditing
                      ? "border-gold/20 bg-white/[0.03]"
                      : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Tier badge */}
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold border shrink-0 ${colors.bg} ${colors.text} ${colors.border}`}>
                      {vote.vote}
                    </span>

                    {/* Spell name + tier label */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/spells/${slug}`}
                        className="text-foreground/80 hover:text-gold transition-colors duration-150 font-medium text-sm truncate block"
                      >
                        {displayName}
                      </Link>
                      <p className={`text-[10px] mt-0.5 ${colors.text} opacity-60`}>
                        {tierLabels[vote.vote]}
                      </p>
                    </div>

                    {/* Date + edit button */}
                    <span className="text-foreground/25 text-[10px] tabular-nums shrink-0 mr-1">
                      {dateStr}
                    </span>
                    <button
                      onClick={() => setEditingSpell(isEditing ? null : vote.spell_name)}
                      className="text-foreground/25 hover:text-foreground/60 transition-colors duration-150 shrink-0 p-1"
                      title={t("votes_edit_vote")}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                  </div>

                  {/* Inline tier edit */}
                  {isEditing && (
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/[0.06] justify-center">
                      {TIERS.map((tier) => {
                        const tc = TIER_COLORS[tier];
                        const isCurrent = vote.vote === tier;
                        return (
                          <button
                            key={tier}
                            onClick={() => {
                              if (!isCurrent) changeVote(vote.spell_name, tier);
                            }}
                            disabled={submitting || isCurrent}
                            className={`w-9 h-9 rounded-md text-xs font-bold border transition-all duration-200 disabled:opacity-40
                              ${isCurrent
                                ? tc.selected
                                : `${tc.bg} ${tc.text} ${tc.border} opacity-60 hover:opacity-100`
                              }`}
                          >
                            {tier}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* No search results */}
          {search.trim() && filtered.length === 0 && (
            <p className="text-center text-foreground/30 text-xs py-4">
              {t("votes_no_results")}
            </p>
          )}

          {/* CTA to vote more */}
          <div className="text-center pt-2">
            <Link
              href="/methodology"
              className="text-xs text-gold/50 hover:text-gold/80 transition-colors duration-150"
            >
              {t("votes_vote_more")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
