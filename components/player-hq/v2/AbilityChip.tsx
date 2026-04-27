"use client";

/**
 * AbilityChip — Wave 3b · Story C7 (PRD decisions #44 + #46).
 *
 * Replaces the static ability cell in `CharacterCoreStats` (V2 only — gated
 * by `isPlayerHqV2Enabled()` at the call site) with an interactive 2-zone
 * chip. Each chip surfaces ONE ability score (STR/DEX/CON/INT/WIS/CHA) and
 * exposes two independently-rolled actions:
 *
 *   ┌────────────┐
 *   │   STR      │  ← label (caps, muted)
 *   │   +0       │  ← modifier (large, bold)
 *   │   10       │  ← score (small, muted)
 *   │ ─────────  │
 *   │ CHK   SAVE │  ← 2 buttons (touch ≥44px each via padding)
 *   └────────────┘
 *
 * - **CHECK button** → rolls 1d20 + mod (no prof bonus). Toast with breakdown.
 * - **SAVE button**  → rolls 1d20 + mod (+ profBonus when `proficient`).
 *                       Visual gold accent when proficient (PRD #44).
 * - **Long-press** (≥500ms) on either button → opens advantage/disadvantage
 *   menu. Touch-friendly: works equally on mouse-hold, touch-hold,
 *   keyboard (Shift = adv, Ctrl/Cmd = disadv when activating).
 * - **Hover (desktop)** → faint 🎲 icon appears in each zone (cursor=pointer).
 *
 * ## Combat Parity (CLAUDE.md rule)
 *
 * <!-- parity-intent guest:n/a anon:n/a auth:full -->
 *
 * Auth-only by design. Anonymous players can SEE the chip (legacy markup
 * still renders for them) but the click handlers are no-ops because:
 *   - `clickable` defaults to `false` → buttons render as plain spans.
 *   - `useAbilityRoll` requires `campaignId` + `characterId` to broadcast
 *     and persist; without them it silently degrades to noop.
 *
 * ## Accessibility
 *
 * - Each clickable zone is a real `<button>` with `aria-label` describing
 *   the roll ("Roll STR check, modifier +2") so screen readers announce
 *   intent before activation.
 * - Touch target uses `min-h-[44px] min-w-[44px]` per WCAG SC 2.5.5.
 * - The advantage menu is keyboard-navigable (arrow keys + Enter/Esc) via
 *   the native `<select>`-shaped role on each option.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Dices } from "lucide-react";
import {
  useAbilityRoll,
  type UseAbilityRollOptions,
} from "@/lib/hooks/useAbilityRoll";
import {
  showRollResultToast,
  DEFAULT_ROLL_TOAST_LABELS,
  type RollToastLabels,
} from "@/components/player-hq/v2/RollResultToast";
import { Dot } from "@/components/ui/Dot";
import type { Ability, RollMode } from "@/lib/utils/dice-roller";

/** Threshold in ms for long-press detection. 500ms is the iOS native value. */
const LONG_PRESS_MS = 500;

/**
 * Localized strings the chip uses for aria-labels + the long-press menu.
 * Caller threads these in from `useTranslations('player_hq.ability_chip')`
 * so the entire chip respects the active locale (decision #44 cleanup).
 */
export interface ChipLabels {
  /** "Roll" verb (EN) / "Jogar" (PT-BR). Used in aria-label prefix. */
  rollVerb: string;
  /** "check" suffix in aria-label (EN) / "teste" (PT-BR). */
  checkAriaSuffix: string;
  /** "saving throw" suffix in aria-label (EN) / "salvamento" (PT-BR). */
  saveAriaSuffix: string;
  /** "with proficiency" clause (EN) / "com proficiência" (PT-BR). */
  withProficiency: string;
  /** "modifier" word in aria-label (EN) / "modificador" (PT-BR). */
  modifierLabel: string;
  /** Long-press menu — "Advantage" option label. */
  advantage: string;
  /** Long-press menu — "Disadvantage" option label. */
  disadvantage: string;
  /** Long-press menu — "Normal" option label. */
  normal: string;
  /** Long-press menu — "Manual modifier" option label. */
  manualModifierMenu: string;
  /** Manual modifier input — field label (e.g. "Manual modifier"). */
  manualModifierLabel: string;
  /** Manual modifier input — apply button. */
  manualModifierApply: string;
  /** Manual modifier input — cancel button. */
  manualModifierCancel: string;
  /** Manual modifier input — accessible label for the number field. */
  manualModifierInputAria: string;
  /** Aria-label for the proficiency dot. */
  saveProficientAria: string;
}

