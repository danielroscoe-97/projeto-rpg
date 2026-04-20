"use client";

/**
 * RecapCtaCard — conversion moment card shown inside `CombatRecap`
 * for anon players (Story 03-D) and guests (Story 03-E, via
 * `<GuestRecapFlow>` delegation).
 *
 * Contract:
 *   - `mode === "anon"`: this component owns the full flow — renders its
 *     own card, opens `AuthModal` with `upgradeContext`, handles success/
 *     error toasts, and fires all `conversion:*` analytics for the
 *     `"recap_anon"` moment.
 *   - `mode === "guest"`: delegates to `<GuestRecapFlow>` (agent C, 03-E).
 *     This component does not render or track anything in guest mode —
 *     that responsibility is fully transferred.
 *
 * Re-exports `SaveSignupContext` from `./types` so call sites that pass
 * the prop through (e.g. `RecapActions`) don't need a separate import.
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { BookmarkPlus } from "lucide-react";
import { toast } from "sonner";

import { AuthModal, type AuthModalSuccessPayload } from "@/components/auth/AuthModal";
import {
  trackCtaShown,
  trackCtaClicked,
  trackConversionCompleted,
} from "@/lib/conversion/analytics";
import { resetOnConversion } from "./dismissal-store";
import { GuestRecapFlow } from "./GuestRecapFlow";
import type { SaveSignupContext } from "./types";

export type { SaveSignupContext } from "./types";

export interface RecapCtaCardProps {
  context: SaveSignupContext;
  /** Called when the recap can be dismissed (conversion succeeded). */
  onComplete?: () => void;
}

export function RecapCtaCard({
  context,
  onComplete,
}: RecapCtaCardProps): ReactElement | null {
  // Guest mode — delegate entirely to agent C's flow (03-E).
  if (context.mode === "guest") {
    return <GuestRecapFlow context={context} onComplete={onComplete} />;
  }

  return <RecapCtaCardAnon context={context} onComplete={onComplete} />;
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
}: {
  context: Extract<SaveSignupContext, { mode: "anon" }>;
  onComplete?: () => void;
}): ReactElement {
  const t = useTranslations("conversion.recap_anon");
  const tSuccess = useTranslations("conversion.post_success");
  const [modalOpen, setModalOpen] = useState(false);

  // Fire shown once on mount (guest branch does its own shown from
  // GuestRecapFlow so we don't double-count).
  useEffect(() => {
    trackCtaShown("recap_anon", {
      campaignId: context.campaignId,
      hasCharacter: !!context.characterId,
    });
  }, [context.campaignId, context.characterId]);

  const handlePrimary = useCallback(() => {
    trackCtaClicked("recap_anon", { campaignId: context.campaignId });
    setModalOpen(true);
  }, [context.campaignId]);

  const handleSuccess = useCallback(
    (_payload: AuthModalSuccessPayload) => {
      try {
        trackConversionCompleted("recap_anon", {
          campaignId: context.campaignId,
          characterId: context.characterId ?? undefined,
          flow: "upgrade",
        });
        resetOnConversion();
        const characterName = context.characterName ?? "";
        toast.success(tSuccess("recap_anon", { characterName }));
      } catch {
        // toast/analytics failures are non-fatal — still dismiss the recap
        // because the underlying auth operation succeeded.
      } finally {
        setModalOpen(false);
        onComplete?.();
      }
    },
    [context.campaignId, context.characterId, context.characterName, onComplete, tSuccess],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setModalOpen(next);
    if (!next) {
      // Modal closed without success — only record failure if there was
      // an explicit error. Plain dismissal is not a conversion failure.
    }
  }, []);

  const characterName = context.characterName ?? "";

  return (
    <>
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
            onClick={onComplete}
            data-testid="conversion.recap-cta.anon.secondary"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-gold/30 px-3 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/10 min-h-[44px]"
          >
            {t("cta_secondary")}
          </button>
        </div>
      </section>

      <AuthModal
        open={modalOpen}
        onOpenChange={handleOpenChange}
        defaultTab="signup"
        onSuccess={handleSuccess}
        upgradeContext={{
          sessionTokenId: context.sessionTokenId,
          campaignId: context.campaignId,
        }}
      />
    </>
  );
}
