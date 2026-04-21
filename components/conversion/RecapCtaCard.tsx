"use client";

/**
 * RecapCtaCard — conversion moment card shown inside `CombatRecap`
 * for anon players (Story 03-D) and guests (Story 03-E, via
 * `<GuestRecapFlow>` delegation).
 *
 * Contract (Cluster γ refactor — Wave 2B):
 *   - `mode === "anon"`: this component renders the card and fires
 *     `conversion:cta_shown` / `conversion:cta_clicked` / `conversion:cta_dismissed`
 *     analytics. It DOES NOT own the `AuthModal`. Instead, on primary click
 *     it invokes `onRequestAuthModal({ sessionTokenId, campaignId, moment:
 *     "recap_anon" })`; the parent (PlayerJoinClient) is responsible for
 *     opening its singleton AuthModal, wiring `onSuccess` into
 *     `trackConversionCompleted("recap_anon", …)`, and clearing the
 *     moment-trigger ref on close (see `handleAuthModalOpenChange` /
 *     `recapCtaTriggeredRef` in PlayerJoinClient). This keeps a single
 *     AuthModal instance per tab (no duplicate OAuth listeners, no double
 *     success toasts) and consolidates attribution routing.
 *   - `mode === "guest"`: delegates to `<GuestRecapFlow>` (agent C, 03-E).
 *     This component does not render or track anything in guest mode —
 *     that responsibility is fully transferred.
 *
 * Re-exports `SaveSignupContext` from `./types` so call sites that pass
 * the prop through (e.g. `RecapActions`) don't need a separate import.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { BookmarkPlus } from "lucide-react";

import {
  trackCtaShown,
  trackCtaClicked,
  trackCtaDismissed,
} from "@/lib/conversion/analytics";
import { recordDismissal, readDismissalRecord } from "./dismissal-store";
import { GuestRecapFlow } from "./GuestRecapFlow";
import type { SaveSignupContext } from "./types";

export type { SaveSignupContext } from "./types";

/**
 * Payload the anon card sends to the parent when the user clicks
 * "save my progress". The parent (PlayerJoinClient) uses `moment` to
 * route the subsequent AuthModal success into the `recap_anon` funnel
 * instead of the waiting-room funnel. See Cluster β's
 * `PersistedUpgradeContext.moment` extension.
 *
 * Cluster ε (Mary #2) — `moment` is widened to the full upgrade-context
 * moment union (`"waiting" | "recap_anon"`) so the same payload shape can
 * carry any anon-CTA trigger into PlayerJoinClient's `pendingUpgradeCtx`
 * state. Today only `recap_anon` is written by this component; future
 * callers (waiting-room, resumed-session, etc.) can reuse the type without
 * narrowing.
 */
export interface RecapCtaRequestAuthModalPayload {
  sessionTokenId: string;
  campaignId: string;
  moment: "waiting" | "recap_anon";
}

export interface RecapCtaCardProps {
  context: SaveSignupContext;
  /** Called when the recap can be dismissed (conversion succeeded or user
   * chose to dismiss the card). */
  onComplete?: () => void;
  /**
   * A#1 — Parent handler that opens the shared AuthModal. Required for
   * the anon flow; ignored for the guest branch. When absent the primary
   * click is a no-op (defensive — should never happen in production
   * because PlayerJoinClient always passes it).
   */
  onRequestAuthModal?: (payload: RecapCtaRequestAuthModalPayload) => void;
}

export function RecapCtaCard({
  context,
  onComplete,
  onRequestAuthModal,
}: RecapCtaCardProps): ReactElement | null {
  // Guest mode — delegate entirely to agent C's flow (03-E).
  if (context.mode === "guest") {
    return <GuestRecapFlow context={context} onComplete={onComplete} />;
  }

  return (
    <RecapCtaCardAnon
      context={context}
      onComplete={onComplete}
      onRequestAuthModal={onRequestAuthModal}
    />
  );
}

/**
 * Anon upgrade flow (Story 03-D).
 *
 * Split out so the guest branch above is a trivial delegation — lets
 * us call `useTranslations` / `useState` only when we actually need them
 * (React requires hooks be called in the same order per render, but the
 * parent `RecapCtaCard` uses an early return, so splitting guarantees
 * hook stability regardless of mode).
 */
function RecapCtaCardAnon({
  context,
  onComplete,
  onRequestAuthModal,
}: {
  context: Extract<SaveSignupContext, { mode: "anon" }>;
  onComplete?: () => void;
  onRequestAuthModal?: (payload: RecapCtaRequestAuthModalPayload) => void;
}): ReactElement | null {
  const t = useTranslations("conversion.recap_anon");

  // A#2 — local dismissal flag. When the user clicks secondary
  // ("continuar sem salvar") we hide the card but keep the rest of the
  // recap open. `onComplete` is intentionally NOT called because that
  // closes the entire CombatRecap — see tests/conversion/recap-cta-anon.
  const [cardDismissed, setCardDismissed] = useState(false);

  // W#6 — StrictMode guard. React 18 dev double-invokes effects; the
  // ref gate ensures `trackCtaShown` fires exactly once per mount
  // regardless of environment. Mirrors WaitingRoomSignupCTA's pattern.
  const shownFiredRef = useRef(false);
  useEffect(() => {
    if (shownFiredRef.current) return;
    shownFiredRef.current = true;
    trackCtaShown("recap_anon", {
      campaignId: context.campaignId,
      hasCharacter: !!context.characterId,
    });
  }, [context.campaignId, context.characterId]);

  const handlePrimary = useCallback(() => {
    trackCtaClicked("recap_anon", { campaignId: context.campaignId });
    onRequestAuthModal?.({
      sessionTokenId: context.sessionTokenId,
      campaignId: context.campaignId,
      moment: "recap_anon",
    });
  }, [
    context.campaignId,
    context.sessionTokenId,
    onRequestAuthModal,
  ]);

  // A#2 — local secondary: records dismissal, fires analytics, hides the
  // card. Does NOT call onComplete (would close the whole recap).
  const handleSecondary = useCallback(() => {
    try {
      recordDismissal(context.campaignId);
    } catch {
      /* dismissal-store swallows storage errors; this is defense-in-depth */
    }
    let dismissalCount = 1;
    try {
      const record = readDismissalRecord();
      const entry = record?.dismissalsByCampaign[context.campaignId];
      if (entry?.count) dismissalCount = entry.count;
    } catch {
      /* dismissalCount stays at 1 */
    }
    trackCtaDismissed("recap_anon", {
      campaignId: context.campaignId,
      dismissalCount,
    });
    setCardDismissed(true);
  }, [context.campaignId]);

  if (cardDismissed) return null;

  const characterName = context.characterName ?? "";

  return (
    <section
      data-testid="conversion.recap-cta.anon.root"
      className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 space-y-2"
    >
      <h3
        data-testid="conversion.recap-cta.anon.headline"
        className="text-sm font-semibold text-gold"
      >
        {t.rich("headline", {
          characterName,
          em: (chunks) => (
            <strong className="text-gold">{chunks}</strong>
          ),
        })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("body", { characterName })}
      </p>
      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          onClick={handlePrimary}
          data-testid="conversion.recap-cta.anon.primary"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-bold text-black transition-colors hover:bg-gold/90 min-h-[44px]"
        >
          <BookmarkPlus className="size-4" />
          {t("cta_primary")}
        </button>
        <button
          type="button"
          onClick={handleSecondary}
          data-testid="conversion.recap-cta.anon.secondary"
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-gold/30 px-3 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/10 min-h-[44px]"
        >
          {t("cta_secondary")}
        </button>
      </div>
    </section>
  );
}
