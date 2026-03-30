"use client";

import { useEffect, useRef, useCallback } from "react";

interface CombatKeyboardShortcutsOptions {
  /** Whether combat is active (shortcuts only work during active combat) */
  enabled: boolean;
  /** Advance to the next turn */
  onNextTurn: () => void;
  /** Number of combatants (for index bounds) */
  combatantCount: number;
  /** Callback when focused combatant changes — receives index */
  onFocusChange: (index: number) => void;
  /** Current focused combatant index */
  focusedIndex: number;
  /** Callback to toggle expand/collapse on focused combatant */
  onToggleExpand: () => void;
  /** Callback to open HP adjuster on focused combatant in damage mode */
  onOpenHpDamage: () => void;
  /** Callback to open HP adjuster on focused combatant in heal mode */
  onOpenHpHeal: () => void;
  /** Callback to open condition selector on focused combatant */
  onOpenConditions: () => void;
  /** Whether the shortcut cheatsheet is shown */
  cheatsheetOpen: boolean;
  /** Toggle cheatsheet visibility */
  onToggleCheatsheet: () => void;
  /** Callback to undo last combat action */
  onUndo?: () => void;
  /** @deprecated Use onUndo instead */
  onUndoHp?: () => void;
  /** Callback to reorder the focused combatant — receives (fromIndex, toIndex) */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Toggle combat action log */
  onToggleCombatLog?: () => void;
  /** Toggle advantage mode */
  onToggleAdvantage?: () => void;
  /** Toggle disadvantage mode */
  onToggleDisadvantage?: () => void;
  /** Toggle concentration on focused combatant */
  onToggleConcentration?: () => void;
}

/**
 * Keyboard shortcut handler for the DM combat view.
 * Implements the shortcuts defined in the UX spec (NFR25).
 *
 * Space = Next Turn, ↑↓ = Navigate, Enter = Expand, Esc = Close,
 * D = HP Adjuster (damage), H = HP Adjuster (heal), C = Conditions,
 * Ctrl+Z = Undo HP, ? = Cheatsheet
 */
export function useCombatKeyboardShortcuts({
  enabled,
  onNextTurn,
  combatantCount,
  onFocusChange,
  focusedIndex,
  onToggleExpand,
  onOpenHpDamage,
  onOpenHpHeal,
  onOpenConditions,
  cheatsheetOpen,
  onToggleCheatsheet,
  onUndo,
  onUndoHp,
  onReorder,
  onToggleCombatLog,
  onToggleAdvantage,
  onToggleDisadvantage,
  onToggleConcentration,
}: CombatKeyboardShortcutsOptions) {
  const optionsRef = useRef({
    onNextTurn,
    combatantCount,
    onFocusChange,
    focusedIndex,
    onToggleExpand,
    onOpenHpDamage,
    onOpenHpHeal,
    onOpenConditions,
    cheatsheetOpen,
    onToggleCheatsheet,
    onUndo,
    onUndoHp,
    onReorder,
    onToggleCombatLog,
    onToggleAdvantage,
    onToggleDisadvantage,
    onToggleConcentration,
  });

  optionsRef.current = {
    onNextTurn,
    combatantCount,
    onFocusChange,
    focusedIndex,
    onToggleExpand,
    onOpenHpDamage,
    onOpenHpHeal,
    onOpenConditions,
    cheatsheetOpen,
    onToggleCheatsheet,
    onUndo,
    onUndoHp,
    onReorder,
    onToggleCombatLog,
    onToggleAdvantage,
    onToggleDisadvantage,
    onToggleConcentration,
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in an input, textarea, or when modals/palette are open
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.closest("[role='dialog']") ||
        target.closest("[cmdk-root]")
      ) {
        return;
      }

      const opts = optionsRef.current;

      // Ctrl+Z = Undo last action (works even when cheatsheet is open)
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        // Prefer onUndo (unified), fall back to deprecated onUndoHp
        (opts.onUndo ?? opts.onUndoHp)?.();
        return;
      }

      // Don't process combat shortcuts while the cheatsheet is open (except Escape to close it)
      if (opts.cheatsheetOpen && e.key !== "Escape") return;

      switch (e.key) {
        case " ": // Space = Next Turn
          e.preventDefault();
          opts.onNextTurn();
          break;

        case "ArrowUp":
          e.preventDefault();
          if (opts.combatantCount > 0) {
            if (e.ctrlKey && opts.onReorder && opts.focusedIndex > 0) {
              opts.onReorder(opts.focusedIndex, opts.focusedIndex - 1);
              opts.onFocusChange(opts.focusedIndex - 1);
            } else if (!e.ctrlKey) {
              const next = opts.focusedIndex <= 0 ? opts.combatantCount - 1 : opts.focusedIndex - 1;
              opts.onFocusChange(next);
            }
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (opts.combatantCount > 0) {
            if (e.ctrlKey && opts.onReorder && opts.focusedIndex < opts.combatantCount - 1) {
              opts.onReorder(opts.focusedIndex, opts.focusedIndex + 1);
              opts.onFocusChange(opts.focusedIndex + 1);
            } else if (!e.ctrlKey) {
              const next = opts.focusedIndex >= opts.combatantCount - 1 ? 0 : opts.focusedIndex + 1;
              opts.onFocusChange(next);
            }
          }
          break;

        case "Enter":
          e.preventDefault();
          opts.onToggleExpand();
          break;

        case "Escape":
          if (opts.cheatsheetOpen) {
            e.preventDefault();
            opts.onToggleCheatsheet();
          }
          break;

        case "d":
        case "D":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenHpDamage();
          }
          break;

        case "h":
        case "H":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenHpHeal();
          }
          break;

        case "c":
        case "C":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenConditions();
          }
          break;

        case "l":
        case "L":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onToggleCombatLog?.();
          }
          break;

        case "a":
        case "A":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onToggleAdvantage?.();
          }
          break;

        case "s":
        case "S":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onToggleDisadvantage?.();
          }
          break;

        case "x":
        case "X":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onToggleConcentration?.();
          }
          break;

        case "+":
        case "=": // unshifted = key on most keyboards maps to "=" but user may press Shift+= for "+"
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenHpHeal();
          }
          break;

        case "-":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenHpDamage();
          }
          break;

        case "?":
          e.preventDefault();
          opts.onToggleCheatsheet();
          break;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}
