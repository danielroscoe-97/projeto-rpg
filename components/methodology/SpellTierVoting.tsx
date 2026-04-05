"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

const FEATURED_SPELLS = [
  "Fireball",
  "Healing Word",
  "Counterspell",
  "Shield",
  "Conjure Animals",
  "Spirit Guardians",
  "Hypnotic Pattern",
  "Magic Missile",
] as const;

type SpellTier = "S" | "A" | "B" | "C" | "D" | "E";
const TIERS: SpellTier[] = ["S", "A", "B", "C", "D", "E"];

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

interface SpellTierVotingProps {
  translations: {
    title: string;
    subtitle: string;
    confirm: string;
    edit: string;
    save: string;
    cancel: string;
    vote_thanks: string;
    vote_error: string;
    login_to_vote: string;
    votes_label: string;
    voted_label: string;
    vote_bar_label: string;
    all_voted: string;
    see_ranking: string;
  };
  isLoggedIn: boolean;
}

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

export function SpellTierVoting({ translations: t, isLoggedIn }: SpellTierVotingProps) {
  const [allStats, setAllStats] = useState<SpellVoteStats[]>([]);
  const [votedSpells, setVotedSpells] = useState<Record<string, SpellTier>>({});
  const [currentSpell, setCurrentSpell] = useState<string>(FEATURED_SPELLS[0]);
  const [pendingVote, setPendingVote] = useState<SpellTier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Hydrate from localStorage — validate values are valid tiers
  useEffect(() => {
    const raw = getVotesCast();
    const validated: Record<string, SpellTier> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (TIERS.includes(val as SpellTier)) validated[key] = val as SpellTier;
    }
    setVotedSpells(validated);
    // Pick first unvoted spell
    const unvoted = FEATURED_SPELLS.filter((s) => !validated[s.toLowerCase()]);
    if (unvoted.length > 0) {
      setCurrentSpell(unvoted[Math.floor(Math.random() * unvoted.length)]);
    }
  }, []);

  // Fetch stats
  useEffect(() => {
    fetch("/api/methodology/spell-vote")
      .then((r) => r.json())
      .then((data: SpellVoteStats[]) => {
        if (Array.isArray(data)) setAllStats(data);
      })
      .catch(() => {});
  }, []);

  const normalizedCurrent = currentSpell.toLowerCase();
  const currentStats = allStats.find((s) => s.spell_name === normalizedCurrent);
  const hasVotedThisSpell = votedSpells[normalizedCurrent] !== undefined;
  const allVoted = FEATURED_SPELLS.every((s) => votedSpells[s.toLowerCase()] !== undefined);

  const advanceToNextSpell = useCallback(
    (justVoted: string, updatedVoted: Record<string, SpellTier>) => {
      const unvoted = FEATURED_SPELLS.filter(
        (s) => !updatedVoted[s.toLowerCase()] && s.toLowerCase() !== justVoted
      );
      const pool = unvoted.length > 0
        ? unvoted
        : FEATURED_SPELLS.filter((s) => s.toLowerCase() !== justVoted);
      setCurrentSpell(pool[Math.floor(Math.random() * pool.length)] ?? FEATURED_SPELLS[0]);
      setPendingVote(null);
    },
    []
  );

  async function handleConfirm() {
    if (!pendingVote || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/methodology/spell-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spell_name: normalizedCurrent, vote: pendingVote }),
      });
      if (!res.ok) throw new Error("vote failed");

      // Optimistic update
      setAllStats((prev) => {
        const idx = prev.findIndex((s) => s.spell_name === normalizedCurrent);
        const base: SpellVoteStats = idx >= 0 ? { ...prev[idx] } : {
          spell_name: normalizedCurrent,
          tier_s: 0, tier_a: 0, tier_b: 0, tier_c: 0, tier_d: 0, tier_e: 0,
          total_votes: 0,
        };
        const key = `tier_${pendingVote.toLowerCase()}` as keyof SpellVoteStats;
        (base[key] as number) += 1;
        base.total_votes = base.tier_s + base.tier_a + base.tier_b + base.tier_c + base.tier_d + base.tier_e;
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = base;
          return updated;
        }
        return [...prev, base];
      });

      const updated = { ...votedSpells, [normalizedCurrent]: pendingVote };
      setVotedSpells(updated);
      saveVoteCast(normalizedCurrent, pendingVote);
      toast.success(t.vote_thanks);

      // Auto-advance to next unvoted spell after delay (enough to see confirmation)
      advanceTimerRef.current = setTimeout(() => advanceToNextSpell(normalizedCurrent, updated), 2500);
    } catch {
      toast.error(t.vote_error);
    } finally {
      setSubmitting(false);
    }
  }

  const total = currentStats?.total_votes ?? 0;
  const tierCounts = TIERS.map((tier) => ({
    tier,
    count: (currentStats?.[`tier_${tier.toLowerCase()}` as keyof SpellVoteStats] as number) ?? 0,
  }));

  return (
    <div className="rounded-lg border border-dashed border-gold/25 bg-white/[0.01] p-5 space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-foreground/70 text-sm font-medium">{t.title}</p>
        <p className="text-foreground/40 text-xs mt-0.5">{t.subtitle}</p>
      </div>

      {/* Spell name */}
      <div className="text-center py-2">
        <span className="font-display text-xl text-gold">{currentSpell}</span>
        {total > 0 && (
          <p className="text-foreground/35 text-[10px] mt-1">
            {total} {t.votes_label}
          </p>
        )}
      </div>

      {/* Distribution bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 rounded-full overflow-hidden flex w-full gap-px" aria-label={t.vote_bar_label}>
            {tierCounts.map(({ tier, count }) => {
              if (count === 0) return null;
              const pct = (count / total) * 100;
              return (
                <div
                  key={tier}
                  className={`h-full transition-all duration-500 rounded-sm ${TIER_COLORS[tier].bg.replace("/10", "/40")}`}
                  style={{ width: `${pct}%` }}
                  title={`${tier}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {tierCounts.map(({ tier, count }) => {
              if (count === 0) return null;
              return (
                <span key={tier} className={`text-[10px] ${TIER_COLORS[tier].text} tabular-nums`}>
                  {tier}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Already voted — show confirmed state with prominent badge */}
      {hasVotedThisSpell && (
        <div className="flex items-center justify-center gap-2.5 py-2 animate-[fade-in_0.4s_ease-out]">
          <span className={`text-base font-bold px-3 py-1 rounded-md ${TIER_COLORS[votedSpells[normalizedCurrent]].selected}`}>
            {votedSpells[normalizedCurrent]}
          </span>
          <span className="text-xs text-foreground/50 font-medium">{t.voted_label}</span>
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Voting buttons — only show if not yet voted for this spell */}
      {isLoggedIn && !hasVotedThisSpell && (
        <div className="space-y-2">
          <div className="flex gap-1.5 justify-center">
            {TIERS.map((tier) => {
              const isSelected = pendingVote === tier;
              const colors = TIER_COLORS[tier];
              return (
                <button
                  key={tier}
                  onClick={() => setPendingVote(tier)}
                  disabled={submitting}
                  className={`w-10 h-10 rounded-md text-sm font-bold border transition-all duration-200 disabled:opacity-40
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

          {pendingVote && (
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full py-2 rounded-md text-xs font-medium bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 transition-all disabled:opacity-40"
            >
              {t.confirm}
            </button>
          )}
        </div>
      )}

      {/* All voted message */}
      {isLoggedIn && allVoted && hasVotedThisSpell && (
        <p className="text-xs text-gold/50 text-center py-1">{t.all_voted}</p>
      )}

      {/* Login prompt — hide if user has cached votes */}
      {!isLoggedIn && !hasVotedThisSpell && (
        <div className="text-center">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 rounded-md px-4 py-2 transition-all duration-200"
          >
            {t.login_to_vote}
          </Link>
        </div>
      )}

      {/* Link to full ranking */}
      <div className="text-center pt-1">
        <Link
          href="/methodology/spell-tiers"
          className="text-[11px] text-foreground/30 hover:text-gold/60 transition-colors duration-200"
        >
          {t.see_ranking}
        </Link>
      </div>
    </div>
  );
}
