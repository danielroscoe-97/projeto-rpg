"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
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
 * round-trip on open. Wave 3 v2 may add a "share" action that routes to
 * `combat_reports`; the serialized snapshot is already sufficient.
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
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function ResultHero({ result, label }: { result: CombatResult | null; label: string }) {
  const config = {
    victory: {
      icon: Trophy,
      gradient: "from-emerald-500/30 via-emerald-500/10 to-transparent",
      textCls: "text-emerald-300",
    },
    tpk: {
      icon: Skull,
      gradient: "from-rose-500/30 via-rose-500/10 to-transparent",
      textCls: "text-rose-300",
    },
    fled: {
      icon: Flag,
      gradient: "from-amber-500/30 via-amber-500/10 to-transparent",
      textCls: "text-amber-300",
    },
    dm_ended: {
      icon: History,
      gradient: "from-slate-500/30 via-slate-500/10 to-transparent",
      textCls: "text-slate-300",
    },
  } as const;
  const pick = result && result in config ? config[result as keyof typeof config] : config.dm_ended;
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

export function CombatRevisitModal({ entry, onClose }: CombatRevisitModalProps) {
  const t = useTranslations("campaignTimeline");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent background scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!mounted) return null;

  const resultLabel = entry.combat_result && ["victory", "tpk", "fled", "dm_ended"].includes(entry.combat_result)
    ? t(`result_${entry.combat_result}` as "result_victory" | "result_tpk" | "result_fled" | "result_dm_ended")
    : t("result_dm_ended");
  const duration = formatDuration(entry.duration_seconds);

  const defeatedCreatures = entry.creatures_snapshot.filter((c) => c.was_defeated).length;
  const totalCreatures = entry.creatures_snapshot.reduce(
    (sum, c) => sum + (typeof c.quantity === "number" ? c.quantity : 1),
    0,
  );

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        onClick={onBackdropClick}
        data-testid="revisit-modal-backdrop"
      >
        <motion.div
          key="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revisit-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col"
          data-testid="revisit-modal"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 rounded-md bg-black/40 hover:bg-black/60 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            aria-label={t("modal_close")}
            data-testid="revisit-modal-close"
          >
            <X className="size-4" />
          </button>

          <ResultHero result={entry.combat_result} label={resultLabel} />

          <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
            <header>
              <h2
                id="revisit-modal-title"
                className="text-xl font-semibold text-foreground"
              >
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
                    const pct = p.max_hp && p.current_hp != null
                      ? Math.max(0, Math.min(100, (p.current_hp / p.max_hp) * 100))
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
                        {pct != null && (
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
                  {entry.creatures_snapshot.map((c, idx) => (
                    <li
                      key={`${c.slug ?? c.name}-${idx}`}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 bg-background/40"
                      data-testid="revisit-creature-row"
                    >
                      {c.was_defeated ? (
                        <Skull className="size-3.5 shrink-0 text-rose-400/70" aria-hidden="true" />
                      ) : (
                        <Heart className="size-3.5 shrink-0 text-emerald-400/70" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${c.was_defeated ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {c.name}
                          {c.quantity > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">× {c.quantity}</span>
                          )}
                          {c.cr && (
                            <span className="ml-1 text-xs text-muted-foreground">· CR {c.cr}</span>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
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
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
