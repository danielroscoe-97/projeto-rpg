"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Share2, RotateCcw, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import type { CombatReport } from "@/lib/types/combat-report";
import { formatRecapShareText } from "@/lib/utils/combat-stats";

interface RecapActionsProps {
  report: CombatReport;
  onNewCombat: () => void;
  /** Show "Save & create campaign" CTA for guest users */
  onSaveAndSignup?: () => void;
}

export function RecapActions({ report, onNewCombat, onSaveAndSignup }: RecapActionsProps) {
  const t = useTranslations("combat");

  const handleShare = useCallback(async () => {
    const text = formatRecapShareText(report);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("leaderboard_copied"));
    } catch {
      // Clipboard also failed — silent fail
    }
  }, [report, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-2 pt-2"
    >
      {/* Primary CTA — Save & signup (guest only) */}
      {onSaveAndSignup && (
        <button
          type="button"
          onClick={onSaveAndSignup}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gold text-black hover:bg-gold/90 transition-colors text-sm font-bold min-h-[48px]"
          data-testid="recap-save-signup-btn"
        >
          <BookmarkPlus className="size-4" />
          {t("recap_save_and_signup")}
        </button>
      )}

      {/* Secondary row — Share + New combat */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-sm font-medium min-h-[44px]"
          data-testid="recap-share-btn"
        >
          <Share2 className="size-4" />
          {t("leaderboard_share")}
        </button>
        <button
          type="button"
          onClick={onNewCombat}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-sm font-medium min-h-[44px]"
          data-testid="recap-close-btn"
        >
          <RotateCcw className="size-4" />
          {t("recap_new_combat")}
        </button>
      </div>
    </motion.div>
  );
}
