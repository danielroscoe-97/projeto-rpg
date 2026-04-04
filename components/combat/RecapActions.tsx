"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Share2, RotateCcw, BookmarkPlus, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CombatReport } from "@/lib/types/combat-report";
import { formatRecapShareText } from "@/lib/utils/combat-stats";

interface RecapActionsProps {
  report: CombatReport;
  onNewCombat: () => void;
  /** Show "Save & create campaign" CTA for guest users */
  onSaveAndSignup?: () => void;
  /** Pre-existing share URL from auto-save (avoids creating duplicate report) */
  existingShareUrl?: string | null;
  /** Campaign ID for linking the report (DM mode) */
  campaignId?: string;
  /** Encounter ID for linking the report (DM mode) */
  encounterId?: string;
}

export function RecapActions({ report, onNewCombat, onSaveAndSignup, existingShareUrl, campaignId, encounterId }: RecapActionsProps) {
  const t = useTranslations("combat");
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const handleShareText = useCallback(async () => {
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

  const handleShareLink = useCallback(async () => {
    setIsCreatingLink(true);
    try {
      // Reuse existing URL from auto-save if available, otherwise create new
      let url = existingShareUrl;
      if (!url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
          const res = await fetch("/api/combat-reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ report, campaignId, encounterId }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error("Failed to create link");
          const data = await res.json();
          url = data.url;
        } catch (err) {
          clearTimeout(timeout);
          throw err;
        }
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ url: url!, text: formatRecapShareText(report) });
          return;
        } catch { /* fall through to clipboard */ }
      }

      try {
        await navigator.clipboard.writeText(url!);
        toast.success(t("recap_link_copied"));
      } catch {
        // Clipboard blocked — show URL in toast so user can copy manually
        toast.success(url!, { duration: 8000 });
      }
    } catch {
      toast.error(t("recap_link_error"));
    } finally {
      setIsCreatingLink(false);
    }
  }, [report, existingShareUrl, campaignId, encounterId, t]);

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

      {/* Action row — Share text + Share link + New combat */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleShareText}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-sm font-medium min-h-[44px]"
          data-testid="recap-share-btn"
        >
          <Share2 className="size-4" />
          {t("leaderboard_share")}
        </button>
        <button
          type="button"
          onClick={handleShareLink}
          disabled={isCreatingLink}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50"
          data-testid="recap-share-link-btn"
        >
          {isCreatingLink ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          {t("recap_share_link")}
        </button>
        <button
          type="button"
          onClick={onNewCombat}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-sm font-medium min-h-[44px]"
          data-testid="recap-close-btn"
          aria-label={t("recap_new_combat")}
          title={t("recap_new_combat")}
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
