"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Share2, RotateCcw, BookmarkPlus, Save, Check, Loader2, UserPlus, BarChart3, Link2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { CombatReport } from "@/lib/types/combat-report";
import { formatRecapShareText } from "@/lib/utils/combat-stats";
import { DifficultyRatingStrip } from "./DifficultyRatingStrip";
import { RecapCtaCard, type RecapCtaRequestAuthModalPayload } from "@/components/conversion/RecapCtaCard";
import type { SaveSignupContext } from "@/components/conversion/types";

/**
 * Story 03-D (F6) — encapsulates the render rule for the legacy
 * "Salvar Combate" button. Exported so it can be tested in isolation;
 * this is the acceptance-critical function.
 *
 * Truth table:
 *   (undefined, undefined)           → true   legacy auth/DM path
 *   (undefined, fn)                  → false  legacy guest path
 *   ({mode:"anon",...}, any)         → true   anon sees card + button
 *   ({mode:"guest", !campaignId}, *) → false  guest without campaign
 *   ({mode:"guest", campaignId:"x"},*)→ true   guest-with-campaign edge
 */
export function shouldShowSaveCombat(
  saveSignupContext: SaveSignupContext | undefined,
  onSaveAndSignup: (() => void) | undefined,
): boolean {
  if (!saveSignupContext) {
    // Legacy behavior — preserved for callers that never pass context.
    return !onSaveAndSignup;
  }
  if (saveSignupContext.mode === "anon") return true;
  if (saveSignupContext.mode === "guest") {
    return !!saveSignupContext.campaignId;
  }
  return false;
}

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
  /**
   * Story 03-D — conversion-moment context forwarded to `RecapCtaCard`.
   * When present, the card renders above the action row and the
   * "Salvar Combate" button follows `shouldShowSaveCombat`.
   */
  saveSignupContext?: SaveSignupContext;
  /**
   * Cluster γ (A#1) — forwarded to `RecapCtaCard` for the anon flow.
   * The parent (PlayerJoinClient) uses this to open its singleton
   * AuthModal with the recap_anon attribution moment.
   */
  onRequestAuthModal?: (payload: RecapCtaRequestAuthModalPayload) => void;
}

