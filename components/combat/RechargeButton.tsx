"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { rollRecharge, type RechargeRollResult } from "@/lib/combat/parse-recharge";

export interface RechargeButtonProps {
  /** Human-readable action name (e.g. "Fire Breath") used in aria labels. */
  actionName: string;
  /** Is the ability currently used-up (needs a d6 to come back)? */
  depleted: boolean;
  /** d6 threshold to recharge — e.g. 5 means `(Recharge 5-6)`. */
  threshold: number;
  /**
   * Called when the DM toggles the state. The parent is responsible for the
   * actual state update; this component only owns the transient roll animation.
   *
   * @param nextDepleted - the new depleted state the parent should persist
   * @param rollInfo - present only when transitioning from depleted → available
   *                   (i.e. the DM rolled d6); undefined when marking as used.
   */
  onToggle: (nextDepleted: boolean, rollInfo?: RechargeRollResult) => void;
  /** Optional extra className for wrapper. */
  className?: string;
}

/**
 * Check `prefers-reduced-motion: reduce` — server-safe (returns false during SSR).
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return reduced;
}

/**
 * Toggle button for a monster ability's Recharge state.
 *
 * - Available (not depleted): shows a die icon. Click marks the ability as used.
 * - Depleted: shows an hourglass. Click rolls d6 with a short animation and,
 *   if the roll meets the threshold, flips back to available.
 *
 * The roll animation is ~500ms (skipped when `prefers-reduced-motion: reduce`).
 * Touch target is 32×32 desktop / 44×44 mobile (WCAG 2.5.8 AA).
 */
export function RechargeButton({
  actionName,
  depleted,
  threshold,
  onToggle,
  className,
}: RechargeButtonProps) {
  const t = useTranslations("combat.recharge");
  const prefersReduced = useReducedMotion();
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Clean up pending timeout on unmount to avoid stale setState.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (rolling) return;

    if (!depleted) {
      // Currently available → mark as used. No roll, no animation.
      onToggle(true);
      return;
    }

    // Currently depleted → roll d6.
    const result = rollRecharge(threshold);
    setLastRoll(result.roll);

    const commit = () => {
      setRolling(false);
      onToggle(result.recharged ? false : true, result);
    };

    if (prefersReduced) {
      commit();
      return;
    }

    setRolling(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      commit();
    }, 500);
  }, [rolling, depleted, threshold, onToggle, prefersReduced]);

  const tooltip = depleted
    ? t("depleted_tooltip", { threshold })
    : t("available_tooltip");
  const ariaLabel = t("aria_button", { action: actionName });

  // Visual states:
  // - Available: gold-bordered d6 icon
  // - Depleted: muted hourglass icon
  // - Rolling: same as depleted but with a spin + current face
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rolling}
      aria-label={ariaLabel}
      aria-pressed={depleted}
      title={tooltip}
      data-depleted={depleted ? "true" : "false"}
      data-rolling={rolling ? "true" : "false"}
      data-testid={`recharge-button-${actionName.replace(/\W+/g, "-").toLowerCase()}`}
      className={[
        "inline-flex items-center justify-center",
        "h-8 w-8 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px]",
        "rounded-md border text-xs font-mono leading-none select-none",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--5e-accent-gold)]/60",
        depleted
          ? "border-[var(--5e-text-muted)]/40 bg-background/40 text-[var(--5e-text-muted)]"
          : "border-[var(--5e-accent-gold)]/50 bg-[var(--5e-accent-gold)]/10 text-[var(--5e-accent-gold)]",
        rolling ? "cursor-wait" : "cursor-pointer hover:brightness-110",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      {rolling ? (
        <span aria-hidden="true" className="animate-spin">
          {lastRoll ?? "·"}
        </span>
      ) : depleted ? (
        <span aria-hidden="true" title={t("depleted_label")}>
          {/* Hourglass — text glyph keeps it dependency-free. */}⌛
        </span>
      ) : (
        <span aria-hidden="true">
          {/* d6 glyph */}⚅
        </span>
      )}
      <span className="sr-only">
        {depleted
          ? `${actionName}: ${t("depleted_label")}`
          : actionName}
      </span>
    </button>
  );
}
