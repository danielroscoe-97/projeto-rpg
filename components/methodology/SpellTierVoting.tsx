"use client";

import { useState, useEffect, useCallback } from "react";
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

type SpellVoteOption = "under_tiered" | "correct" | "over_tiered";

interface SpellVoteStats {
  spell_name: string;
  under_tiered: number;
  correct: number;
  over_tiered: number;
  total_votes: number;
}

interface SpellTierVotingProps {
  translations: {
    title: string;
    subtitle: string;
    under_tiered: string;
    correct: string;
    over_tiered: string;
    vote_thanks: string;
    vote_error: string;
    login_to_vote: string;
    votes_label: string;
    vote_bar_label: string;
  };
  isLoggedIn: boolean;
}

const STORAGE_KEY = "spell_votes_cast";

function getVotesCast(): Record<string, SpellVoteOption> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveVoteCast(spellName: string, vote: SpellVoteOption) {
  try {
    const existing = getVotesCast();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, [spellName]: vote }));
  } catch {
    // ignore storage errors
  }
}

function pickStartingSpell(votedSet: Set<string>): string {
  const unvoted = FEATURED_SPELLS.filter((s) => !votedSet.has(s));
  const pool = unvoted.length > 0 ? unvoted : [...FEATURED_SPELLS];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function SpellTierVoting({ translations: t, isLoggedIn }: SpellTierVotingProps) {
  const [allStats, setAllStats] = useState<SpellVoteStats[]>([]);
  const [votedSpells, setVotedSpells] = useState<Record<string, SpellVoteOption>>({});
  const [currentSpell, setCurrentSpell] = useState<string>(FEATURED_SPELLS[0]);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate voted spells from localStorage (client-only)
  useEffect(() => {
    const cast = getVotesCast();
    setVotedSpells(cast);
    setCurrentSpell(pickStartingSpell(new Set(Object.keys(cast))));
  }, []);

  // Fetch spell stats from API
  useEffect(() => {
    fetch("/api/methodology/spell-vote")
      .then((r) => r.json())
      .then((data: SpellVoteStats[]) => {
        if (Array.isArray(data)) setAllStats(data);
      })
      .catch(() => {/* fail silently — card degrades gracefully */});
  }, []);

  const currentStats = allStats.find(
    (s) => s.spell_name.toLowerCase() === currentSpell.toLowerCase()
  );

  const advanceToNextSpell = useCallback(
    (justVotedSpell: string, updatedVoted: Record<string, SpellVoteOption>) => {
      const votedSet = new Set(Object.keys(updatedVoted));
      const unvoted = FEATURED_SPELLS.filter(
        (s) => !votedSet.has(s) && s !== justVotedSpell
      );
      const pool =
        unvoted.length > 0
          ? unvoted
          : FEATURED_SPELLS.filter((s) => s !== justVotedSpell);
      const next = pool[Math.floor(Math.random() * pool.length)] ?? FEATURED_SPELLS[0];
      setCurrentSpell(next);
    },
    []
  );

  async function handleVote(vote: SpellVoteOption) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/methodology/spell-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spell_name: currentSpell, vote }),
      });

      if (!res.ok) throw new Error("vote failed");

      // Optimistically update stats locally
      setAllStats((prev) => {
        const idx = prev.findIndex(
          (s) => s.spell_name.toLowerCase() === currentSpell.toLowerCase()
        );
        if (idx === -1) {
          return [
            ...prev,
            {
              spell_name: currentSpell,
              under_tiered: vote === "under_tiered" ? 1 : 0,
              correct: vote === "correct" ? 1 : 0,
              over_tiered: vote === "over_tiered" ? 1 : 0,
              total_votes: 1,
            },
          ];
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          [vote]: updated[idx][vote] + 1,
          total_votes: updated[idx].total_votes + 1,
        };
        return updated;
      });

      const updatedVoted = { ...votedSpells, [currentSpell]: vote };
      setVotedSpells(updatedVoted);
      saveVoteCast(currentSpell, vote);
      toast.success(t.vote_thanks);
      advanceToNextSpell(currentSpell, updatedVoted);
    } catch {
      toast.error(t.vote_error);
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyVotedThisSpell = votedSpells[currentSpell] !== undefined;

  // Bar widths for vote distribution
  const total = currentStats?.total_votes ?? 0;
  const barUnder = total > 0 ? (currentStats!.under_tiered / total) * 100 : 0;
  const barCorrect = total > 0 ? (currentStats!.correct / total) * 100 : 0;
  const barOver = total > 0 ? (currentStats!.over_tiered / total) * 100 : 0;

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
            {total.toLocaleString()} {t.votes_label}
          </p>
        )}
      </div>

      {/* Vote distribution bar */}
      {total > 0 && (
        <div
          className="h-1.5 rounded-full overflow-hidden flex w-full"
          aria-label={t.vote_bar_label}
        >
          {barUnder > 0 && (
            <div
              className="bg-blue-500/60 h-full transition-all duration-500"
              style={{ width: `${barUnder}%` }}
            />
          )}
          {barCorrect > 0 && (
            <div
              className="bg-gold/60 h-full transition-all duration-500"
              style={{ width: `${barCorrect}%` }}
            />
          )}
          {barOver > 0 && (
            <div
              className="bg-red-500/60 h-full transition-all duration-500"
              style={{ width: `${barOver}%` }}
            />
          )}
        </div>
      )}

      {/* Vote buttons or login prompt */}
      {isLoggedIn ? (
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => handleVote("under_tiered")}
            disabled={submitting || alreadyVotedThisSpell}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200
              ${
                alreadyVotedThisSpell && votedSpells[currentSpell] === "under_tiered"
                  ? "border-blue-400/60 bg-blue-500/15 text-blue-300"
                  : "border-white/10 bg-white/[0.03] text-foreground/60 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
          >
            {t.under_tiered}
          </button>
          <button
            onClick={() => handleVote("correct")}
            disabled={submitting || alreadyVotedThisSpell}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200
              ${
                alreadyVotedThisSpell && votedSpells[currentSpell] === "correct"
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-white/10 bg-white/[0.03] text-foreground/60 hover:border-gold/40 hover:bg-gold/10 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
          >
            {t.correct}
          </button>
          <button
            onClick={() => handleVote("over_tiered")}
            disabled={submitting || alreadyVotedThisSpell}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200
              ${
                alreadyVotedThisSpell && votedSpells[currentSpell] === "over_tiered"
                  ? "border-red-400/60 bg-red-500/15 text-red-300"
                  : "border-white/10 bg-white/[0.03] text-foreground/60 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
          >
            {t.over_tiered}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 rounded-md px-4 py-2 transition-all duration-200"
          >
            {t.login_to_vote}
          </Link>
        </div>
      )}
    </div>
  );
}
