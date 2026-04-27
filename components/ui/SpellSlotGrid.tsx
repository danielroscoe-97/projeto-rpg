"use client";

/**
 * SpellSlotGrid — EP-0 C0.2 consolidation primitive.
 *
 * Shared dot-grid UI for a single spell-slot level row. Extracted from
 * `components/player-hq/SpellSlotsHq.tsx` (HQ variant, via `ResourceDots`)
 * and `components/player/SpellSlotTracker.tsx` (combat variant) to remove
 * duplication before Wave 1–4 features land.
 *
 * ## Behavior contract (do NOT change)
 *
 * - Click a dot to toggle it. The `onToggle(index)` callback receives the
 *   zero-based dot index the user clicked. Hosts translate the index into
 *   a `used` count exactly as they do today.
 * - For `variant="transient"` (today's only real caller) the filled state
 *   is **filled dot = slot available** by default. That is,
 *   `isFilled = i < (max - used)`. This matches the legacy `ResourceDots`
 *   and combat `SpellSlotTracker` behavior bit-for-bit.
 * - For `variant="permanent"` the filled state is **filled dot = acquired**.
 *   No existing spell-slot caller uses this variant; the prop exists so
 *   PRD decision #37 can flip semantics behind a flag later.
 *
 * ## Inversion (PRD decision #37, Sprint 5)
 *
 * When `inverted={true}` AND `variant="transient"`, the mapping flips to
 * **filled dot = used/spent** (`isFilled = i < used`). This brings transient
 * resources in line with the reaction dot in `CombatantRow.tsx:516` (the
 * canonical post-inversion reference) and matches the new mental model:
 * "filled dot = consumed action". Hosts gate this on the
 * `NEXT_PUBLIC_PLAYER_HQ_V2` flag — see `lib/flags/player-hq-v2.ts` and
 * the call sites in `SpellSlotsHq.tsx` + `SpellSlotTracker.tsx`. Default
 * remains `inverted={false}` so legacy callers stay bit-identical.
 *
 * ## What this component does NOT do
 *
 * - Does not flip the visual semantic of transient resources (Sprint 5,
 *   behind `NEXT_PUBLIC_PLAYER_HQ_V2`).
 * - Does not render headers, "Long rest" buttons, or "+ add level" CTAs —
 *   host components keep those responsibilities.
 * - Does not invent tiers or labels — callers pass `ariaLabel` verbatim.
 *
 * ## Density presets
 *
 * - `density="comfortable"` (default; HQ) — 14px dots, 0.5 gap, 44×44
 *   invisible touch padding per WCAG 2.1 SC 2.5.5.
 * - `density="compact"` — 12px dots, 1-unit gap, no touch padding. Used by
 *   the combat `SpellSlotTracker` which must fit into a crowded row.
 */

import { useCallback, useState } from "react";

/** Variant drives the semantic of `isFilled` (see doc comment). */
export type SpellSlotGridVariant = "permanent" | "transient";

/** Density preset — see doc comment. */
export type SpellSlotGridDensity = "comfortable" | "compact";

export interface SpellSlotGridProps {
  /** Slots consumed this long rest. Mirrors today's `slot.used` prop. */
  used: number;
  /** Slot pool for this level. Render exactly `max` dots. */
  max: number;
  /**
   * Semantic of the filled state.
   * - `transient`: filled dot = available slot (legacy behavior).
   * - `permanent`: filled dot = acquired (reserved for future consumers).
   */
  variant: SpellSlotGridVariant;
  /**
   * Click handler. Receives the zero-based dot index. Hosts decide how the
   * index maps to an increment/decrement on `used`.
   */
  onToggle?: (index: number) => void;
  /**
   * Density preset; defaults to `comfortable` (the HQ default).
   */
  density?: SpellSlotGridDensity;
  /**
   * Tailwind classes applied to the filled dot (background + border).
   * Defaults to the HQ amber palette; the combat variant overrides to
   * purple.
   */
  filledClassName?: string;
  /** Disables the buttons and drops the hover/active affordances. */
  readOnly?: boolean;
  /** Accessible label for the whole group. Required for a11y. */
  ariaLabel: string;
  /**
   * Optional label formatter per-dot (defaults to `${ariaLabel} ${i + 1}/${max}`).
   * The combat variant uses richer per-dot labels so we expose this hook.
   */
  dotAriaLabel?: (index: number, isFilled: boolean) => string;
  /**
   * PRD decision #37 dot inversion. When `true` AND `variant="transient"`,
   * filled dots represent **used/spent** slots (`filled = i < used`) instead
   * of available slots. Default `false` preserves legacy behavior. Hosts
   * gate this on `isPlayerHqV2Enabled()`. No-op for `variant="permanent"`.
   */
  inverted?: boolean;
}