/** Default labels (EN). Used when no `chipLabels` prop is threaded in. */
export const DEFAULT_CHIP_LABELS: ChipLabels = {
  rollVerb: "Roll",
  checkAriaSuffix: "check",
  saveAriaSuffix: "saving throw",
  withProficiency: "with proficiency",
  modifierLabel: "modifier",
  advantage: "Advantage",
  disadvantage: "Disadvantage",
  normal: "Normal",
  manualModifierMenu: "Manual modifier",
  manualModifierLabel: "Manual modifier",
  manualModifierApply: "Apply",
  manualModifierCancel: "Cancel",
  manualModifierInputAria: "Manual modifier value (e.g. +3 for Bless)",
  saveProficientAria: "Proficient in this saving throw",
};

/** Public props — locked surface; future Wave 3b additions extend this. */
export interface AbilityChipProps {
  /** Ability key (str/dex/con/int/wis/cha). */
  ability: Ability;
  /** UI label for the attribute (e.g. "STR"). EN-only across locales. */
  label: string;
  /** Raw ability score (e.g. 14). Null when unfilled — chip renders "—". */
  score: number | null;
  /** Whether this character is proficient in this ability's saving throw. */
  proficient: boolean;
  /** Whether the chip's roll buttons should be active. False = static legacy render. */
  clickable: boolean;
  /** Roll-context props passed straight to `useAbilityRoll`. */
  rollContext: UseAbilityRollOptions;
  /** Optional localized labels for the toast. Defaults to EN. */
  toastLabels?: RollToastLabels;
  /** Optional localized labels for aria + menu. Defaults to EN. */
  chipLabels?: ChipLabels;
}

/** Compute the D&D 5e modifier from a score. */
function modifierOf(score: number | null): number | null {
  if (score == null) return null;
  return Math.floor((score - 10) / 2);
}

/** Format a modifier as `+N` / `-N`, or `—` when null. */
function formatModifier(mod: number | null): string {
  if (mod == null) return "—";
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Detect whether the current event activation should request advantage or
 * disadvantage. Mouse + touch path uses the long-press timer (separate
 * code path). Keyboard activation looks at modifier keys.
 *
 * Accepts any event type that exposes the four modifier-key booleans —
 * KeyboardEvent, MouseEvent, and TouchEvent (and their React synthetics)
 * all carry these as optional booleans.
 */
function modeFromKeyboard(
  e: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
): RollMode {
  // Shift = advantage, Alt/Ctrl/Meta = disadvantage. Mirrors the convention
  // used by Roll20 / Foundry. Mouse buttons hold the same modifier behavior
  // so power-users on desktop don't have to context-menu every time.
  if (e.shiftKey) return "advantage";
  if (e.altKey || e.ctrlKey || e.metaKey) return "disadvantage";
  return "normal";
}

/**
 * Hook abstraction for long-press detection. Returns event handlers that
 * the caller spreads onto the button. The `onLongPress` callback fires
 * after `LONG_PRESS_MS` of continuous press; the `onTap` callback fires
 * if the press releases before the long-press threshold.
 *
 * Uses native MouseEvent + TouchEvent handlers rather than PointerEvent
 * so jsdom (used by Jest) can dispatch them reliably — `fireEvent.pointerDown`
 * in jsdom 25 + React 19 does not always trigger React's `onPointerDown`
 * synthetic handler. Mouse + touch coverage is the same hit-testing surface
 * for our use-case (left-click + tap-and-hold).
 *
 * Why not extract to its own file? It's ~50 LOC, single-call-site, and
 * lifting it would add an import for marginal reuse. If a second long-
 * press surface lands later, this gets promoted to `lib/hooks/`.
 */
function useLongPress(args: { onTap: (e: React.MouseEvent | React.TouchEvent) => void; onLongPress: () => void; disabled: boolean }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  // Tracks whether the current down-event sequence was accepted (left
  // button + not disabled). Without this flag, a right-click mouseDown
  // would silently bail in onMouseDown but the onMouseUp would still
  // fire onTap because longPressFiredRef stays false. Net result: any
  // right-click on the chip would roll. Tracked here per gesture so the
  // mouseUp can no-op cleanly.
  const acceptedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount — avoid stale timer firing into a dead handler.
  useEffect(() => () => cancel(), [cancel]);

  const startPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent, button: number) => {
      if (args.disabled) {
        acceptedRef.current = false;
        return;
      }
      // Right-click and middle-click should not trigger the chip — they
      // open the browser context menu / scroll. Mouse button === 0 is
      // primary (left mouse / single touch). Touch events use button=0
      // by default since they only have one "button".
      if (button !== 0) {
        acceptedRef.current = false;
        return;
      }
      acceptedRef.current = true;
      longPressFiredRef.current = false;
      cancel();
      timerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        args.onLongPress();
      }, LONG_PRESS_MS);
      // Suppress text selection on long-press; browsers default-select
      // when the user holds for >300ms.
      if ("preventDefault" in e && typeof e.preventDefault === "function") {
        e.preventDefault();
      }
    },
    [args, cancel],
  );

  const endPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (args.disabled) return;
      cancel();
      // Only fire the tap if the matching down-event was accepted
      // (avoids firing on right-click release whose down bailed).
      if (!acceptedRef.current) return;
      acceptedRef.current = false;
      if (!longPressFiredRef.current) {
        args.onTap(e);
      }
    },
    [args, cancel],
  );

  const cancelPress = useCallback(() => {
    cancel();
    acceptedRef.current = false;
  }, [cancel]);

  return {
    onMouseDown: (e: React.MouseEvent) => startPress(e, e.button),
    onMouseUp: (e: React.MouseEvent) => endPress(e),
    onMouseLeave: cancelPress,
    onTouchStart: (e: React.TouchEvent) => startPress(e, 0),
    onTouchEnd: (e: React.TouchEvent) => endPress(e),
    onTouchCancel: cancelPress,
  };
}

