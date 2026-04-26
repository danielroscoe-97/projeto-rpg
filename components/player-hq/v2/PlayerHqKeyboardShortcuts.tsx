"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyboardHelpOverlay } from "./KeyboardHelpOverlay";

/**
 * Global keyboard shortcuts for the V2 Player HQ shell (Sprint 3 Track
 * A · Story B5). Mounted by `PlayerHqShellV2` and ONLY by it — flag-
 * gated indirectly through that mount path. Track A ships the shortcut
 * surface; the shell wires `onTabChange` after merging with B1.
 *
 * Shortcuts:
 *   1 / 2 / 3 / 4 — switch to Herói / Arsenal / Diário / Mapa
 *   ?              — toggle the help overlay
 *   Esc            — close the help overlay (handled by the overlay itself)
 *
 * Listener is intentionally inert when focus is inside an INPUT,
 * TEXTAREA, SELECT, or any contenteditable element. We intentionally do
 * NOT use `useKeyboardShortcut` here because that hook calls
 * `preventDefault()` unconditionally — fine for letters, but for `?`
 * (Shift+/) it can swallow legitimate text input on some keyboards.
 * Inline implementation lets us scope the gate precisely.
 */

export type PlayerHqV2TabKey = "heroi" | "arsenal" | "diario" | "mapa";

export interface PlayerHqKeyboardShortcutsProps {
  onTabChange: (tab: PlayerHqV2TabKey) => void;
  /** When false, listener is detached. Defaults to true. */
  enabled?: boolean;
}

const TAB_BY_KEY: Record<string, PlayerHqV2TabKey> = {
  "1": "heroi",
  "2": "arsenal",
  "3": "diario",
  "4": "mapa",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  if (target.closest(".ProseMirror")) return true;
  return false;
}

export function PlayerHqKeyboardShortcuts({
  onTabChange,
  enabled = true,
}: PlayerHqKeyboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      // Ignore when modifier keys are pressed (so Ctrl+1 etc. still
      // route to the browser).
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      const tab = TAB_BY_KEY[e.key];
      if (tab) {
        e.preventDefault();
        onTabChange(tab);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onTabChange]);

  return <KeyboardHelpOverlay open={helpOpen} onClose={closeHelp} />;
}
