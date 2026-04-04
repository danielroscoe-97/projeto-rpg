"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, SkipForward } from "lucide-react";
import type { CombatReport } from "@/lib/types/combat-report";
import { RecapAwardsCarousel } from "./RecapAwardsCarousel";
import { RecapNarratives } from "./RecapNarratives";
import { RecapSummary } from "./RecapSummary";
import { RecapActions } from "./RecapActions";

type RecapPhase = "awards" | "details";

interface CombatRecapProps {
  report: CombatReport;
  onClose: () => void;
  /** Guest-only: save snapshot and redirect to signup */
  onSaveAndSignup?: () => void;
}

export function CombatRecap({ report, onClose, onSaveAndSignup }: CombatRecapProps) {
  const t = useTranslations("combat");
  const [phase, setPhase] = useState<RecapPhase>(report.awards.length > 0 ? "awards" : "details");

  const handleAwardsComplete = useCallback(() => {
    setPhase("details");
  }, []);

  const handleSkipToDetails = useCallback(() => {
    setPhase("details");
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      data-testid="combat-recap"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gold/30 bg-surface-primary shadow-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-gold">
              {t("recap_title")}
            </h2>
            {report.encounterName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {report.encounterName}
                <span className="ml-1">
                  • {report.summary.matchup} • {t("leaderboard_rounds", { rounds: report.summary.totalRounds })}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {phase === "awards" && (
              <button
                type="button"
                onClick={handleSkipToDetails}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t("recap_skip")}
                data-testid="recap-skip-btn"
              >
                <SkipForward className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t("leaderboard_close")}
              data-testid="recap-close-x-btn"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <AnimatePresence mode="wait">
            {phase === "awards" && (
              <motion.div
                key="awards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <RecapAwardsCarousel
                  awards={report.awards}
                  onComplete={handleAwardsComplete}
                />
              </motion.div>
            )}

            {phase === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {/* Narratives */}
                <RecapNarratives narratives={report.narratives} />

                {/* Summary + Rankings */}
                <RecapSummary summary={report.summary} rankings={report.rankings} />

                {/* Actions */}
                <RecapActions report={report} onNewCombat={onClose} onSaveAndSignup={onSaveAndSignup} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
