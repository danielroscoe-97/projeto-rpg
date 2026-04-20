"use client";

/**
 * GuestRecapFlow — Story 03-E (Epic 03 "Conversion Moments").
 *
 * Shown at the end of a guest combat on `/try`. Lets the player create a
 * fresh account (no upgrade saga — guest has no session_token) and then
 * explicitly migrates the selected guest Combatant to `player_characters`.
 *
 * Key rules (do NOT change without revisiting §03-E):
 *  - Filter snapshot by `is_player === true` (D5/F7) — never `.find`.
 *  - 0 players → disabled CTA with `no_character` copy.
 *  - 1 player → pre-selected, no picker (F7).
 *  - 2+ players → inline picker sorted by current_hp desc; picking is required.
 *  - `saveGuestCombatSnapshot` runs BEFORE opening the AuthModal (F15 safety).
 *  - No `upgradeContext` is passed to AuthModal — guest uses plain signUp (D3b).
 *  - Parallel legacy event `guest:recap_save_signup` is still emitted for 90d
 *    backward compat (F15). Scheduled for removal once `conversion:*` data is
 *    long enough.
 *  - Guest has NO realtime (CLAUDE.md Combat Parity) — no broadcasts here.
 *
 * Analytics: `conversion:cta_shown`, `conversion:cta_clicked`,
 * `conversion:completed` / `conversion:failed` with moment `"recap_guest"`.
 * PII rule: `characterId` YES, `characterName` NO (handled server-side only).
 */

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  useGuestCombatStore,
  saveGuestCombatSnapshot,
} from "@/lib/stores/guest-combat-store";
import {
  AuthModal,
  type AuthModalSuccessPayload,
} from "@/components/auth/AuthModal";
import { Card } from "@/components/ui/card";
import {
  trackCtaShown,
  trackCtaClicked,
  trackConversionCompleted,
  trackConversionFailed,
} from "@/lib/conversion/analytics";
import { trackEvent } from "@/lib/analytics/track";
import type { SaveSignupContext } from "./types";

export interface GuestRecapFlowProps {
  context: Extract<SaveSignupContext, { mode: "guest" }>;
  onComplete?: () => void;
}

/** Fallback error string when `messages.conversion.recap_guest.migration_failed_hint` key is missing. */
const MIGRATION_FAIL_FALLBACK_PT =
  "Erro ao salvar personagem. Tente de novo no dashboard.";

