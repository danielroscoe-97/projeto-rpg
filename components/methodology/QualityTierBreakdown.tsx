"use client";

interface QualityTierBreakdownProps {
  gold: number;
  silver: number;
  bronze: number;
}

export function QualityTierBreakdown({ gold, silver, bronze }: QualityTierBreakdownProps) {
  if (gold === 0 && silver === 0 && bronze === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {/* Gold */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold/10 text-gold text-[10px] font-bold shrink-0"
          aria-hidden="true"
        >
          🥇
        </span>
        <span className="text-xs text-gold font-medium tabular-nums">{gold.toLocaleString()}</span>
      </div>

      <div className="w-px h-3 bg-white/10" aria-hidden="true" />

      {/* Silver */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/5 text-gray-300 text-[10px] font-bold shrink-0"
          aria-hidden="true"
        >
          🥈
        </span>
        <span className="text-xs text-gray-400 tabular-nums">{silver.toLocaleString()}</span>
      </div>

      <div className="w-px h-3 bg-white/10" aria-hidden="true" />

      {/* Bronze */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-900/10 text-amber-700 text-[10px] font-bold shrink-0"
          aria-hidden="true"
        >
          🥉
        </span>
        <span className="text-xs text-amber-700/80 tabular-nums">{bronze.toLocaleString()}</span>
      </div>
    </div>
  );
}