/**
 * Inline advantage/disadvantage menu shown after a long-press. Renders as
 * an absolutely-positioned popover anchored to the chip. Outside-click and
 * Esc dismiss the menu. Three roll-mode options + a "Manual modifier"
 * option that swaps the menu body for a numeric input (Bless +1d4 average,
 * Bardic Inspiration, etc.).
 */
function RollModeMenu({
  open,
  onPick,
  onPickManualModifier,
  onClose,
  labels,
}: {
  open: boolean;
  onPick: (mode: RollMode) => void;
  /** Fired when the user confirms a manual modifier — value is signed integer. */
  onPickManualModifier: (extra: number) => void;
  onClose: () => void;
  labels: ChipLabels;
}) {
  // Outside-click dismiss. We capture on document so any pointer event
  // outside the menu (which we render here) closes it.
  const menuRef = useRef<HTMLDivElement>(null);
  // Two-step UI: list view → input view. Keeping this in component-local
  // state keeps the main chip component free of menu-internal concerns.
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open, onClose]);

  // Reset internal state every time the menu re-opens so a previously
  // opened "manual input" view doesn't leak into the next long-press.
  useEffect(() => {
    if (!open) {
      setShowManualInput(false);
      setManualValue("");
    }
  }, [open]);

  if (!open) return null;

  const applyManual = () => {
    // Empty / invalid input → silently no-op (user can press Cancel or Esc).
    const trimmed = manualValue.trim();
    if (trimmed === "" || trimmed === "+" || trimmed === "-") return;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) return;
    onPickManualModifier(parsed);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Roll mode"
      data-testid="ability-chip-roll-mode-menu"
      // `top-full` anchors the popover to the BOTTOM edge of the action grid
      // (its closest positioned ancestor). Without `top-full`, Tailwind's
      // `absolute` defaults to `top: 0` which placed the menu directly on top
      // of CHK / SAVE — covering the buttons that just opened it.
      className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[180px]"
    >
      {showManualInput ? (
        // ── Manual modifier input view ────────────────────────────────
        // Visible label + numeric input + Apply/Cancel pair. We keep the
        // input native `<input type="number">` for mobile keyboard support;
        // mode aside, players ARE entering numbers (typically -5..+10 range).
        <div
          className="px-3 py-2 space-y-2"
          data-testid="ability-chip-manual-modifier-form"
        >
          <label
            className="block text-[10px] uppercase tracking-wider text-muted-foreground"
            htmlFor="ability-chip-manual-input"
          >
            {labels.manualModifierLabel}
          </label>
          <input
            id="ability-chip-manual-input"
            data-testid="ability-chip-manual-modifier-input"
            type="number"
            inputMode="numeric"
            // Bless +1d4 average is +3; Bardic Inspiration d6 is +4; bigger
            // bonuses (Bless + Guidance) cap around +10. Native min/max are
            // hints — we do not hard-clamp because edge cases exist.
            min={-10}
            max={20}
            step={1}
            autoFocus
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyManual();
              }
            }}
            placeholder="+3"
            aria-label={labels.manualModifierInputAria}
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="ability-chip-manual-modifier-apply"
              onClick={applyManual}
              className="flex-1 px-2 py-1.5 text-xs font-semibold rounded bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 transition-colors min-h-[36px]"
            >
              {labels.manualModifierApply}
            </button>
            <button
              type="button"
              data-testid="ability-chip-manual-modifier-cancel"
              onClick={() => {
                setShowManualInput(false);
                setManualValue("");
              }}
              className="flex-1 px-2 py-1.5 text-xs rounded bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[36px]"
            >
              {labels.manualModifierCancel}
            </button>
          </div>
        </div>
      ) : (
        // ── Default mode list view ────────────────────────────────────
        <>
          <button
            type="button"
            role="menuitem"
            data-testid="ability-chip-mode-advantage"
            onClick={() => {
              onPick("advantage");
              onClose();
            }}
            className="block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px]"
          >
            {labels.advantage}
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="ability-chip-mode-disadvantage"
            onClick={() => {
              onPick("disadvantage");
              onClose();
            }}
            className="block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px]"
          >
            {labels.disadvantage}
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="ability-chip-mode-normal"
            onClick={() => {
              onPick("normal");
              onClose();
            }}
            className="block w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px]"
          >
            {labels.normal}
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="ability-chip-mode-manual-modifier"
            onClick={() => setShowManualInput(true)}
            className="block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px] border-t border-border/60"
          >
            {labels.manualModifierMenu}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The chip itself. Composes:
 *   - Top zone (label / mod / score) — purely visual, never clickable.
 *   - Bottom zone — split horizontally into CHECK button + SAVE button.
 *
 * When `clickable=false` the bottom zone is omitted entirely so the
 * legacy chip layout is preserved for guest/anon contexts (which still
 * render this component for visual parity).
 */
export function AbilityChip({
  ability,
  label,
  score,
  proficient,
  clickable,
  rollContext,
  toastLabels = DEFAULT_ROLL_TOAST_LABELS,
  chipLabels = DEFAULT_CHIP_LABELS,
}: AbilityChipProps): React.ReactElement {
  const mod = modifierOf(score);
  const modStr = formatModifier(mod);
  const { rollCheck, rollSave } = useAbilityRoll(rollContext);

  // Track which button (if any) is showing the long-press menu. Storing as
  // a string discriminator lets us anchor a single menu render to the
  // correct button without bookkeeping two boolean states.
  const [menuFor, setMenuFor] = useState<"check" | "save" | null>(null);

  const closeMenu = useCallback(() => setMenuFor(null), []);

  /**
   * Perform a roll. The `extraModifier` argument lets the caller add a
   * one-shot bonus on top of the ability modifier (Bless +1d4 average,
   * Bardic Inspiration, etc.). It is summed into `abilityMod` BEFORE the
   * hook is called so the toast / broadcast / history all naturally show
   * the combined modifier — no plumbing change to `useAbilityRoll`.
   */
  const performRoll = useCallback(
    (rollType: "check" | "save", mode: RollMode, extraModifier = 0) => {
      if (mod == null) return; // can't roll an unfilled ability
      const adjusted = mod + extraModifier;
      const result =
        rollType === "check"
          ? rollCheck({ ability, abilityMod: adjusted, mode })
          : rollSave({ ability, abilityMod: adjusted, proficient, mode });
      showRollResultToast(result, toastLabels);
    },
    [ability, mod, proficient, rollCheck, rollSave, toastLabels],
  );

  // ── Long-press wiring per zone ────────────────────────────────────
  const checkPress = useLongPress({
    disabled: !clickable || mod == null,
    onTap: (e) => performRoll("check", modeFromKeyboard(e)),
    onLongPress: () => setMenuFor("check"),
  });
  const savePress = useLongPress({
    disabled: !clickable || mod == null,
    onTap: (e) => performRoll("save", modeFromKeyboard(e)),
    onLongPress: () => setMenuFor("save"),
  });

  // ── Keyboard activation (Enter / Space) ───────────────────────────
  const onCheckKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!clickable || mod == null) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        performRoll("check", modeFromKeyboard(e));
      }
    },
    [clickable, mod, performRoll],
  );
  const onSaveKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!clickable || mod == null) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        performRoll("save", modeFromKeyboard(e));
      }
    },
    [clickable, mod, performRoll],
  );

  // Aria labels — keep verbose so screen readers announce intent before activation.
  // Uses `chipLabels` so PT-BR readers hear "Jogar STR teste, modificador +2"
  // instead of the previously-hardcoded EN string.
  const checkAriaLabel = `${chipLabels.rollVerb} ${label} ${chipLabels.checkAriaSuffix}, ${chipLabels.modifierLabel} ${modStr}`;
  const saveAriaLabel = proficient
    ? `${chipLabels.rollVerb} ${label} ${chipLabels.saveAriaSuffix} ${chipLabels.withProficiency}, ${chipLabels.modifierLabel} ${modStr}`
    : `${chipLabels.rollVerb} ${label} ${chipLabels.saveAriaSuffix}, ${chipLabels.modifierLabel} ${modStr}`;

  return (
    <div
      className="relative bg-card border border-border rounded-lg overflow-hidden flex flex-col"
      data-testid={`ability-chip-${ability}`}
      data-ability={ability}
      data-proficient={proficient}
    >
      {/* Top zone: label + mod + score (purely visual) */}
      <div className="px-2 pt-2 pb-1 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight">
          {modStr}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {score ?? "—"}
        </p>
      </div>

      {/* Divider — only when the action zone renders */}
      {clickable && mod != null && (
        <div className="border-t border-border/60" aria-hidden="true" />
      )}

      {/* Bottom zone: CHECK + SAVE buttons. Touch targets ≥44px tall. */}
      {clickable && mod != null && (
        <div className="grid grid-cols-2 divide-x divide-border/60 relative">
          {/* CHECK button */}
          <button
            type="button"
            data-testid={`ability-chip-${ability}-check`}
            data-action="check"
            aria-label={checkAriaLabel}
            onKeyDown={onCheckKey}
            onMouseDown={checkPress.onMouseDown}
            onMouseUp={checkPress.onMouseUp}
            onMouseLeave={checkPress.onMouseLeave}
            onTouchStart={checkPress.onTouchStart}
            onTouchEnd={checkPress.onTouchEnd}
            onTouchCancel={checkPress.onTouchCancel}
            // Block native context menu so long-press on touch doesn't fire it
            onContextMenu={(e) => e.preventDefault()}
            className="group relative min-h-[44px] flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:bg-foreground/[0.04]"
          >
            <span className="relative z-[1]">CHK</span>
            <Dices
              className="absolute right-1.5 w-3 h-3 text-amber-400/0 group-hover:text-amber-400/60 group-focus:text-amber-400/60 transition-colors pointer-events-none"
              aria-hidden="true"
            />
          </button>

          {/* SAVE button — gold accent when proficient (decision #46) */}
          <button
            type="button"
            data-testid={`ability-chip-${ability}-save`}
            data-action="save"
            data-proficient={proficient}
            aria-label={saveAriaLabel}
            onKeyDown={onSaveKey}
            onMouseDown={savePress.onMouseDown}
            onMouseUp={savePress.onMouseUp}
            onMouseLeave={savePress.onMouseLeave}
            onTouchStart={savePress.onTouchStart}
            onTouchEnd={savePress.onTouchEnd}
            onTouchCancel={savePress.onTouchCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`group relative min-h-[44px] flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${
              proficient
                ? "text-amber-300 bg-amber-400/10 hover:bg-amber-400/15 focus:bg-amber-400/15"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] focus:bg-foreground/[0.04]"
            }`}
          >
            <span className="relative z-[1] flex items-center gap-1">
              {proficient && (
                // Save proficiency = "permanent" semantic per PRD #37
                // (○ = do not have, ● = have). Dot 'sm' renders at w-2.5 h-2.5
                // (~10px); the legacy hand-rolled span was w-1.5 h-1.5 (~6px).
                // We accept the +4px diameter delta to consolidate on the
                // primitive — visually still a small accent and the gold
                // bg keeps it from competing with the SAVE label.
                <span
                  data-testid={`ability-chip-${ability}-prof-dot`}
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <Dot
                    filled={true}
                    variant="permanent"
                    size="sm"
                    ariaLabel={chipLabels.saveProficientAria}
                    filledClassName="bg-amber-400 border-amber-400"
                  />
                </span>
              )}
              SAVE
            </span>
            <Dices
              className="absolute right-1.5 w-3 h-3 text-amber-400/0 group-hover:text-amber-400/60 group-focus:text-amber-400/60 transition-colors pointer-events-none"
              aria-hidden="true"
            />
          </button>

          {/* Long-press menu — anchored to the chip, positioned via CSS */}
          {menuFor !== null && (
            <RollModeMenu
              open={true}
              onClose={closeMenu}
              onPick={(mode) => performRoll(menuFor, mode)}
              onPickManualModifier={(extra) =>
                // Manual modifier always rolls in normal mode — adv/disadv
                // is a separate axis; if a player wanted both they'd long-
                // press again. Keeps the UX flat without a 4th step.
                performRoll(menuFor, "normal", extra)
              }
              labels={chipLabels}
            />
          )}
        </div>
      )}
    </div>
  );
}
