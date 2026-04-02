"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface KeyboardCheatsheetProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Space"], action: "shortcut_next_turn" },
  { keys: ["↑", "↓"], action: "shortcut_navigate" },
  { keys: ["Enter"], action: "shortcut_expand" },
  { keys: ["D"], action: "shortcut_damage" },
  { keys: ["H"], action: "shortcut_heal" },
  { keys: ["C"], action: "shortcut_conditions" },
  { keys: ["Ctrl", "Z"], action: "shortcut_undo_action" },
  { keys: ["Ctrl", "K"], action: "shortcut_search" },
  { keys: ["Esc"], action: "shortcut_close" },
  { keys: ["?"], action: "shortcut_help" },
] as const;

export function KeyboardCheatsheet({ open, onClose }: KeyboardCheatsheetProps) {
  const t = useTranslations("combat");
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap: focus the panel on open, return focus on close
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => { prev?.focus(); };
  }, [open]);

  // Close on Escape within the dialog
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("shortcut_title")}
        tabIndex={-1}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[320px] rounded-xl border border-white/[0.10] bg-surface-secondary p-5 shadow-2xl animate-in zoom-in-95 fade-in-0 duration-150 outline-none"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">{t("shortcut_title")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">{t(s.action)}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-[10px] font-mono text-foreground bg-white/[0.06] rounded border border-white/[0.08]"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
