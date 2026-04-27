"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dot } from "@/components/ui/Dot";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

type DotSize = "sm" | "md" | "lg";

// I-02 fix: all sizes have invisible padding around the dot for a 44×44
// touch target (WCAG 2.1 SC 2.5.5). `dotSize` drives the <Dot> primitive's
// size prop; `touch` is the wrapper padding. The <Dot> primitive's size
// enum was tuned to match this component's legacy sizes so visuals stay
// bit-identical during the EP-0 migration.
const DOT_SIZES: Record<DotSize, { dotSize: DotSize; touch: string }> = {
  sm: { dotSize: "sm", touch: "p-1.5" },
  md: { dotSize: "md", touch: "p-1" },
  lg: { dotSize: "lg", touch: "p-0.5" },
};

const NUMERIC_THRESHOLD = 20;

interface ResourceDotsProps {
  // C-04 fix: renamed from `current` to `usedCount` for clarity
  usedCount: number;
  max: number;
  color?: string;
  size?: DotSize;
  readOnly?: boolean;
  onToggle?: (index: number) => void;
  label?: string;
}

export function ResourceDots({
  usedCount,
  max,
  color = "bg-amber-400 border-amber-400",
  size = "md",
  readOnly = false,
  onToggle,
  label,
}: ResourceDotsProps) {
  const t = useTranslations("player_hq.resources");
  const [bouncingDot, setBouncingDot] = useState<number | null>(null);
  // M-02 fix: removed unused mountedRef

  const handleToggle = useCallback(
    (index: number) => {
      if (readOnly) return;
      setBouncingDot(index);
      setTimeout(() => setBouncingDot(null), 400);
      navigator.vibrate?.([50]);
      onToggle?.(index);
    },
    [readOnly, onToggle]
  );

  // Fallback: numeric input for resources > 20 (Lay on Hands, Ki at high level)
  if (max > NUMERIC_THRESHOLD) {
    return (
      <NumericTracker
        usedCount={usedCount}
        max={max}
        readOnly={readOnly}
        onToggle={onToggle}
        label={label}
      />
    );
  }

  const remaining = max - usedCount;
  // PRD decision #37 — Sprint 5 dot inversion gated by V2 flag:
  //   V2 OFF → filled = i < remaining (legacy "filled = available")
  //   V2 ON  → filled = i < usedCount (canonical "filled = used/spent")
  // The <Dot> primitive stays a dumb renderer; we compute `filled` here.
  const v2 = isPlayerHqV2Enabled();

  const sizeStyle = DOT_SIZES[size];

  return (
    <div
      className="flex gap-0.5 flex-wrap"
      role="group"
      aria-label={label ?? t("trackers_title")}
    >
      {Array.from({ length: max }, (_, i) => {
        const isFilled = v2 ? i < usedCount : i < remaining;
        return (
          <button
            key={i}
            type="button"
            role="checkbox"
            aria-checked={isFilled}
            aria-label={`${label ?? t("trackers_title")} ${i + 1}/${max}`}
            onClick={() => handleToggle(i)}
            disabled={readOnly}
            className={`${sizeStyle.touch} min-w-[44px] min-h-[44px] flex items-center justify-center ${
              readOnly ? "cursor-default" : "cursor-pointer"
            }`}
          >
            <Dot
              variant="transient"
              size={sizeStyle.dotSize}
              filled={isFilled}
              filledClassName={color}
              emptyClassName="bg-white/[0.15] border-white/[0.08]"
              ariaLabel={`${label ?? t("trackers_title")} ${i + 1}/${max}`}
              className={`transition-transform duration-200 ${
                bouncingDot === i ? "scale-125" : "scale-100"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── NumericTracker (fallback for > 20 uses) ──────────────────────────────

interface NumericTrackerProps {
  usedCount: number;
  max: number;
  readOnly?: boolean;
  onToggle?: (index: number) => void;
  label?: string;
}

function NumericTracker({
  usedCount,
  max,
  readOnly = false,
  onToggle,
  label,
}: NumericTrackerProps) {
  const t = useTranslations("player_hq.resources");
  const remaining = max - usedCount;

  const handleDecrement = useCallback(() => {
    if (readOnly || remaining <= 0) return;
    navigator.vibrate?.([50]);
    onToggle?.(usedCount);
  }, [readOnly, remaining, usedCount, onToggle]);

  const handleIncrement = useCallback(() => {
    if (readOnly || usedCount <= 0) return;
    navigator.vibrate?.([50]);
    onToggle?.(usedCount - 1);
  }, [readOnly, usedCount, onToggle]);

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={label ?? t("trackers_title")}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={readOnly || remaining <= 0}
        className="w-9 h-9 rounded-md bg-white/5 border border-border text-foreground text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t("use_one")}
      >
        &minus;
      </button>
      <span className="text-sm font-semibold tabular-nums text-foreground min-w-[3ch] text-center">
        {remaining}/{max}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={readOnly || usedCount <= 0}
        className="w-9 h-9 rounded-md bg-white/5 border border-border text-foreground text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t("restore_one")}
      >
        +
      </button>
    </div>
  );
}