export function GuestRecapFlow({
  context,
  onComplete,
}: GuestRecapFlowProps): React.JSX.Element | null {
  const router = useRouter();
  const t = useTranslations("conversion.recap_guest");
  const tPost = useTranslations("conversion.post_success");

  // F7 — defensive re-filter: caller is supposed to pass players already, but
  // protect against stale snapshots with monsters leaking in.
  const playerCombatants = useMemo(
    () => context.guestCombatants.filter((c) => c.is_player === true),
    [context.guestCombatants],
  );

  // Sort by current HP desc for the picker (F7). Keep a stable id-based
  // tiebreaker so render order is deterministic across re-renders.
  const sortedPlayers = useMemo(
    () =>
      [...playerCombatants].sort((a, b) => {
        const hpDiff = (b.current_hp ?? 0) - (a.current_hp ?? 0);
        if (hpDiff !== 0) return hpDiff;
        return a.id.localeCompare(b.id);
      }),
    [playerCombatants],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (playerCombatants.length === 1) return playerCombatants[0].id;
    return null;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // 03-E CTA analytics: fire once on mount with the player count so the
  // funnel can distinguish the multi-character picker scenario.
  useEffect(() => {
    trackCtaShown("recap_guest", {
      hasCharacter: playerCombatants.length > 0,
      guestCombatantCount: playerCombatants.length,
    });
    // Intentionally fire only on mount — the component is mounted/unmounted
    // by the parent CombatRecap based on game phase, so this matches the
    // "card shown" moment exactly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = sortedPlayers.find((c) => c.id === selectedId) ?? null;
  const displayCharacterName =
    selected?.name ?? context.characterName ?? "";

  const headlineText = t("headline", { characterName: displayCharacterName });
  // next-intl's `t.rich` is not available in the jest mock; fall back to the
  // raw string (still renders correctly, the `<em>` just appears literally
  // inside tests — which doesn't care). In production, render with `.rich` so
  // the emphasis markup actually produces an `<em>` element.
  const richT = t as typeof t & {
    rich?: (
      key: string,
      values: Record<string, unknown>,
    ) => React.ReactNode;
  };
  const headlineNode =
    typeof richT.rich === "function"
      ? richT.rich("headline", {
          characterName: displayCharacterName,
          em: (chunks: React.ReactNode) => <em>{chunks}</em>,
        })
      : headlineText;

  // ---------------------------------------------------------------------------
  // No character branch
  // ---------------------------------------------------------------------------
  if (playerCombatants.length === 0) {
    return (
      <Card
        className="p-5 space-y-3 border-gold/20 bg-gold/[0.03]"
        data-testid="recap-cta.guest.root"
      >
        <p
          className="text-sm text-muted-foreground"
          data-testid="recap-cta.guest.no-character"
        >
          {t("no_character")}
        </p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="px-4 py-2 rounded-lg bg-gold/40 text-black/60 text-sm font-semibold cursor-not-allowed"
          data-testid="recap-cta.guest.cta-primary"
        >
          {t("cta_primary", { characterName: "" })}
        </button>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Primary click: save snapshot (F15 safety net) → open AuthModal signup
  // ---------------------------------------------------------------------------
  const handlePrimaryClick = () => {
    if (!selected) return;

    // F15 safety: snapshot BEFORE the modal so the user can recover the
    // combat state even if the modal or post-auth flow explodes. Kept in
    // parallel with the legacy `handleSaveAndSignup` path in GuestCombatClient.
    try {
      const storeState = useGuestCombatStore.getState();
      saveGuestCombatSnapshot({
        combatants: storeState.combatants,
        currentTurnIndex: storeState.currentTurnIndex,
        roundNumber: storeState.roundNumber,
      });
    } catch {
      // Never block the conversion for a storage hiccup.
    }

    trackCtaClicked("recap_guest", {});
    // F15 backward compat: parallel legacy event for 90d of analytics overlap.
    try {
      trackEvent("guest:recap_save_signup");
    } catch {
      // ignore analytics errors
    }

    setAuthModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // AuthModal onSuccess — branch on isNewAccount and migrate if signup
  // ---------------------------------------------------------------------------
  const handleAuthSuccess = async (result: AuthModalSuccessPayload) => {
    setAuthModalOpen(false);

    // No selection (should never happen since button is disabled) — bail.
    if (!selected) {
      onComplete?.();
      return;
    }

    // If the user picked the login tab instead of signup, there's nothing to
    // migrate: their existing account already owns its own characters.
    if (!result.isNewAccount) {
      onComplete?.();
      router.push("/app/dashboard");
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch(
        "/api/player-identity/migrate-guest-character",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestCharacter: selected,
            setAsDefault: true,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { message?: string }).message ??
          `HTTP ${response.status}`;
        throw new Error(message);
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        character?: { id?: string };
      };
      const characterId = payload.character?.id;

      trackConversionCompleted("recap_guest", {
        characterId,
        flow: "signup_and_migrate",
        guestCombatantCount: playerCombatants.length,
      });
      toast.success(tPost("recap_guest", { characterName: selected.name }));
      onComplete?.();
      router.push("/app/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "unknown_error";
      trackConversionFailed("recap_guest", { error: errorMessage });

      // Key may not exist in messages (optional forward-compat); fall back
      // to a hardcoded PT-BR string — user is still logged in and snapshot
      // is preserved, so dashboard-side retry remains possible.
      let toastMessage: string;
      try {
        const hint = t("migration_failed_hint");
        toastMessage =
          hint && hint !== "conversion.recap_guest.migration_failed_hint"
            ? hint
            : MIGRATION_FAIL_FALLBACK_PT;
      } catch {
        toastMessage = MIGRATION_FAIL_FALLBACK_PT;
      }
      toast.error(toastMessage);

      onComplete?.();
      router.push("/app/dashboard");
    } finally {
      setIsMigrating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render — headline, optional picker, primary button, modal portal.
  // ---------------------------------------------------------------------------
  return (
    <Card
      className="p-5 space-y-4 border-gold/30 bg-gold/[0.04]"
      data-testid="recap-cta.guest.root"
    >
      <div className="space-y-2">
        <h2
          className="text-lg font-semibold text-foreground"
          data-testid="recap-cta.guest.headline"
        >
          {headlineNode}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("body", { characterName: displayCharacterName })}
        </p>
      </div>

      {sortedPlayers.length >= 2 && (
        <div
          className="space-y-2 rounded-lg border border-gold/20 bg-card/40 p-3"
          data-testid="recap-cta.guest.picker"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {t("picker_headline")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("picker_hint")}</p>
          <ul className="space-y-1" role="radiogroup">
            {sortedPlayers.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer py-1">
                  <input
                    type="radio"
                    name="guest-character"
                    value={c.id}
                    checked={selectedId === c.id}
                    onChange={() => setSelectedId(c.id)}
                    data-testid={`recap-cta.guest.picker-option-${c.id}`}
                    className="accent-gold"
                  />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    HP {c.current_hp ?? 0}/{c.max_hp ?? 0}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePrimaryClick}
          disabled={!selected || isMigrating}
          aria-disabled={!selected || isMigrating}
          className="px-4 py-2 rounded-lg bg-gold text-black text-sm font-bold hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60 transition-colors min-h-[40px]"
          data-testid="recap-cta.guest.cta-primary"
        >
          {t("cta_primary", { characterName: displayCharacterName })}
        </button>
        <button
          type="button"
          onClick={() => onComplete?.()}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px]"
          data-testid="recap-cta.guest.cta-secondary"
        >
          {t("cta_secondary")}
        </button>
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="signup"
        onSuccess={handleAuthSuccess}
        // D3b: intentionally NO upgradeContext — guest signs up as a fresh
        // account, then migration is handled locally by the fetch above.
      />
    </Card>
  );
}
