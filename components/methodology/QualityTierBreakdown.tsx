"use client";

import { GoldBadge, SilverBadge, BronzeBadge } from "./TitleBadges";

interface QualityTierBreakdownProps {
  gold: number;
  silver: number;
  bronze: number;
}

export function QualityTierBreakdown({ gold, silver, bronze }: QualityTierBreakdownProps) {
  if (gold === 0 && silver === 0 && bronze === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {/* Bronze */}
      <div className="flex items-center gap-1.5">
        <BronzeBadge className="w-5 h-5 shrink-0" />
        <span className="text-xs text-amber-700/80 tabular-nums">{bronze.toLocaleString()}</span>
      </div>

      <div className="w-px h-3 bg-white/10" aria-hidden="true" />

      {/* Silver */}
      <div className="flex items-center gap-1.5">
        <SilverBadge className="w-5 h-5 shrink-0" />
        <span className="text-xs text-gray-400 tabular-nums">{silver.toLocaleString()}</span>
      </div>

      <div className="w-px h-3 bg-white/10" aria-hidden="true" />

      {/* Gold */}
      <div className="flex items-center gap-1.5">
        <GoldBadge className="w-5 h-5 shrink-0" />
        <span className="text-xs text-gold font-medium tabular-nums">{gold.toLocaleString()}</span>
      </div>
    </div>
  );
}
