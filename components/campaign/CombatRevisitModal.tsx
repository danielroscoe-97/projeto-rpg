"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  X,
  Sword,
  Skull,
  Flag,
  History,
  Heart,
  Users,
  Shield,
  Star,
  Clock,
  Trophy,
  HelpCircle,
} from "lucide-react";
import type {
  CombatResult,
  CreatureSnapshot,
  PartyMemberSnapshot,
} from "@/lib/supabase/encounter-snapshot";

/**
 * Epic 12, Story 12.10 — "Revisitar" cinematographic recap.
 *
 * Fed by the server-side `CombatTimeline` with the full encounter snapshot
 * (party + creatures + notes + rating). Reads-only: no mutations, no API
 * round-trip on open.
 *
 * Wave 3 review fixes:
 * - Real focus trap (tab cycles inside dialog; shift+tab from first → last).
 * - Initial focus lands on the close button on open.
 * - Focus is returned to the opener on close (plumbed via `returnFocusTo`).
 * - Scroll-lock is a counter so nested modals don't fight each other and
 *   compensates `padding-right` for the scrollbar gutter (no layout shift).
 * - Escape handler uses a ref to avoid stale-closure re-registration.
 * - `useId()` for `aria-labelledby` so multiple modals never collide.
 * - HP display guards against `max_hp = 0` (no "15/0" surprise).
 * - CR 0 creatures still render their CR tag.
 * - Unknown `combat_result` values render an explicit "unknown" variant
 *   instead of masquerading as `dm_ended`.
 *
 * NOTE: AnimatePresence now lives in the parent (`CombatTimelineEntry`).
 * The modal itself animates via plain motion primitives — when the parent
 * unmounts us, AnimatePresence at that level plays the exit.
 */
export interface RevisitEntry {
  id: string;
  name: string;
  ended_at: string;
  duration_seconds: number | null;
  round_number: number;
  combat_result: CombatResult | null;
  party_snapshot: PartyMemberSnapshot[];
  creatures_snapshot: CreatureSnapshot[];
  dm_difficulty_rating: number | null;
  dm_notes: string | null;
}

interface CombatRevisitModalProps {
  entry: RevisitEntry;
  onClose: () => void;
  /** Element to restore keyboard focus to when the modal closes. */
  returnFocusTo?: HTMLElement | null;
}

// ─── Scroll-lock helpers ───────────────────────────────────────────────────
// Shared counter so two modals mounting at once don't restore each other's
// overflow prematurely. First-in sets the lock; last-out releases it.
let scrollLockDepth = 0;
let scrollLockPrevOverflow: string | null = null;
let scrollLockPrevPadding: string | null = null;

function acquireScrollLock() {
  if (typeof document === "undefined") return;
  if (scrollLockDepth === 0) {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    scrollLockPrevOverflow = document.body.style.overflow;
    scrollLockPrevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
  }
  scrollLockDepth += 1;
}

function releaseScrollLock() {
  if (typeof document === "undefined") return;
  scrollLockDepth = Math.max(0, scrollLockDepth - 1);
  if (scrollLockDepth === 0) {
    document.body.style.overflow = scrollLockPrevOverflow ?? "";
    document.body.style.paddingRight = scrollLockPrevPadding ?? "";
    scrollLockPrevOverflow = null;
    scrollLockPrevPadding = null;
  }
}

// ─── Small presentational helpers ──────────────────────────────────────────

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

type HeroConfig = {
  icon: typeof Trophy;
  gradient: string;
  textCls: string;
};

function heroConfigFor(result: CombatResult | null): HeroConfig {
  switch (result) {
    case "victory":
      return { icon: Trophy, gradient: "from-emerald-500/30 via-emerald-500/10 to-transparent", textCls: "text-emerald-300" };
    case "tpk":
      return { icon: Skull, gradient: "from-rose-500/30 via-rose-500/10 to-transparent", textCls: "text-rose-300" };
    case "fled":
      return { icon: Flag, gradient: "from-amber-500/30 via-amber-500/10 to-transparent", textCls: "text-amber-300" };
    case "dm_ended":
      return { icon: History, gradient: "from-slate-500/30 via-slate-500/10 to-transparent", textCls: "text-slate-300" };
    default:
      // Explicit "unknown" variant — masking as dm_ended was lying to the DM
      // about what actually happened (Wave 3 review #17).
      return { icon: HelpCircle, gradient: "from-muted/20 via-muted/5 to-transparent", textCls: "text-muted-foreground" };
  }
}

function ResultHero({ result, label }: { result: CombatResult | null; label: string }) {
  const pick = heroConfigFor(result);
  const Icon = pick.icon;
  return (
    <div className={`relative h-28 bg-gradient-to-b ${pick.gradient} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-1">
        <Icon className={`size-10 ${pick.textCls}`} aria-hidden="true" />
        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${pick.textCls}`}>{label}</span>
      </div>
    </div>
  );
}

