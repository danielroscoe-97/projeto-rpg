"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

type SpellTier = "S" | "A" | "B" | "C" | "D" | "E";

interface SpellVoteStats {
  spell_name: string;
  tier_s: number;
  tier_a: number;
  tier_b: number;
  tier_c: number;
  tier_d: number;
  tier_e: number;
  total_votes: number;
}

interface SpellTierVotingMiniProps {
  spellName: string;
  isLoggedIn: boolean;
  translations: {
    title: string;
    confirm: string;
    edit: string;
    save: string;
    cancel: string;
    vote_thanks: string;
    vote_error: string;
    login_to_vote: string;
    votes_label: string;
    voted_label: string;
  };
}

const TIERS: SpellTier[] = ["S", "A", "B", "C", "D", "E"];

const TIER_COLORS: Record<SpellTier, { bg: string; text: string; selected: string }> = {
  S: { bg: "bg-amber-500/10", text: "text-amber-400", selected: "border-amber-400/60 bg-amber-500/20 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]" },
  A: { bg: "bg-emerald-500/10", text: "text-emerald-400", selected: "border-emerald-400/60 bg-emerald-500/20 text-emerald-300" },
  B: { bg: "bg-blue-500/10", text: "text-blue-400", selected: "border-blue-400/60 bg-blue-500/20 text-blue-300" },
  C: { bg: "bg-purple-500/10", text: "text-purple-400", selected: "border-purple-400/60 bg-purple-500/20 text-purple-300" },
  D: { bg: "bg-orange-500/10", text: "text-orange-400", selected: "border-orange-400/60 bg-orange-500/20 text-orange-300" },
  E: { bg: "bg-red-500/10", text: "text-red-400", selected: "border-red-400/60 bg-red-500/20 text-red-300" },
};

const STORAGE_KEY = "spell_votes_cast";

function getVotesCast(): Record<string, SpellTier> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveVoteCast(spellName: string, vote: SpellTier) {
  try {
    const existing = getVotesCast();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, [spellName]: vote }));
  } catch {}
}