export function RecapActions({ report, onNewCombat, onSaveAndSignup, existingShareUrl, campaignId, encounterId, onRate, initialRating, onJoinCampaign, sessionId, saveSignupContext, onRequestAuthModal }: RecapActionsProps) {
  const t = useTranslations("combat");
  const tFeedback = useTranslations("feedback");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  // Story 12.3 — auto-save succeeds regardless of campaign (combat_reports.campaign_id is nullable),
  // so isSaved only needs the share URL to be considered saved.
  const [isSaved, setIsSaved] = useState(!!existingShareUrl);
  const [hasRated, setHasRated] = useState(initialRating != null);

  // Story 12.3 AC3 — non-blocking "link to campaign" for quick combats. Only
  // relevant for auth DM (no saveSignupContext); the session must already be
  // persisted (12.2 eager-create) so we have something to link.
  const showLinkCampaignCta = !campaignId && !!sessionId && !saveSignupContext;
  const [userCampaigns, setUserCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkedCampaignName, setLinkedCampaignName] = useState<string | null>(null);

  // Abort in-flight save on unmount
  const abortRef = useRef<AbortController | null>(null);
  // Separate abort ref for handleLinkCampaign so unmount mid-link doesn't
  // trigger post-unmount setState / stray toasts.
  const linkAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => {
    abortRef.current?.abort();
    linkAbortRef.current?.abort();
  }, []);
  // Sync isSaved when auto-save completes (existingShareUrl arrives after mount)
  useEffect(() => {
    if (existingShareUrl && !isSaved) setIsSaved(true);
  }, [existingShareUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Story 12.3 AC3 — lazily fetch the DM's campaigns only when the CTA is
  // actually visible, so we don't waste a query on the 80% auth-with-campaign path.
  useEffect(() => {
    if (!showLinkCampaignCta || userCampaigns.length > 0 || linkedCampaignName) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("campaigns")
          .select("id, name")
          .order("created_at", { ascending: false });
        if (!cancelled && data) setUserCampaigns(data as { id: string; name: string }[]);
      } catch {
        // Non-fatal — the CTA just won't populate
      }
    })();
    return () => { cancelled = true; };
  }, [showLinkCampaignCta, userCampaigns.length, linkedCampaignName]);

  const handleLinkCampaign = useCallback(async () => {
    if (!sessionId || !selectedCampaignId) return;
    const chosen = userCampaigns.find((c) => c.id === selectedCampaignId);
    // Fall through if the selected ID somehow isn't in the fetched list — rare,
    // but treating it as an error beats silently succeeding with an empty name.
    if (!chosen) {
      toast.error(t("recap_link_campaign_error"));
      return;
    }
    setIsLinking(true);
    const controller = new AbortController();
    linkAbortRef.current = controller;
    try {
      const res = await fetch(`/api/combat/${sessionId}/link-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json().catch(() => null)) as { campaignId?: string } | null;
      if (body?.campaignId !== selectedCampaignId) {
        throw new Error("unexpected_response");
      }
      setLinkedCampaignName(chosen.name);
      toast.success(t("recap_link_campaign_success", { name: chosen.name }));
    } catch {
      if (!controller.signal.aborted) toast.error(t("recap_link_campaign_error"));
    } finally {
      linkAbortRef.current = null;
      setIsLinking(false);
    }
  }, [sessionId, selectedCampaignId, userCampaigns, t]);

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
      const res = await fetch(`/api/combat/${sessionId}/feedback-link`, {
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
    // Story 12.3 — no more "Select a campaign" banner. The API accepts a null
    // campaignId (quick combat); the combat is saved either way.
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
        // Explicit `null` (rather than `undefined`) so JSON.stringify keeps the
        // key in the payload — preserves the "campaign is intentionally absent"
        // signal that the auto-save flow and the API validator both rely on.
        body: JSON.stringify({ report, campaignId: campaignId ?? null, encounterId }),
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
  }, [campaignId, isSaved, report, encounterId, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-2 pt-2"
    >
      {/* Story 03-D — conversion CTA card (anon) / delegated flow (guest) */}
      {saveSignupContext && (
        <RecapCtaCard
          context={saveSignupContext}
          onComplete={onNewCombat}
          onRequestAuthModal={onRequestAuthModal}
        />
      )}

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

      {/* Primary CTA — Save & signup (guest legacy path only).
          W#3 (Cluster α) — when the new `saveSignupContext.mode === "guest"`
          path is active, `RecapCtaCard` already renders the GuestRecapFlow
          signup CTA above. Rendering this legacy button at the same time
          creates duplicate CTAs. Suppress the legacy button in that case;
          guest-without-context (pre-03-E) still renders as before. */}
      {onSaveAndSignup && saveSignupContext?.mode !== "guest" && (
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

      {/* Story 12.3 AC3 — non-blocking "link to campaign" for quick combats (DM only). */}
      {showLinkCampaignCta && (
        linkedCampaignName ? (
          <div
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-green-500/30 text-green-400 text-sm font-medium"
            data-testid="recap-link-campaign-linked"
          >
            <Check className="size-4" />
            {t("recap_link_campaign_success", { name: linkedCampaignName })}
          </div>
        ) : userCampaigns.length > 0 ? (
          <div
            className="w-full flex flex-col gap-2 p-3 rounded-lg border border-gold/20 bg-gold/5"
            data-testid="recap-link-campaign-card"
          >
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Link2 className="size-4 text-gold" />
              <span className="font-medium">{t("recap_link_campaign_title")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("recap_link_campaign_description")}
            </p>
            <div className="flex gap-2">
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                disabled={isLinking}
                className="flex-1 min-h-[40px] px-2 py-1.5 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-50"
                data-testid="recap-link-campaign-select"
                aria-label={t("recap_link_campaign_title")}
                aria-required="true"
                aria-invalid={!selectedCampaignId}
              >
                <option value="">{t("recap_link_campaign_placeholder")}</option>
                {userCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleLinkCampaign}
                disabled={!selectedCampaignId || isLinking}
                className="px-3 py-1.5 min-h-[40px] rounded-md bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="recap-link-campaign-submit"
              >
                {isLinking ? <Loader2 className="size-4 animate-spin" /> : t("recap_link_campaign_submit")}
              </button>
            </div>
          </div>
        ) : null
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
        {/* Story 03-D (F6) — render rule extracted to `shouldShowSaveCombat`.
            Preserves legacy auth-DM path, preserves guest hide behavior,
            adds anon (sees card AND button). See tests/conversion/
            recap-actions-save-combat.test.tsx for the full truth table. */}
        {shouldShowSaveCombat(saveSignupContext, onSaveAndSignup) && (
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
