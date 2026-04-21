"use client";

import { useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Clock, AlertTriangle } from "lucide-react";

/**
 * Epic 12, Story 12.9 AC5 — confirmation when resuming a combat that has
 * been idle for more than 4h.
 *
 * Motivation: a browser-crash + reopen the next day should not drop the DM
 * straight into a stale Zustand hydrate. A quick confirm acknowledges the
 * time gap and gives an escape hatch ("Cancelar") so the DM can instead go
 * end the old combat via the recap flow first.
 *
 * Minimal WAI-ARIA dialog: labelledby + Escape + portal. Keeps the surface
 * intentionally small — this is a single-decision gate, not another recap.
 */
interface StaleSessionConfirmProps {
  open: boolean;
  encounterName: string | null;
  idleMinutes: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StaleSessionConfirm({
  open,
  encounterName,
  idleMinutes,
  onConfirm,
  onCancel,
}: StaleSessionConfirmProps) {
  const t = useTranslations("campaignTimeline");
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Ref-wrap the callbacks to keep the Escape listener stable.
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Focus the confirm button on open so Enter confirms (keyboard-first flow).
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const hours = Math.floor(idleMinutes / 60);
  const mins = idleMinutes % 60;
  // Compose a human-readable idle duration. Avoid Intl.RelativeTimeFormat
  // for now — the i18n layer handles pluralization per-bucket.
  const idleText = hours >= 1
    ? t("stale_idle_hours", { hours, minutes: mins })
    : t("stale_idle_minutes", { minutes: mins });

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      data-testid="stale-session-confirm-backdrop"
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-xl border border-amber-500/30 bg-card shadow-2xl p-5"
        data-testid="stale-session-confirm"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/15 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {t("stale_title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("stale_body", {
                name: encounterName ?? t("unnamed_encounter"),
                idle: idleText,
              })}
            </p>
            <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {idleText}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            data-testid="stale-session-cancel"
          >
            {t("stale_cancel")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-400/40 text-sm font-medium hover:bg-amber-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            data-testid="stale-session-confirm-btn"
          >
            {t("stale_confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Four hours in milliseconds — exported so tests can pin the threshold. */
export const STALE_SESSION_THRESHOLD_MS = 4 * 60 * 60 * 1000;

/**
 * Returns `null` if the session is fresh; otherwise idle-minutes ≥ 4h.
 * Computed outside the component so the click handler can skip mounting
 * the modal when no confirmation is needed.
 */
export function staleIdleMinutes(lastActivityIso: string | null | undefined): number | null {
  if (!lastActivityIso) return null;
  const then = new Date(lastActivityIso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  if (diff < STALE_SESSION_THRESHOLD_MS) return null;
  return Math.floor(diff / 60000);
}
