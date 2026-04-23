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
 * - `b`   → Compêndio em nova aba (book) — preserva contexto do combate
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

  // `b` → Compêndio em nova aba (preserva contexto em combate ativo).
  // Guard contra modificadores: Ctrl/Cmd+B já é usado pela AppSidebar pra colapsar.
  // A lógica atual de useKeyboardShortcut faz `ctrlMatched = !ctrlOrMeta || e.ctrlKey`,
  // então um atalho sem modificador declarado também dispara quando Ctrl/Cmd estão pressionados.
  useKeyboardShortcut(
    "b",
    useCallback((e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (typeof window === "undefined") return;
      window.open("/app/compendium?tab=monsters", "_blank", "noopener,noreferrer");
    }, []),
  );

  return null;
}
