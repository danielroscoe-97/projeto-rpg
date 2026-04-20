/**
 * Conversion funnel analytics wrappers (Epic 03, Story 03-A).
 *
 * Thin wrappers over `trackEvent` that pin the event names and payload shape
 * for the `conversion:*` namespace. Zero PII — only opaque IDs + booleans +
 * small enums. `characterName`, `email`, `displayName`, `sessionTokenId` are
 * deliberately *never* part of any payload.
 *
 * Namespace: colon-style (`conversion:cta_shown`) to match the rest of the
 * analytics catalog (D8). Events must also be registered in the
 * ALLOWED_EVENTS Set at `app/api/track/route.ts` (F1) — otherwise the
 * server-side allowlist returns 400 `unknown_event`.
 */

import { trackEvent } from "@/lib/analytics/track";

export type ConversionMoment = "waiting" | "recap_anon" | "recap_guest";

/** Fires `conversion:cta_shown`. */
export function trackCtaShown(
  moment: ConversionMoment,
  ctx: {
    campaignId?: string;
    hasCharacter: boolean;
    guestCombatantCount?: number;
  },
): void {
  trackEvent("conversion:cta_shown", {
    moment,
    campaignId: ctx.campaignId,
    hasCharacter: ctx.hasCharacter,
    guestCombatantCount: ctx.guestCombatantCount,
  });
}

/** Fires `conversion:cta_dismissed`. */
export function trackCtaDismissed(
  moment: ConversionMoment,
  ctx: { campaignId?: string; dismissalCount: number },
): void {
  trackEvent("conversion:cta_dismissed", {
    moment,
    campaignId: ctx.campaignId,
    dismissalCount: ctx.dismissalCount,
  });
}

/** Fires `conversion:cta_clicked`. */
export function trackCtaClicked(
  moment: ConversionMoment,
  ctx: { campaignId?: string },
): void {
  trackEvent("conversion:cta_clicked", {
    moment,
    campaignId: ctx.campaignId,
  });
}

/** Fires `conversion:modal_opened`. */
export function trackModalOpened(moment: ConversionMoment): void {
  trackEvent("conversion:modal_opened", { moment });
}

/** Fires `conversion:completed`. */
export function trackConversionCompleted(
  moment: ConversionMoment,
  ctx: {
    campaignId?: string;
    characterId?: string;
    flow: "upgrade" | "signup_and_migrate";
    guestCombatantCount?: number;
  },
): void {
  trackEvent("conversion:completed", {
    moment,
    campaignId: ctx.campaignId,
    characterId: ctx.characterId,
    flow: ctx.flow,
    guestCombatantCount: ctx.guestCombatantCount,
  });
}

/** Fires `conversion:failed`. */
export function trackConversionFailed(
  moment: ConversionMoment,
  ctx: { campaignId?: string; error: string },
): void {
  trackEvent("conversion:failed", {
    moment,
    campaignId: ctx.campaignId,
    error: ctx.error,
  });
}
