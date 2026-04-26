"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * Help overlay listing the V2 Player HQ keyboard shortcuts (Sprint 3
 * Track A · Story B5). Opened by the global `?` shortcut handled in
 * `PlayerHqKeyboardShortcuts`. Closes on Esc, on the close button, or
 * when the backdrop is clicked.
 */

interface KeyboardHelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardHelpOverlay({ open, onClose }: KeyboardHelpOverlayProps) {
  const t = useTranslations("player_hq.keyboard");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Local Esc handler — kept here (not in the global shortcut hook) so
  // the overlay can be unmounted/remounted without the shortcut having
  // to know about its state.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Focus the dialog on open so screen readers announce it.
  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const rows: Array<{ key: string; label: string }> = [
    { key: "1", label: t("tab1") },
    { key: "2", label: t("tab2") },
    { key: "3", label: t("tab3") },
    { key: "4", label: t("tab4") },
    { key: "?", label: t("help") },
    { key: "Esc", label: t("close") },
  ];

  return (
    <div
      role="presentation"
      onClick={onClose}
      data-testid="player-hq-v2-keyboard-help-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kbd-help-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-testid="player-hq-v2-keyboard-help"
        className="w-[min(420px,90vw)] rounded-xl border border-border bg-card p-5 shadow-xl outline-none"
      >
        <h2
          id="kbd-help-title"
          className="text-base font-semibold text-amber-400"
        >
          {t("title")}
        </h2>
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 text-xs font-mono text-foreground">
                {row.key}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md border border-border bg-background py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
