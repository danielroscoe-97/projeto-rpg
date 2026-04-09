"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import type { GrantXpResult } from "@/lib/xp/grant-xp";

interface XpRewardToastProps {
  /** List of XP results to display */
  results: { label: string; result: GrantXpResult }[];
}

/**
 * Renders a Sonner toast showing XP earned from multiple actions.
 * Typically used post-combat to show a breakdown.
 */
export function showXpRewardToast(
  results: { label: string; result: GrantXpResult }[],
) {
  const granted = results.filter((r) => r.result.granted);
  if (granted.length === 0) return;

  const totalXp = granted.reduce((sum, r) => sum + r.result.xp, 0);

  toast(
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gold font-semibold">
        <Star className="w-4 h-4 fill-gold text-gold" />
        <span>+{totalXp} XP</span>
      </div>
      <div className="space-y-0.5">
        {granted.map((r, i) => (
          <div key={i} className="text-xs text-foreground/60 flex justify-between">
            <span>{r.label}</span>
            <span className="text-gold/80 tabular-nums">+{r.result.xp}</span>
          </div>
        ))}
      </div>
    </div>,
    {
      duration: 5000,
      className: "border-gold/20",
    },
  );

  // Check for rank up
  for (const r of granted) {
    if (r.result.rankUp) {
      // Delay rank up toast slightly so it appears after the XP toast
      setTimeout(() => {
        showRankUpToast(r.result.rankUp!.newTitle);
      }, 800);
      break; // Only show one rank-up animation
    }
  }
}

function showRankUpToast(newTitle: string) {
  toast(
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="text-2xl">👑</div>
      <div className="text-center">
        <p className="text-gold font-bold text-sm">Rank Up!</p>
        <p className="text-foreground text-xs mt-0.5">{newTitle}</p>
      </div>
    </div>,
    {
      duration: 4000,
      className: "border-gold/30 bg-gradient-to-b from-gold/[0.06] to-transparent",
    },
  );
}

/**
 * Component version that triggers toast on mount.
 * Use when you want to fire-and-forget from JSX.
 */
export function XpRewardToast({ results }: XpRewardToastProps) {
  useEffect(() => {
    if (results.length > 0) {
      showXpRewardToast(results);
    }
  }, [results]);

  return null;
}
