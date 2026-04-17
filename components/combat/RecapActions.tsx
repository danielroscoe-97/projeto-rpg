"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Share2, RotateCcw, BookmarkPlus, Save, Check, Loader2, UserPlus, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import type { CombatReport } from "@/lib/types/combat-report";
import { formatRecapShareText } from "@/lib/utils/combat-stats";
import { DifficultyRatingStrip } from "./DifficultyRatingStrip";

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
  /** Called when user submits an inline rating */
  onRate?: (vote: 1 | 2 | 3 | 4 | 5) => void;
  /** Pre-filled rating value */
  initialRating?: number | null;
  /** JO-04: Anonymous player CTA to join the campaign */
  onJoinCampaign?: () => void;
  /** DM-only: session id used to fetch the retroactive feedback share link */
  sessionId?: string;
}

export function RecapActions({ report, onNewCombat, onSaveAndSignup, existingShareUrl, campaignId, encounterId, onRate, initialRating, onJoinCampaign, sessionId }: RecapActionsProps) {
  const t = useTranslations("combat");
  const tFeedback = useTranslations("feedback");
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  // Already saved if auto-save ran with a campaign linked
  const [isSaved, setIsSaved] = useState(!!(existingShareUrl && campaignId));
  const [hasRated, setHasRated] = useState(initialRating != null);
  // Abort in-flight save on unmount
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { abortRef.current?.abort(); }, []);
  // Sync isSaved when auto-save completes (existingShareUrl arrives after mount)
  useEffect(() => {
    if (existingShareUrl && !isSaved) setIsSaved(true);
  }, [existingShareUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleCopyFeedbackLink = useCallback(async () => {
    if (!sessionId) return;
    setIsCopyingLink(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/feedback-link`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { url?: string };
      if (!body.url) throw new Error("missing_url");

      // Prefer native share on mobile if available
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ url: body.url, text: tFeedback("copy_link_button") });
          toast.success(tFeedback("copy_link_success"));
          return;
        } catch {
          // User cancelled — fall through to clipboard
        }
      }

      await navigator.clipboard.writeText(body.url);
      toast.success(tFeedback("copy_link_success"));
    } catch {
      toast.error(tFeedback("copy_link_error"));
    } finally {
      setIsCopyingLink(false);
    }
  }, [sessionId, tFeedback]);

  const handleSaveCombat = useCallback(async () => {
    if (!campaignId) {
      toast.info(t("recap_save_no_campaign"));
      onNewCombat();
      router.push("/app/dashboard/campaigns");
      return;
    }

    if (isSaved) {
      toast.success(t("recap_save_success"));
      return;
    }

    setIsSaving(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("/api/combat-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, campaignId, encounterId }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to save");
      setIsSaved(true);
      toast.success(t("recap_save_success"));
    } catch {
      if (!controller.signal.aborted) toast.error(t("recap_save_error"));
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      setIsSaving(false);
    }
  }, [campaignId, isSaved, report, encounterId, t, onNewCombat, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-2 pt-2"
    >
      {/* JO-04: Primary CTA — Join Campaign (anonymous player in campaign session) */}
      {onJoinCampaign && (
        <button
          type="button"
          onClick={onJoinCampaign}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gold text-black hover:bg-gold/90 transition-colors text-sm font-bold min-h-[48px]"
          data-testid="recap-join-campaign-btn"
        >
          <UserPlus className="size-4" />
          {t("recap_join_campaign")}
        </button>
      )}

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

      {/* Inline rating strip */}
      {onRate && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground text-center">
            {hasRated ? t("recap_rate_thanks") : t("recap_rate_label")}
          </p>
          <DifficultyRatingStrip
            initialValue={initialRating}
            onSelect={(vote) => { setHasRated(true); onRate(vote); }}
          />
        </div>
      )}

      {/* DM-only: copy retroactive feedback link for the player group */}
      {sessionId && (
        <button
          type="button"
          onClick={handleCopyFeedbackLink}
          disabled={isCopyingLink}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50"
          data-testid="recap-feedback-link-btn"
        >
          {isCopyingLink ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
          {tFeedback("copy_link_button")}
        </button>
      )}

      {/* Action row — Share text + Save combat (auth only) + New combat */}
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
        {/* Hide "Salvar Combate" for guests — the primary CTA already covers save+signup */}
        {!onSaveAndSignup && (
          <button
            type="button"
            onClick={handleSaveCombat}
            disabled={isSaving}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50 ${
              isSaved
                ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                : "border-gold/30 text-gold hover:bg-gold/10"
            }`}
            data-testid="recap-save-combat-btn"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isSaved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {isSaved ? t("recap_saved") : t("recap_save_combat")}
          </button>
        )}
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
