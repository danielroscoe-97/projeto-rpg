"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

interface SpellTierRankingProps {
  translations: {
    spell_ranking_title: string;
    spell_ranking_subtitle: string;
    spell_ranking_no_votes: string;
    spell_ranking_consensus: string;
    spell_ranking_votes: string;
    spell_ranking_spell: string;
    spell_ranking_distribution: string;
  };
}

const TIERS: SpellTier[] = ["S", "A", "B", "C", "D", "E"];

const TIER_COLORS: Record<
  SpellTier,
  { bg: string; text: string; border: string; barBg: string }
> = {
  S: {
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
    barBg: "bg-amber-500/50",
  },
  A: {
    bg: "bg-purple-500/20",
    text: "text-purple-300",
    border: "border-purple-500/40",
    barBg: "bg-purple-500/50",
  },
  B: {
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    border: "border-blue-500/40",
    barBg: "bg-blue-500/50",
  },
  C: {
    bg: "bg-green-500/20",
    text: "text-green-300",
    border: "border-green-500/40",
    barBg: "bg-green-500/50",
  },
  D: {
    bg: "bg-gray-500/20",
    text: "text-gray-300",
    border: "border-gray-500/40",
    barBg: "bg-gray-500/50",
  },
  E: {
    bg: "bg-red-500/20",
    text: "text-red-300",
    border: "border-red-500/40",
    barBg: "bg-red-500/50",
  },
};

function getConsensusTier(stats: SpellVoteStats): SpellTier {
  const counts: Record<SpellTier, number> = {
    S: stats.tier_s,
    A: stats.tier_a,
    B: stats.tier_b,
    C: stats.tier_c,
    D: stats.tier_d,
    E: stats.tier_e,
  };
  // Find tier(s) with highest votes — on tie, pick the lower (more conservative) tier
  let best: SpellTier = "C"; // default middle ground
  let bestCount = 0;
  for (const tier of TIERS) {
    if (counts[tier] > bestCount) {
      bestCount = counts[tier];
      best = tier;
    }
  }
  return best;
}

function toSpellSlug(spellName: string): string {
  return spellName.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toDisplayName(spellName: string): string {
  return spellName
    .split(/[-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function TierBadge({ tier }: { tier: SpellTier }) {
  const colors = TIER_COLORS[tier];
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-bold border ${colors.bg} ${colors.text} ${colors.border} shrink-0`}
    >
      {tier}
    </span>
  );
}

function VoteBar({ stats }: { stats: SpellVoteStats }) {
  const total = stats.total_votes;
  if (total === 0) return null;

  const tierCounts = TIERS.map((tier) => ({
    tier,
    count: stats[`tier_${tier.toLowerCase()}` as keyof SpellVoteStats] as number,
  }));

  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px" aria-hidden="true">
      {tierCounts.map(({ tier, count }) => {
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={tier}
            className={`h-full rounded-sm transition-all duration-500 ${TIER_COLORS[tier].barBg}`}
            style={{ width: `${pct}%` }}
            title={`${tier}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04] animate-pulse">
      <div className="w-8 h-8 rounded-md bg-white/[0.06] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-white/[0.06] rounded w-1/3" />
        <div className="h-1.5 bg-white/[0.04] rounded w-full" />
      </div>
      <div className="w-12 h-3 bg-white/[0.04] rounded shrink-0" />
    </div>
  );
}

export function SpellTierRanking({ translations: t }: SpellTierRankingProps) {
  const [spells, setSpells] = useState<SpellVoteStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/methodology/spell-vote")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data: SpellVoteStats[]) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => b.total_votes - a.total_votes);
          setSpells(sorted);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Empty / error state */}
      {!loading && (spells.length === 0 || error) && (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-6 py-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gold/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gold/50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="text-foreground/50 text-sm max-w-xs mx-auto">
            {t.spell_ranking_no_votes}
          </p>
        </div>
      )}

      {/* Desktop table — hidden on mobile */}
      {!loading && spells.length > 0 && (
        <>
          {/* Desktop view */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="text-left px-4 py-3 text-foreground/40 text-xs font-medium uppercase tracking-wider w-8">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-foreground/40 text-xs font-medium uppercase tracking-wider">
                    {t.spell_ranking_spell}
                  </th>
                  <th className="text-center px-4 py-3 text-foreground/40 text-xs font-medium uppercase tracking-wider w-28">
                    {t.spell_ranking_consensus}
                  </th>
                  <th className="text-left px-4 py-3 text-foreground/40 text-xs font-medium uppercase tracking-wider">
                    {t.spell_ranking_distribution}
                  </th>
                  <th className="text-right px-4 py-3 text-foreground/40 text-xs font-medium uppercase tracking-wider w-24">
                    {t.spell_ranking_votes}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {spells.map((spell, idx) => {
                  const consensus = getConsensusTier(spell);
                  const slug = toSpellSlug(spell.spell_name);
                  const displayName = toDisplayName(spell.spell_name);
                  return (
                    <tr
                      key={spell.spell_name}
                      className="group hover:bg-white/[0.025] transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-foreground/25 text-xs tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/spells/${slug}`}
                          className="text-foreground/80 hover:text-gold transition-colors duration-150 font-medium"
                        >
                          {displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TierBadge tier={consensus} />
                      </td>
                      <td className="px-4 py-3">
                        <VoteBar stats={spell} />
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/40 text-xs tabular-nums">
                        {spell.total_votes.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden space-y-2">
            {spells.map((spell, idx) => {
              const consensus = getConsensusTier(spell);
              const slug = toSpellSlug(spell.spell_name);
              const displayName = toDisplayName(spell.spell_name);
              return (
                <div
                  key={spell.spell_name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-foreground/25 text-xs tabular-nums w-5 shrink-0">
                      {idx + 1}
                    </span>
                    <TierBadge tier={consensus} />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/spells/${slug}`}
                        className="text-foreground/80 hover:text-gold transition-colors duration-150 font-medium text-sm truncate block"
                      >
                        {displayName}
                      </Link>
                      <p className="text-foreground/35 text-[10px] tabular-nums mt-0.5">
                        {spell.total_votes.toLocaleString()} {t.spell_ranking_votes}
                      </p>
                    </div>
                  </div>
                  <VoteBar stats={spell} />
                  {/* Tier breakdown legend */}
                  <div className="flex gap-2 flex-wrap">
                    {TIERS.map((tier) => {
                      const count =
                        spell[`tier_${tier.toLowerCase()}` as keyof SpellVoteStats] as number;
                      if (count === 0) return null;
                      return (
                        <span
                          key={tier}
                          className={`text-[10px] tabular-nums ${TIER_COLORS[tier].text}`}
                        >
                          {tier}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
