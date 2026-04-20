"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";

/**
 * Global keyboard shortcuts active on every authenticated /app/* page.
 *
 * - `g d` → Dashboard
 * - `g c` → Campaigns
 * - `g p` → Meus personagens
 * - `g s` → Compêndio (SRD)
 * - `g o` → Soundboard
 *
 * Chords (two keys within 800ms) are disabled inside inputs / textareas /
 * ProseMirror. Ctrl+K and Ctrl+B are handled by CommandPalette and
 * AppSidebar respectively.
 */
export function GlobalKeyboardShortcuts() {
  const router = useRouter();

  const go = useCallback(
    (path: string) => () => router.push(path),
    [router],
  );

  useKeyboardShortcut(["g", "d"], go("/app/dashboard"), { chord: true });
  useKeyboardShortcut(["g", "c"], go("/app/dashboard/campaigns"), { chord: true });
  useKeyboardShortcut(["g", "p"], go("/app/dashboard/characters"), { chord: true });
  useKeyboardShortcut(["g", "s"], go("/app/compendium"), { chord: true });
  useKeyboardShortcut(["g", "o"], go("/app/dashboard/soundboard"), { chord: true });

  // Ctrl+, → Settings
  useKeyboardShortcut(
    ",",
    useCallback(() => router.push("/app/dashboard/settings"), [router]),
    { ctrlOrMeta: true },
  );

  return null;
}
