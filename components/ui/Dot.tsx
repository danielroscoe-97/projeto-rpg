"use client";

/**
 * Dot — EP-0 C0.3 consolidation primitive.
 *
 * Dumb render primitive for the round dot pattern used across Player HQ,
 * combat, and compendium surfaces. Extracted from multiple call sites
 * that each hand-rolled a `<button className="w-X h-X rounded-full border …">`
 * with slight variations.
 *
 * ## Semantic contract (PRD decision #37)
 *
 * - **`variant="permanent"`** — ○ empty = do NOT have, ● filled = have.
 *   Example domains: proficiency acquired, feat taken, language known.
 * - **`variant="transient"`** — ○ empty = available, ● filled = used/spent.
 *   Example domains: spell slot consumed, reaction used, legendary action
 *   spent.
 *
 * This primitive is **intentionally dumb**: it renders whatever the caller
 * tells it to render via the `filled` boolean. The primitive does NOT
 * compute `filled` from game state; callers are responsible for mapping
 * their domain value to the correct boolean for their current semantic.
 *
 * ### Why does this matter?
 *
 * Today, `ResourceDots` (transient) renders `● = available` (legacy /
 * pre-inversion behavior) and `CombatantRow` reaction (transient) renders
 * `● = used` (already post-inversion). Both are considered "transient",
 * but their visual representation disagrees today. The dot inversion
 * rollout (PRD decision #37, Sprint 5) brings every transient caller in
 * line with `● = used` behind the `NEXT_PUBLIC_PLAYER_HQ_V2` flag.
 *
 * By shipping this primitive as a **dumb renderer** now, the later
 * semantic flip only touches the `filled={}` expressions at each call
 * site — not 5 parallel hand-rolled buttons. The `variant` prop is there
 * to document intent at the call site and to hang data-attributes for
 * future visual regression + analytics hooks; it does not alter behavior.
 *
 * ## What this primitive does NOT do
 *
 * - Does not flip `filled` by variant. `<Dot filled={true} variant="x" />`
 *   always renders the filled visual, regardless of variant.
 * - Does not impose a palette. The caller passes `filledClassName` /
 *   `emptyClassName` when the surface has a specific color. Defaults are
 *   the Player HQ amber + subtle-white pair — safe for the common case.
 * - Does not render text, icons, or badges inside the dot. If a surface
 *   needs an icon, wrap this primitive or roll a richer component.
 */

import { forwardRef } from "react";

/**
 * See the module-level comment. Each variant documents its semantic so
 * call-site readers do not have to cross-reference the PRD.
 */
export type DotVariant = "permanent" | "transient";

export type DotSize = "sm" | "md" | "lg";

export interface DotProps {
  /**
   * Visual state. Call sites map their domain value to this boolean.
   * Today the mapping can legitimately differ by call site (see "Why
   * does this matter?" in the module comment). After the Sprint 5 dot
   * inversion, transient callers will converge on `filled = used`.
   */
  filled: boolean;
  /**
   * Documentation + analytics hook. See {@link DotVariant}.
   */
  variant: DotVariant;
  /** Defaults to `md` (the HQ default). */
  size?: DotSize;
  /**
   * Click handler. When omitted the dot renders as a non-interactive
   * `<span>`; when provided it renders as a `<button role="checkbox">`
   * with `aria-checked={filled}`.
   */
  onClick?: () => void;
  /**
   * Accessible label. Required — tier-status-style primitives without
   * labels make screen-reader output meaningless.
   */
  ariaLabel: string;
  /** Optional Tailwind classes for the filled state (bg + border). */
  filledClassName?: string;
  /** Optional Tailwind classes for the empty state (bg + border). */
  emptyClassName?: string;
  /** Optional disabled flag. Only meaningful when `onClick` is set. */
  disabled?: boolean;
  /** Escape hatch for callers that need extra wrapper classes. */
  className?: string;
}

/**
 * Sizes mirror `components/player-hq/ResourceDots.tsx` (the oldest caller)
 * to keep visual parity during the EP-0 migration. When new surfaces need
 * a different dot diameter they should pass `className` (e.g.
 * `className="w-3 h-3"`) rather than teaching the primitive a new size —
 * the size enum is deliberately small to discourage visual drift.
 */
const SIZE_CLASS: Record<DotSize, string> = {
  sm: "w-2.5 h-2.5",
  md: "w-3.5 h-3.5",
  lg: "w-5 h-5",
};

const DEFAULT_FILLED = "bg-amber-400 border-amber-400";
const DEFAULT_EMPTY = "bg-white/[0.15] border-white/[0.08]";

/**
 * Round dot primitive. See module-level comment for the full contract.
 */
export const Dot = forwardRef<HTMLButtonElement | HTMLSpanElement, DotProps>(
  function Dot(
    {
      filled,
      variant,
      size = "md",
      onClick,
      ariaLabel,
      filledClassName = DEFAULT_FILLED,
      emptyClassName = DEFAULT_EMPTY,
      disabled = false,
      className = "",
    },
    ref
  ) {
    const stateClass = filled ? filledClassName : emptyClassName;
    const baseClass = `${SIZE_CLASS[size]} rounded-full border transition-colors ${stateClass} ${className}`.trim();

    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          role="checkbox"
          aria-checked={filled}
          aria-label={ariaLabel}
          data-variant={variant}
          onClick={onClick}
          disabled={disabled}
          className={`${baseClass} ${disabled ? "cursor-default" : "cursor-pointer"}`}
        />
      );
    }

    // Non-interactive mode: render a purely decorative span. The caller is
    // expected to own the accessible label on its parent element (usually a
    // role="checkbox" button that wraps the dot for 44×44 hit area). We keep
    // `aria-label` as a fallback attribute but leave `role` unset so screen
    // readers do not double-announce when the parent already carries state.
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        aria-label={ariaLabel}
        data-variant={variant}
        className={baseClass}
      />
    );
  }
);
