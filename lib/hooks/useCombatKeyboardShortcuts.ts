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
  /** Callback to open HP adjuster on focused combatant */
  onOpenHp: () => void;
  /** Callback to open condition selector on focused combatant */
  onOpenConditions: () => void;
  /** Whether the shortcut cheatsheet is shown */
  cheatsheetOpen: boolean;
  /** Toggle cheatsheet visibility */
  onToggleCheatsheet: () => void;
}

/**
 * Keyboard shortcut handler for the DM combat view.
 * Implements the shortcuts defined in the UX spec (NFR25).
 *
 * Space = Next Turn, ↑↓ = Navigate, Enter = Expand, Esc = Close,
 * H = HP Adjuster, C = Conditions, ? = Cheatsheet
 */
export function useCombatKeyboardShortcuts({
  enabled,
  onNextTurn,
  combatantCount,
  onFocusChange,
  focusedIndex,
  onToggleExpand,
  onOpenHp,
  onOpenConditions,
  cheatsheetOpen,
  onToggleCheatsheet,
}: CombatKeyboardShortcutsOptions) {
  const optionsRef = useRef({
    onNextTurn,
    combatantCount,
    onFocusChange,
    focusedIndex,
    onToggleExpand,
    onOpenHp,
    onOpenConditions,
    cheatsheetOpen,
    onToggleCheatsheet,
  });

  optionsRef.current = {
    onNextTurn,
    combatantCount,
    onFocusChange,
    focusedIndex,
    onToggleExpand,
    onOpenHp,
    onOpenConditions,
    cheatsheetOpen,
    onToggleCheatsheet,
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
            const next = opts.focusedIndex <= 0 ? opts.combatantCount - 1 : opts.focusedIndex - 1;
            opts.onFocusChange(next);
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (opts.combatantCount > 0) {
            const next = opts.focusedIndex >= opts.combatantCount - 1 ? 0 : opts.focusedIndex + 1;
            opts.onFocusChange(next);
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

        case "h":
        case "H":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenHp();
          }
          break;

        case "c":
        case "C":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            opts.onOpenConditions();
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