export function SpellTierVotingMini({ spellName, isLoggedIn, translations: t }: SpellTierVotingMiniProps) {
  const [stats, setStats] = useState<SpellVoteStats | null>(null);
  const [confirmedVote, setConfirmedVote] = useState<SpellTier | null>(null);
  const [pendingVote, setPendingVote] = useState<SpellTier | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const normalizedName = spellName.toLowerCase();

  // Load saved vote + fetch stats
  useEffect(() => {
    const cast = getVotesCast();
    const existing = cast[normalizedName];
    if (existing && TIERS.includes(existing)) {
      setConfirmedVote(existing);
    }

    fetch(`/api/methodology/spell-vote?spell=${encodeURIComponent(normalizedName)}`)
      .then((r) => r.json())
      .then((data: SpellVoteStats[]) => {
        if (!Array.isArray(data)) return;
        const match = data.find((s) => s.spell_name === normalizedName);
        if (match) setStats(match);
      })
      .catch(() => {});
  }, [normalizedName]);

  async function submitVote(vote: SpellTier) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/methodology/spell-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spell_name: normalizedName, vote }),
      });
      if (!res.ok) throw new Error("vote failed");

      // Optimistic update
      setStats((prev) => {
        const base: SpellVoteStats = prev ?? {
          spell_name: normalizedName,
          tier_s: 0, tier_a: 0, tier_b: 0, tier_c: 0, tier_d: 0, tier_e: 0,
          total_votes: 0,
        };
        const updated = { ...base };
        // Decrement old vote if editing
        if (confirmedVote) {
          const oldKey = `tier_${confirmedVote.toLowerCase()}` as keyof SpellVoteStats;
          (updated[oldKey] as number) = Math.max(0, (updated[oldKey] as number) - 1);
        }
        const newKey = `tier_${vote.toLowerCase()}` as keyof SpellVoteStats;
        (updated[newKey] as number) = (updated[newKey] as number) + 1;
        updated.total_votes = updated.tier_s + updated.tier_a + updated.tier_b + updated.tier_c + updated.tier_d + updated.tier_e;
        return updated;
      });

      setConfirmedVote(vote);
      setPendingVote(null);
      setIsEditing(false);
      saveVoteCast(normalizedName, vote);
      toast.success(t.vote_thanks);
    } catch {
      toast.error(t.vote_error);
    } finally {
      setSubmitting(false);
    }
  }

  // Distribution bar data
  const total = stats?.total_votes ?? 0;
  const tierCounts = TIERS.map((tier) => ({
    tier,
    count: (stats?.[`tier_${tier.toLowerCase()}` as keyof SpellVoteStats] as number) ?? 0,
  }));

  const hasVoted = confirmedVote !== null;
  const showButtons = !hasVoted || isEditing;

  return (
    <div className="rounded-lg border border-gold/15 bg-white/[0.02] p-4 mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground/50 font-medium">{t.title}</p>
        {total > 0 && (
          <span className="text-[10px] text-foreground/30 tabular-nums">
            {total} {t.votes_label}
          </span>
        )}
      </div>

      {/* Distribution bar */}
      {total > 0 && (
        <div className="h-2 rounded-full overflow-hidden flex w-full gap-px">
          {tierCounts.map(({ tier, count }) => {
            if (count === 0) return null;
            const pct = (count / total) * 100;
            return (
              <div
                key={tier}
                className={`h-full transition-all duration-500 rounded-sm ${TIER_COLORS[tier].bg.replace("/10", "/40")}`}
                style={{ width: `${pct}%` }}
                title={`${tier}: ${count} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
      )}

      {/* Tier legend with counts */}
      {total > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tierCounts.map(({ tier, count }) => {
            if (count === 0) return null;
            return (
              <span key={tier} className={`text-[10px] ${TIER_COLORS[tier].text} tabular-nums`}>
                {tier}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Confirmed state — locked */}
      {hasVoted && !isEditing && isLoggedIn && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TIER_COLORS[confirmedVote].selected}`}>
              {confirmedVote}
            </span>
            <span className="text-xs text-foreground/40">{t.voted_label}</span>
          </div>
          <button
            onClick={() => { setIsEditing(true); setPendingVote(confirmedVote); }}
            className="text-[10px] text-foreground/30 hover:text-foreground/60 transition-colors underline underline-offset-2"
          >
            {t.edit}
          </button>
        </div>
      )}

      {/* Voting buttons */}
      {isLoggedIn && showButtons && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {TIERS.map((tier) => {
              const isSelected = pendingVote === tier;
              const colors = TIER_COLORS[tier];
              return (
                <button
                  key={tier}
                  onClick={() => setPendingVote(tier)}
                  disabled={submitting}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold border transition-all duration-200 disabled:opacity-40
                    ${isSelected
                      ? colors.selected
                      : `border-white/8 ${colors.bg} ${colors.text} opacity-60 hover:opacity-100`
                    }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>

          {/* Confirm / Save / Cancel buttons */}
          {pendingVote && (
            <div className="flex gap-2">
              <button
                onClick={() => submitVote(pendingVote)}
                disabled={submitting}
                className="flex-1 py-1.5 rounded-md text-xs font-medium bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-all disabled:opacity-40"
              >
                {isEditing ? t.save : t.confirm}
              </button>
              {isEditing && (
                <button
                  onClick={() => { setIsEditing(false); setPendingVote(null); }}
                  className="px-3 py-1.5 rounded-md text-xs text-foreground/40 border border-white/8 hover:text-foreground/60 transition-colors"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Login prompt — hide if user already has a cached vote */}
      {!isLoggedIn && !hasVoted && (
        <Link
          href="/auth/sign-up"
          className="inline-flex items-center text-xs text-gold/70 hover:text-gold transition-colors"
        >
          {t.login_to_vote}
        </Link>
      )}
    </div>
  );
}
