"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

type SpellVoteOption = "under_tiered" | "correct" | "over_tiered";

interface SpellVoteStats {
  spell_name: string;
  under_tiered: number;
  correct: number;
  over_tiered: number;
  total_votes: number;
}

interface SpellTierVotingMiniProps {
  spellName: string;
  isLoggedIn: boolean;
  translations: {
    under_tiered: string;
    correct: string;
    over_tiered: string;
    vote_thanks: string;
    vote_error: string;
    login_to_vote: string;
    votes_label: string;
    title: string;
  };
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

export function SpellTierVotingMini({ spellName, isLoggedIn, translations: t }: SpellTierVotingMiniProps) {
  const [stats, setStats] = useState<SpellVoteStats | null>(null);
  const [myVote, setMyVote] = useState<SpellVoteOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedName = spellName.toLowerCase();

  useEffect(() => {
    const cast = getVotesCast();
    // Check both exact and lowercase keys for backwards compat
    const existing = cast[spellName] ?? cast[normalizedName];
    if (existing) setMyVote(existing);

    fetch("/api/methodology/spell-vote")
      .then((r) => r.json())
      .then((data: SpellVoteStats[]) => {
        if (!Array.isArray(data)) return;
        const match = data.find((s) => s.spell_name.toLowerCase() === normalizedName);
        if (match) setStats(match);
      })
      .catch(() => {});
  }, [spellName, normalizedName]);

  async function handleVote(vote: SpellVoteOption) {
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
        if (!prev) {
          return {
            spell_name: normalizedName,
            under_tiered: vote === "under_tiered" ? 1 : 0,
            correct: vote === "correct" ? 1 : 0,
            over_tiered: vote === "over_tiered" ? 1 : 0,
            total_votes: 1,
          };
        }
        const updated = { ...prev };
        // If changing vote, decrement old
        if (myVote) updated[myVote] = Math.max(0, updated[myVote] - 1);
        updated[vote] += 1;
        updated.total_votes = updated.under_tiered + updated.correct + updated.over_tiered;
        return updated;
      });

      setMyVote(vote);
      saveVoteCast(normalizedName, vote);
      toast.success(t.vote_thanks);
    } catch {
      toast.error(t.vote_error);
    } finally {
      setSubmitting(false);
    }
  }

  const total = stats?.total_votes ?? 0;
  const barUnder = total > 0 ? ((stats?.under_tiered ?? 0) / total) * 100 : 0;
  const barCorrect = total > 0 ? ((stats?.correct ?? 0) / total) * 100 : 0;
  const barOver = total > 0 ? ((stats?.over_tiered ?? 0) / total) * 100 : 0;

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

      {/* Vote distribution bar */}
      {total > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden flex w-full">
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
        <div className="flex flex-wrap gap-2">
          {(["under_tiered", "correct", "over_tiered"] as const).map((option) => {
            const isSelected = myVote === option;
            const colorMap = {
              under_tiered: isSelected
                ? "border-blue-400/60 bg-blue-500/15 text-blue-300"
                : "border-white/10 bg-white/[0.03] text-foreground/60 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-300",
              correct: isSelected
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-white/10 bg-white/[0.03] text-foreground/60 hover:border-gold/40 hover:bg-gold/10 hover:text-gold",
              over_tiered: isSelected
                ? "border-red-400/60 bg-red-500/15 text-red-300"
                : "border-white/10 bg-white/[0.03] text-foreground/60 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300",
            };
            return (
              <button
                key={option}
                onClick={() => handleVote(option)}
                disabled={submitting}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 disabled:opacity-40 ${colorMap[option]}`}
              >
                {t[option]}
              </button>
            );
          })}
        </div>
      ) : (
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
