"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DIFFICULTY_OPTIONS } from "./DifficultyPoll";

interface DmPostCombatFeedbackProps {
  onSubmit: (rating: number, notes: string) => void;
  onSkip: () => void;
}

export function DmPostCombatFeedback({ onSubmit, onSkip }: DmPostCombatFeedbackProps) {
  const t = useTranslations("combat");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4"
    >
      <div className="bg-surface-overlay border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {t("dm_feedback_title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dm_feedback_subtitle")}
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedRating(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-2.5 py-2.5 rounded-lg border transition-all min-h-[44px] touch-manipulation",
                  selectedRating === opt.value
                    ? opt.bgActive
                    : `border-white/10 hover:border-white/20 ${opt.color}`
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs leading-tight font-medium">
                  {t(opt.labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("dm_feedback_notes_placeholder")}
          maxLength={500}
          rows={3}
          className="w-full bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] rounded-md transition-all min-h-[44px]"
          >
            {t("dm_feedback_skip")}
          </button>
          <button
            onClick={() => {
              if (selectedRating !== null) {
                onSubmit(selectedRating, notes);
              }
            }}
            disabled={selectedRating === null}
            className="flex-1 px-4 py-2 text-sm font-medium bg-gold text-foreground rounded-md transition-all min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("dm_feedback_save")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
