"use client";

/**
 * WaitingRoomSignupCTA — Epic 03, Story 03-C.
 *
 * Inline `Card` rendered in the `/join/[token]` waiting room that invites
 * anonymous players to sign up while they wait for combat to start. Three
 * behavioural notes:
 *
 * 1. **No own realtime subscription.** The parent (`PlayerJoinClient`) owns
 *    the `active` boolean. When `active` flips true (combat started), the
 *    parent stops rendering us — React's reconciler handles the unmount.
 *    See epic 03 §D9/F2.
 *
 * 2. **Dismissal gating happens upstream.** Visibility precedence lives in
 *    `components/conversion/dismissal-store.ts#shouldShowCta`. Parent passes
 *    us only when that guard clears, so this component unconditionally
 *    renders once mounted. On "Agora não" we call `recordDismissal` + the
 *    `onDismiss` callback so the parent flips its local state.
 *
 * 3. **Parity invariants (CLAUDE.md).** This CTA targets anon players on
 *    `/join` only. Guests (`/try`) and authenticated players (`/invite`)
 *    never see it — the parent gate enforces that. The component has no
 *    side effects that touch realtime, heartbeat, or identity storage, so
 *    mounting/unmounting it is safe at any time (Resilient Reconnection).
 *
 * First consumer of `t.rich()` in the PlayerJoin tree — see
 * `docs/patterns-i18n-rich-text.md` for the canonical `em:` handler pattern.
 */

import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  readDismissalRecord,
  recordDismissal,
} from "@/components/conversion/dismissal-store";
import {
  trackCtaClicked,
  trackCtaDismissed,
  trackConversionFailed,
} from "@/lib/conversion/analytics";

export type WaitingRoomSignupCTAProps = {
  sessionTokenId: string;
  campaignId: string;
  /** From `session_tokens.player_name` — currently unused but part of the
   * contract so future copy variants can greet the player by name without
   * a props change. */
  playerName: string;
  /** Soft-claimed character id, if any. Drives the `hasCharacter` analytics
   * bit and is forwarded to `onOpenAuthModal` so the parent can pass it
   * along the upgrade flow. */
  characterId: string | null;
  /** Display name of the soft-claimed character. When present we render the
   * rich headline with `<strong>{name}</strong>`. */
  characterName: string | null;
  onOpenAuthModal: (ctx: {
    sessionTokenId: string;
    campaignId: string;
    characterId: string | null;
  }) => void;
  onDismiss: () => void;
};

export function WaitingRoomSignupCTA({
  sessionTokenId,
  campaignId,
  playerName: _playerName,
  characterId,
  characterName,
  onOpenAuthModal,
  onDismiss,
}: WaitingRoomSignupCTAProps) {
  const t = useTranslations("conversion.waiting_room");
  const headingId = useId();

  // Cluster γ (Q#17) — `conversion:cta_shown` is fired by the parent
  // (PlayerJoinClient) keyed by `effectiveTokenId` so reconnects (child
  // remounts, parent survives) cannot double-count. The child used to own
  // a mount-level ref; that responsibility is now the parent's alone.

  const handlePrimary = () => {
    trackCtaClicked("waiting", { campaignId });
    onOpenAuthModal({ sessionTokenId, campaignId, characterId });
  };

  const handleSecondary = () => {
    // recordDismissal increments `count` and writes back. Read the fresh
    // count from storage (best-effort — null-safe) so analytics reflects
    // the post-increment value. If storage is unavailable we default to 1
    // (the action still happened, we just can't read the persisted total).
    // Cluster γ (Q#3) — emit a `conversion:failed` breadcrumb when the
    // write itself throws so we can distinguish "user dismissed" from
    // "storage full / private mode / quota exceeded" in funnel analytics.
    try {
      recordDismissal(campaignId);
    } catch (err) {
      // Diagnostic only — user-visible behavior is unchanged (card still
      // closes via onDismiss below).
      // eslint-disable-next-line no-console
      console.warn("dismissal-store: storage write failed", err);
      try {
        trackConversionFailed("waiting", {
          campaignId,
          error: "storage_write_failed",
        });
      } catch { /* analytics best-effort */ }
    }
    let dismissalCount = 1;
    try {
      const record = readDismissalRecord();
      const entry = record?.dismissalsByCampaign[campaignId];
      if (entry?.count) dismissalCount = entry.count;
    } catch {
      /* swallow — dismissalCount stays at its default of 1 */
    }
    trackCtaDismissed("waiting", { campaignId, dismissalCount });
    onDismiss();
  };

  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      data-testid="conversion.waiting-room-cta"
      className="mx-auto w-full max-w-lg border-gold/30 bg-gold/[0.04]"
    >
      <CardHeader className="space-y-2 p-5">
        <CardTitle id={headingId} className="text-base text-gold">
          {characterName
            ? t.rich("headline_with_char", {
                characterName,
                em: (chunks) => (
                  <strong className="text-gold">{chunks}</strong>
                ),
              })
            : t("headline_no_char")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          {t("body")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0" />
      <CardFooter className="flex flex-col gap-2 p-5 pt-0 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="conversion.waiting-room-cta.dismiss"
          aria-label={t("cta_secondary")}
          onClick={handleSecondary}
          className="min-h-[40px]"
        >
          {t("cta_secondary")}
        </Button>
        <Button
          type="button"
          variant="gold"
          size="sm"
          data-testid="conversion.waiting-room-cta.primary"
          onClick={handlePrimary}
          className="min-h-[40px]"
        >
          {t("cta_primary")}
        </Button>
      </CardFooter>
    </Card>
  );
}