interface DensityStyles {
  dot: string;
  gap: string;
  /** Non-empty means: wrap each dot in an invisible padded 44×44 hit area. */
  touch: string;
  empty: string;
  bounceScale: string;
}

const DENSITY: Record<SpellSlotGridDensity, DensityStyles> = {
  // HQ/ResourceDots md-equivalent — 14px dot, 44×44 invisible touch target.
  comfortable: {
    dot: "w-3.5 h-3.5",
    gap: "gap-0.5",
    touch: "p-1 min-w-[44px] min-h-[44px] flex items-center justify-center",
    empty: "bg-white/[0.15] border-white/[0.08]",
    bounceScale: "scale-125",
  },
  // Combat tracker — 12px dot, inline row, no padded hit area.
  compact: {
    dot: "w-3 h-3",
    gap: "gap-1",
    touch: "",
    empty: "bg-transparent border-muted-foreground/30",
    bounceScale: "scale-[1.3]",
  },
};

export function SpellSlotGrid({
  used,
  max,
  variant,
  onToggle,
  density = "comfortable",
  filledClassName = "bg-amber-400 border-amber-400",
  readOnly = false,
  ariaLabel,
  dotAriaLabel,
  inverted = false,
}: SpellSlotGridProps) {
  const [bouncingDot, setBouncingDot] = useState<number | null>(null);
  const d = DENSITY[density];

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

  // transient → filled = remaining/available (legacy bit-identical) OR
  //             filled = used/spent when `inverted` (PRD #37, V2 flag).
  // permanent → filled = acquired (inversion is a no-op).
  const filledCount =
    variant === "transient"
      ? inverted
        ? Math.max(0, Math.min(max, used))
        : Math.max(0, max - used)
      : used;
  const hasTouchPad = d.touch.length > 0;

  return (
    <div
      className={`flex flex-wrap ${d.gap}`}
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length: max }, (_, i) => {
        const isFilled = i < filledCount;
        const label = dotAriaLabel
          ? dotAriaLabel(i, isFilled)
          : `${ariaLabel} ${i + 1}/${max}`;
        const cursor = readOnly
          ? "cursor-default"
          : hasTouchPad
            ? "cursor-pointer"
            : "cursor-pointer hover:opacity-80";
        const bounceClass = bouncingDot === i ? d.bounceScale : "scale-100";
        const dotSpan = (
          <span
            className={`${d.dot} rounded-full border transition-transform duration-200 ${
              isFilled ? filledClassName : d.empty
            } ${bounceClass}`}
          />
        );

        return (
          <button
            key={i}
            type="button"
            role="checkbox"
            aria-checked={isFilled}
            aria-label={label}
            onClick={() => handleToggle(i)}
            disabled={readOnly}
            className={
              hasTouchPad
                ? `${d.touch} ${cursor}`
                : `${d.dot} rounded-full border transition-transform duration-200 ${
                    isFilled ? filledClassName : d.empty
                  } ${bouncingDot === i ? d.bounceScale : ""} ${cursor}`
            }
          >
            {hasTouchPad ? dotSpan : null}
          </button>
        );
      })}
    </div>
  );
}
