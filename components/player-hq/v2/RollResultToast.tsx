"use client";

/**
 * RollResultToast — Wave 3b · Story C7.
 *
 * Visual + show helper for the toast that surfaces an `AbilityRollResult`
 * after the user clicks a CHECK or SAVE zone in `AbilityChip`. Built on
 * `sonner.toast.custom()` so we own the entire visual (gold accents, dice
 * icon, formula breakdown) — `toast.success/info` would force the default
 * lucide icon + theme padding which doesn't match the chip surface.
 *
 * ## Why a separate file?
 *
 * 1. The chip itself is already long (renders 6 instances per character);
 *    isolating the toast keeps each file scannable.
 * 2. Future surfaces (skill rolls in `ProficienciesSection`, initiative
 *    re-rolls, attack rolls) will reuse `showRollResultToast()` verbatim
 *    once they migrate from the legacy alert toasts.
 * 3. Snapshot tests can target the markup without spinning up the chip
 *    keyboard wiring.
 *
 * ## i18n
 *
 * Labels come from the existing `player_hq.sheet` namespace (`STR/DEX/...`
 * already canonical EN-only per the HP-tier rule and Vocab Ubíquo addendum:
 * ability codes are abbreviations, not translations). The action verb
 * ("check"/"save") is rendered in the user's locale via the same hook the
 * chip uses — translation fallback is the EN string.
 */

import { Dices } from "lucide-react";
import { toast } from "sonner";
import type { AbilityRollResult } from "@/lib/utils/dice-roller";

/** Shape of the i18n strings the toast needs. Caller provides them. */
export interface RollToastLabels {
  /** "check" verb — e.g. "Check" (EN) / "Teste" (PT-BR). */
  checkLabel: string;
  /** "save" verb — e.g. "Save" (EN) / "Salvação" (PT-BR). */
  saveLabel: string;
  /** "with advantage" suffix (only shown for adv mode). */
  advantageLabel: string;
  /** "with disadvantage" suffix (only shown for disadv mode). */
  disadvantageLabel: string;
}

/** Default labels (EN). Caller can pass a localized variant. */
export const DEFAULT_ROLL_TOAST_LABELS: RollToastLabels = {
  checkLabel: "check",
  saveLabel: "save",
  advantageLabel: "with advantage",
  disadvantageLabel: "with disadvantage",
};

/** Map ability key to the canonical 3-letter abbreviation displayed in toasts. */
const ABILITY_LABEL_MAP: Record<AbilityRollResult["ability"], string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

/**
 * Renders the toast body. Exported so unit tests can assert the visual
 * structure without importing sonner. The component is purely visual — it
 * does not own dismiss state (sonner handles that).
 */
export function RollResultToastContent({
  result,
  labels,
}: {
  result: AbilityRollResult;
  labels: RollToastLabels;
}): React.ReactElement {
  const abilityCode = ABILITY_LABEL_MAP[result.ability];
  const verb = result.rollType === "check" ? labels.checkLabel : labels.saveLabel;
  const modeSuffix =
    result.mode === "advantage"
      ? ` · ${labels.advantageLabel}`
      : result.mode === "disadvantage"
        ? ` · ${labels.disadvantageLabel}`
        : "";

  // Render kept-die value (highlighted) + dropped die (struck through) for
  // adv/disadv. Normal mode renders just the single roll.
  const renderRolls = () => {
    if (result.rolls.length === 1) {
      return (
        <span className="font-mono tabular-nums">{result.rolls[0]}</span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        {result.rolls.map((r, idx) => {
          const isKept = idx === result.keptIndex;
          return (
            <span
              key={idx}
              className={
                isKept
                  ? "font-mono tabular-nums text-foreground"
                  : "font-mono tabular-nums text-muted-foreground line-through opacity-60"
              }
            >
              {r}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div
      data-testid="ability-roll-toast"
      data-roll-type={result.rollType}
      data-roll-ability={result.ability}
      className="flex items-start gap-3 min-w-[260px] max-w-sm"
    >
      <Dices
        className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          <span data-testid="ability-roll-toast-headline">
            {abilityCode} {verb}: <span className="text-amber-400 tabular-nums" data-testid="ability-roll-toast-total">{result.total}</span>
          </span>
        </p>
        <p
          className="text-xs text-muted-foreground leading-snug"
          data-testid="ability-roll-toast-detail"
        >
          {renderRolls()}
          {result.modifier !== 0 && (
            <span className="font-mono tabular-nums">
              {result.modifier >= 0 ? ` + ${result.modifier}` : ` - ${Math.abs(result.modifier)}`}
            </span>
          )}
          {result.proficient && result.rollType === "save" && (
            <span className="ml-1 text-amber-400/80">(prof)</span>
          )}
          {modeSuffix}
        </p>
      </div>
    </div>
  );
}

/**
 * Show the toast. The toast is informational — auto-dismissed after 4s
 * (sonner default sufficient; long enough to read but not block the
 * combat HUD). Returned id can be used to dismiss programmatically (e.g.
 * if the player rolls again immediately, the previous toast is replaced
 * to keep the screen calm).
 */
export function showRollResultToast(
  result: AbilityRollResult,
  labels: RollToastLabels = DEFAULT_ROLL_TOAST_LABELS,
): string | number {
  return toast.custom(
    () => <RollResultToastContent result={result} labels={labels} />,
    {
      // Slightly longer than the sonner default (4s) so casters who chain
      // 2 rolls back-to-back can still glance at the previous result.
      duration: 4500,
    },
  );
}

/** Test-only helper for snapshot suites that don't want to import sonner. */
export const __test__ = {
  ABILITY_LABEL_MAP,
};
