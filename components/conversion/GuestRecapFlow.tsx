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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import {
  writeGuestMigratePending,
  clearGuestMigratePending,
} from "@/lib/guest/guest-migrate-pending";
import type { Combatant } from "@/lib/types/combat";
import type { SaveSignupContext } from "./types";

export interface GuestRecapFlowProps {
  context: Extract<SaveSignupContext, { mode: "guest" }>;
  onComplete?: () => void;
}

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

  // Q#9 — defensive dedupe by id. Snapshots can occasionally contain
  // duplicate combatant ids after certain add-back flows; keep the first
  // occurrence so the radio group remains a well-formed set.
  const dedupedPlayers = useMemo(() => {
    const seen = new Set<string>();
    const out: Combatant[] = [];
    for (const c of sortedPlayers) {
      if (seen.has(c.id)) {
        // eslint-disable-next-line no-console
        console.warn(
          `GuestRecapFlow: duplicate combatant id ${c.id}, keeping first`,
        );
        continue;
      }
      seen.add(c.id);
      out.push(c);
    }
    return out;
  }, [sortedPlayers]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // W#7 — sync selectedId with the current player list. Handles snapshot
  // refreshes where the single-player case flips, players are removed, or the
  // currently-selected id disappears.
  useEffect(() => {
    if (dedupedPlayers.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (dedupedPlayers.length === 1) {
      const onlyId = dedupedPlayers[0].id;
      if (selectedId !== onlyId) setSelectedId(onlyId);
      return;
    }
    // 2+ players — if the currently selected id is no longer present, clear it
    // so the user picks again; otherwise leave the user's choice untouched.
    if (selectedId && !dedupedPlayers.some((c) => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [dedupedPlayers, selectedId]);

  // Q#13 — track mounted state so we don't call setState / router.push /
  // toast after the component unmounts (eg. user navigated away mid-fetch).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const selected = dedupedPlayers.find((c) => c.id === selectedId) ?? null;
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

    // W#2 — persist the selected guest character BEFORE the AuthModal opens
    // so the async return paths (OAuth redirect, email-confirm bounceback)
    // can finish the migration even if this component unmounts. Idempotent:
    //   - OAuth:       callback reads the pending record after redirect
    //   - Email:       no session on return → W#1 rewrites the same record
    //   - Live signup: migrate runs → clearGuestMigratePending() cleans up
    try {
      writeGuestMigratePending({
        guestCharacter: selected,
        campaignId: context.campaignId,
      });
    } catch {
      // storage failure is best-effort — live-session path still POSTs directly.
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

    // W#1 — when Supabase has `enable_confirmations = true`, `signUp()`
    // returns without a session: the user must click the confirmation email
    // first. Without a session, the migrate POST would 401 and kill 100% of
    // email guest conversions. Detect that case via getSession() and defer
    // the migrate to the post-confirm callback (W#2 already persisted the
    // pending record). Toast + onComplete without redirect: the AuthModal
    // has already shown its "check your email" screen.
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Re-persist defensively — writeGuestMigratePending is idempotent and
        // this also covers a narrow case where W#2 failed but W#1 still has a
        // selection. Key exists in both locales (pt-BR + en).
        try {
          writeGuestMigratePending({
            guestCharacter: selected,
            campaignId: context.campaignId,
          });
        } catch {
          // best-effort storage
        }
        toast.success(tPost("recap_guest_email_pending"));
        onComplete?.();
        return;
      }
    } catch {
      // If getSession itself fails, fall through to the live-session path —
      // the server will reject with 401 and we'll handle via catch below.
    }

    setIsMigrating(true);
    let responseStatus = 0;
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
      responseStatus = response.status;

      // Q#6 — endpoint contract: 200 returns { ok: true, character } but 4xx/5xx
      // returns { ok: false, code, message }. A hand-rolled 200-with-ok:false
      // would also slip past !response.ok; pin both. Additionally require
      // character.id so downstream analytics / redirect have a real id.
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        message?: string;
        character?: { id?: string };
      };

      if (
        !response.ok ||
        payload?.ok === false ||
        !payload?.character?.id
      ) {
        const err = new Error(
          payload?.code ?? payload?.message ?? `HTTP ${response.status}`,
        );
        // Attach the normalized error code for analytics downstream (W#8).
        (err as Error & { code?: string }).code =
          payload?.code ?? `http_${response.status}`;
        throw err;
      }

      if (!mountedRef.current) {
        // Migrate succeeded but the user navigated away — clean up the
        // pending marker so the callback path doesn't re-run migrate.
        clearGuestMigratePending();
        return;
      }

      // W#2 cleanup — live-session migrate succeeded, drop the pending
      // record so the callback path doesn't duplicate.
      clearGuestMigratePending();

      trackConversionCompleted("recap_guest", {
        // M#1 — include campaignId so the funnel can segment by campaign context
        // when guest-with-campaign flows land (future edge case).
        campaignId: context.campaignId,
        characterId: payload.character.id,
        flow: "signup_and_migrate",
        guestCombatantCount: playerCombatants.length,
      });
      toast.success(tPost("recap_guest", { characterName: selected.name }));
      onComplete?.();
      router.push("/app/dashboard");
    } catch (err) {
      if (!mountedRef.current) return;

      // W#8 — prefer the server-returned code (we attached it above on the
      // Error), else err.name, else "unknown". Never send err.message as the
      // analytics error because the server returns PT-BR error strings that
      // would pollute the metric cardinality.
      const errorCode =
        (err as Error & { code?: string })?.code ??
        (err instanceof Error && err.name !== "Error" ? err.name : null) ??
        "unknown";

      trackConversionFailed("recap_guest", {
        error: errorCode,
        campaignId: context.campaignId,
      });

      // Q#14 — 429 is a legit retry-with-backoff case; keep the modal open so
      // the user can try again, and avoid the dashboard redirect that would
      // strand them.
      if (responseStatus === 429) {
        toast.error(t("rate_limit_hint"));
        setAuthModalOpen(true);
        return;
      }

      // i18n cleanup — key now guaranteed present in both locales; direct use.
      toast.error(t("migration_failed_hint"));
      onComplete?.();
      router.push("/app/dashboard");
    } finally {
      if (mountedRef.current) setIsMigrating(false);
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

      {dedupedPlayers.length >= 2 && (
        <div
          className="space-y-2 rounded-lg border border-gold/20 bg-card/40 p-3"
          data-testid="recap-cta.guest.picker"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {t("picker_headline")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("picker_hint")}</p>
          <ul className="space-y-1" role="radiogroup">
            {dedupedPlayers.map((c) => (
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
