"use client";

/**
 * SlotSummary — Wave 3a Story C2.
 *
 * Compact spell-slot resume rendered inside `RibbonVivo` (Story C1). One
 * dot per slot, one mini-row per level. Fits inside the 56px desktop
 * ribbon footprint; on mobile it lives inside the expanded "⌄ details"
 * row. Reuses the canonical `<SpellSlotGrid density="compact" />`
 * primitive from EP-0 C0.2 — no new dot rendering logic here.
 *
 * Spec: `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md` §4.3
 * (line 1: "Slots: I●● II●●● III●●●…") + §C2 in
 * `09-implementation-plan.md`.
 *
 * Hidden when:
 *   - `spellSlots == null` (non-caster), OR
 *   - every level has `max === 0` (caster who never set up slots).
 *
 * Read-only on purpose. The main `<SpellSlotsHq>` panel (Coluna B) owns
 * mutation. Mirroring controls in the ribbon would split keyboard focus
 * + double-broadcast on every dot click; the player flicks eyes up to
 * the ribbon to *see* slot state, then clicks Coluna B to consume.
 */

import { SpellSlotGrid } from "@/components/ui/SpellSlotGrid";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

export interface SlotSummaryProps {
  spellSlots: Record<string, { max: number; used: number }> | null;
  /**
   * Optional className passthrough. RibbonVivo applies a flex-wrap row.
   */
  className?: string;
}

/**
 * Roman numerals 1-9 — same lookup `PostCombatBanner.tsx` uses, kept
 * inline here so `SlotSummary` doesn't drag the post-combat module.
 */
const ROMAN: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
};

export function SlotSummary({ spellSlots, className = "" }: SlotSummaryProps) {
  if (!spellSlots) return null;

  const levels = Object.entries(spellSlots)
    .map(([level, v]) => ({ level: Number(level), max: v.max, used: v.used }))
    .filter((s) => s.max > 0)
    .sort((a, b) => a.level - b.level);

  if (levels.length === 0) return null;

  // PRD #37 dot inversion (Sub-zero PR #83) is gated by V2 flag at the
  // call site. SpellSlotsHq (Coluna B) passes `inverted={v2}`; mirroring
  // here keeps both ribbon and panel visually consistent — without this
  // the same slot row would render filled-as-available in the ribbon
  // and filled-as-consumed in the panel below. Surfaced by adversarial
  // review of PR #86 (P1-1).
  const inverted = isPlayerHqV2Enabled();

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      data-testid="slot-summary"
      role="group"
      aria-label="Spell slot summary"
    >
      {levels.map((slot) => (
        <div
          key={slot.level}
          className="flex items-center gap-1"
          data-testid={`slot-summary-level-${slot.level}`}
        >
          <span className="text-[11px] font-semibold text-amber-400 tabular-nums uppercase tracking-wide">
            {ROMAN[slot.level] ?? slot.level}
          </span>
          <SpellSlotGrid
            used={slot.used}
            max={slot.max}
            variant="transient"
            inverted={inverted}
            density="compact"
            filledClassName="bg-amber-400 border-amber-400"
            readOnly
            ariaLabel={
              inverted
                ? `Level ${slot.level} slots: ${slot.used} of ${slot.max} consumed`
                : `Level ${slot.level} slots: ${slot.max - slot.used} of ${slot.max} available`
            }
          />
        </div>
      ))}
    </div>
  );
}