function DifficultyStars({ rating, ariaLabel }: { rating: number | null; ariaLabel: string }) {
  if (rating == null || rating <= 0) return null;
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-3.5 ${n <= clamped ? "text-amber-300 fill-amber-300" : "text-muted-foreground/30"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CombatRevisitModal({ entry, onClose, returnFocusTo = null }: CombatRevisitModalProps) {
  const t = useTranslations("campaignTimeline");
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  // Ref-wrap onClose so the Escape listener never captures a stale closure.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Dialog root + first/last focusable sentinels for the focus trap.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll-lock + Escape listener with ref indirection.
  useLayoutEffect(() => {
    acquireScrollLock();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      releaseScrollLock();
    };
  }, []);

  // Return focus to the opener on unmount. Runs even if the modal is unmounted
  // by a parent re-render without our close button being pressed.
  useEffect(() => {
    return () => {
      // Defer to the end of the microtask queue so the opener has re-rendered
      // and is focusable again.
      queueMicrotask(() => {
        if (returnFocusTo && typeof returnFocusTo.focus === "function") {
          returnFocusTo.focus();
        }
      });
    };
  }, [returnFocusTo]);

  // Move initial focus INTO the dialog so keyboard users don't start outside.
  useEffect(() => {
    if (!mounted) return;
    // Prefer the close button — it's a safe fallback, and "Close" is a
    // sensible first landing target for a read-only recap.
    closeButtonRef.current?.focus();
  }, [mounted]);

  // Focus trap. Tab from last focusable → first; Shift+Tab from first → last.
  useEffect(() => {
    if (!mounted) return;
    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [mounted]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!mounted) return null;

  const knownResult = entry.combat_result && ["victory", "tpk", "fled", "dm_ended"].includes(entry.combat_result);
  const resultLabel = knownResult
    ? t(`result_${entry.combat_result}` as "result_victory" | "result_tpk" | "result_fled" | "result_dm_ended")
    : t("result_unknown");
  const duration = formatDuration(entry.duration_seconds);

  const defeatedCreatures = entry.creatures_snapshot.filter((c) => c?.was_defeated === true).length;
  const totalCreatures = entry.creatures_snapshot.reduce(
    (sum, c) => sum + (c && typeof c.quantity === "number" && c.quantity > 0 ? c.quantity : 1),
    0,
  );

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onBackdropClick}
      data-testid="revisit-modal-backdrop"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col"
        data-testid="revisit-modal"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-md bg-black/40 hover:bg-black/60 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          aria-label={t("modal_close")}
          data-testid="revisit-modal-close"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <ResultHero result={entry.combat_result} label={resultLabel} />

        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          <header>
            <h2 id={titleId} className="text-xl font-semibold text-foreground">
              {entry.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <History className="size-3.5" aria-hidden="true" />
                {t("rounds_label", { count: entry.round_number })}
              </span>
              {duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {duration}
                </span>
              )}
              {entry.dm_difficulty_rating != null && (
                <DifficultyStars
                  rating={entry.dm_difficulty_rating}
                  ariaLabel={t("modal_difficulty_label", { rating: entry.dm_difficulty_rating })}
                />
              )}
            </div>
          </header>

          {/* Party snapshot */}
          {entry.party_snapshot.length > 0 && (
            <section aria-labelledby="revisit-party-heading">
              <h3
                id="revisit-party-heading"
                className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"
              >
                <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                {t("modal_party_heading", { count: entry.party_snapshot.length })}
              </h3>
              <ul className="space-y-1.5">
                {entry.party_snapshot.map((p) => {
                  const hasValidHp = p && typeof p.max_hp === "number" && p.max_hp > 0 && p.current_hp != null;
                  const pct = hasValidHp
                    ? Math.max(0, Math.min(100, ((p.current_hp as number) / (p.max_hp as number)) * 100))
                    : null;
                  const hpClass =
                    pct == null ? "bg-muted/40" :
                    pct >= 75 ? "bg-emerald-500/60" :
                    pct >= 50 ? "bg-amber-400/70" :
                    pct >= 25 ? "bg-orange-400/70" :
                    "bg-rose-500/70";
                  return (
                    <li
                      key={p.member_id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 bg-background/40"
                      data-testid="revisit-party-row"
                    >
                      <Sword className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">
                          {p.name}
                          {p.level != null && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · {t("modal_level_abbrev")} {p.level}
                            </span>
                          )}
                          {(p.class || p.race) && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · {[p.race, p.class].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </p>
                      </div>
                      {hasValidHp && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-14 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${hpClass}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground w-14 text-right">
                            {p.current_hp}/{p.max_hp}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Creatures snapshot */}
          {entry.creatures_snapshot.length > 0 && (
            <section aria-labelledby="revisit-creatures-heading">
              <h3
                id="revisit-creatures-heading"
                className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"
              >
                <Shield className="size-4 text-muted-foreground" aria-hidden="true" />
                {t("modal_creatures_heading", {
                  defeated: defeatedCreatures,
                  total: totalCreatures,
                })}
              </h3>
              <ul className="space-y-1.5">
                {entry.creatures_snapshot.map((c, idx) => {
                  const qty = typeof c.quantity === "number" && c.quantity > 0 ? c.quantity : 1;
                  // CR 0 (commoners, rats) is valid — guard against null/empty
                  // string only, not falsy-zero (Wave 3 review #5).
                  const hasCr = c.cr != null && String(c.cr).trim() !== "";
                  return (
                    <li
                      key={`${c.slug ?? c.name}-${idx}`}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 bg-background/40"
                      data-testid="revisit-creature-row"
                    >
                      {c.was_defeated ? (
                        <Skull className="size-3.5 shrink-0 text-rose-400/70" aria-label={t("modal_creature_defeated")} />
                      ) : (
                        <Heart className="size-3.5 shrink-0 text-emerald-400/70" aria-label={t("modal_creature_alive")} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${c.was_defeated ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {c.name}
                          {qty > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">× {qty}</span>
                          )}
                          {hasCr && (
                            <span className="ml-1 text-xs text-muted-foreground">· CR {c.cr}</span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* DM notes (private, DM-only — this modal is DM-view) */}
          {entry.dm_notes && entry.dm_notes.trim().length > 0 && (
            <section aria-labelledby="revisit-notes-heading">
              <h3
                id="revisit-notes-heading"
                className="text-sm font-semibold text-foreground mb-2"
              >
                {t("modal_dm_notes_heading")}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-background/40 rounded-md p-3 border border-border/40">
                {entry.dm_notes}
              </p>
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
