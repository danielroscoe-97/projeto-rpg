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
import { normalizeConversionErrorCode } from "@/lib/conversion/error-codes";
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
  //
  // Cluster ε (Winston #4) — the memo stays pure (no side-effects in its
  // reducer); the diagnostic log + failure breadcrumb moves to the effect
  // below. This fixes a React anti-pattern where the memo's side-effect
  // would fire on every render with duplicates AND on every unrelated
  // re-render that didn't change the deduped array (when dev/StrictMode
  // double-runs reducers). The effect runs exactly once per `sortedPlayers`
  // change and only when a dedupe actually happened.
  const dedupedPlayers = useMemo(() => {
    const seen = new Set<string>();
    const out: Combatant[] = [];
    for (const c of sortedPlayers) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  }, [sortedPlayers]);

  // Cluster ε (Winston #4) — log/breadcrumb side-effect, kept out of the
  // memo so it fires exactly once per snapshot change where dedupe had an
  // actual effect. Shipping console.warn to prod is intentional (low volume,
  // bounded) — it surfaces suspicious snapshots without PII.
  useEffect(() => {
    const duped = sortedPlayers.length - dedupedPlayers.length;
    if (duped <= 0) return;
    // eslint-disable-next-line no-console
    console.warn(
      `GuestRecapFlow: deduped ${duped} combatant(s) with duplicate ids`,
    );
    try {
      trackConversionFailed("recap_guest", {
        error: "dup_id_dedupe",
        campaignId: context.campaignId,
      });
    } catch {
      // analytics best-effort — the UX is already correct.
    }
  }, [sortedPlayers, dedupedPlayers, context.campaignId]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  // Cluster ε (Quinn #10) — 429 retry cooldown. When the server rate-limits
  // the migrate call, we reopen the AuthModal but also lock the primary CTA
  // (on the card itself, not inside the modal) for 15s so a frustrated user
  // can't spam-click their way past the limiter. Null → unlocked;
  // timestamp (ms) → locked until that wall-clock time.
  const [retryLockedUntil, setRetryLockedUntil] = useState<number | null>(
    null,
  );
  const isRetryLocked =
    retryLockedUntil !== null && Date.now() < retryLockedUntil;

  // Cluster ε (Quinn #10) — auto-clear the retry lock when the cooldown
  // window elapses. We avoid setInterval polling by scheduling a single
  // timer exactly at the expiry moment. Re-runs when `retryLockedUntil`
  // changes (eg. a second 429 during cooldown extends the lock).
  useEffect(() => {
    if (retryLockedUntil === null) return;
    const remaining = retryLockedUntil - Date.now();
    if (remaining <= 0) {
      setRetryLockedUntil(null);
      return;
    }
    const timer = setTimeout(() => setRetryLockedUntil(null), remaining);
    return () => clearTimeout(timer);
  }, [retryLockedUntil]);

  // Cluster Δ C2 — client-side dedupe of the conversion event + migrate POST.
  // A 429 retry can cause the user to click succeed-signup twice in quick
  // succession; re-entrance of `handleAuthSuccess` would otherwise fire
  // trackConversionCompleted twice AND trigger a second (duplicating)
  // /migrate-guest-character POST. This ref flips true after the first
  // success path fires analytics and stays sticky for the lifetime of the
  // component — subsequent re-enters short-circuit to a no-op (clearPending +
  // onComplete).
  const conversionFiredRef = useRef(false);

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
    //
    // Cluster ε (Mary #3) — carry `guestCombatantCount` (dedupe-post count)
    // so the callback's conversion:completed payload matches the in-page
    // success path's shape.
    try {
      writeGuestMigratePending({
        guestCharacter: selected,
        campaignId: context.campaignId,
        guestCombatantCount: dedupedPlayers.length,
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
      // Cluster Δ C4 — never leak the pending migrate to a subsequent user
      // that may OAuth on this browser within the TTL window.
      clearGuestMigratePending();
      onComplete?.();
      return;
    }

    // Cluster Δ C2 — 429 / fast-double-click dedupe. If we've already fired a
    // successful completion, skip fetch entirely. The pending record is
    // already cleared from the first success; just close out cleanly.
    if (conversionFiredRef.current) {
      clearGuestMigratePending();
      onComplete?.();
      if (result.isNewAccount) router.push("/app/dashboard");
      return;
    }

    // If the user picked the login tab instead of signup, there's nothing to
    // migrate: their existing account already owns its own characters.
    // Cluster Δ C4 — clear the pending record so a subsequent OAuth signup
    // by a different user on the same browser cannot accidentally consume
    // this guest's character.
    if (!result.isNewAccount) {
      clearGuestMigratePending();
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
        // Cluster ε (Mary #3) — propagate guestCombatantCount so the callback
        // can forward it to analytics.
        try {
          writeGuestMigratePending({
            guestCharacter: selected,
            campaignId: context.campaignId,
            guestCombatantCount: dedupedPlayers.length,
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

      // Cluster ε (Quinn #9) — UUID shape check. The server contract is that
      // `character.id` is a v4 UUID; accepting anything else would poison the
      // analytics `characterId` dimension and (worse) send a malformed id to
      // downstream navigation. If we ever see a non-UUID we treat the response
      // as a failure, normalize to the `invalid_character_id` sentinel, and
      // fall into the existing error-toast path.
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const characterIdValid =
        typeof payload?.character?.id === "string" &&
        UUID_RE.test(payload.character.id);

      if (
        !response.ok ||
        payload?.ok === false ||
        !payload?.character?.id ||
        !characterIdValid
      ) {
        const err = new Error(
          payload?.code ?? payload?.message ?? `HTTP ${response.status}`,
        );
        // Attach the normalized error code for analytics downstream (W#8).
        // If we have a payload.code keep it; if the character.id failed the
        // shape check, surface an `invalid_character_id` sentinel so the
        // funnel distinguishes this from a generic HTTP failure.
        (err as Error & { code?: string }).code =
          payload?.code ??
          (!characterIdValid && response.ok && payload?.ok !== false
            ? "invalid_character_id"
            : `http_${response.status}`);
        throw err;
      }

      // Cluster Δ C3 — fire analytics BEFORE the mount-check. Analytics is a
      // fire-and-forget side-effect with no DOM writes; if the component has
      // unmounted mid-fetch but the server succeeded, we STILL want the
      // funnel to record the conversion (otherwise we drop a legit sale).
      // Cluster Δ C2 — flip the dedupe flag up-front so a re-entrance (e.g.
      // user clicks the modal success button twice) cannot double-record.
      conversionFiredRef.current = true;
      trackConversionCompleted("recap_guest", {
        // M#1 — include campaignId so the funnel can segment by campaign context
        // when guest-with-campaign flows land (future edge case).
        campaignId: context.campaignId,
        characterId: payload.character.id,
        flow: "signup_and_migrate",
        // Cluster ε (Mary #3) — use the deduped count so in-page + callback
        // conversion events agree, and so a snapshot with duplicate ids does
        // not over-report.
        guestCombatantCount: dedupedPlayers.length,
      });
      // W#2 cleanup — live-session migrate succeeded, drop the pending
      // record so the callback path doesn't duplicate. Also done before the
      // mount-check so an unmounted user who later returns doesn't re-migrate.
      clearGuestMigratePending();

      if (!mountedRef.current) {
        // Migrate succeeded but the user navigated away — analytics + cleanup
        // already ran above; just bail without touching DOM (toast/router).
        return;
      }

      toast.success(tPost("recap_guest", { characterName: selected.name }));
      onComplete?.();
      router.push("/app/dashboard");
    } catch (err) {
      if (!mountedRef.current) return;

      // W#8 — prefer the server-returned code (we attached it above on the
      // Error), else err.name, else "unknown". Never send err.message as the
      // analytics error because the server returns PT-BR error strings that
      // would pollute the metric cardinality.
      const rawCode =
        (err as Error & { code?: string })?.code ??
        (err instanceof Error && err.name !== "Error" ? err.name : null) ??
        "unknown";
      // Cluster ε (Winston #7) — collapse anything off-allowlist to `unknown`
      // so a server-evolved code (eg. `internal_db_error_${uuid}`) cannot
      // explode the analytics `error` cardinality.
      const errorCode = normalizeConversionErrorCode(rawCode);

      trackConversionFailed("recap_guest", {
        error: errorCode,
        campaignId: context.campaignId,
      });

      // Q#14 — 429 is a legit retry-with-backoff case; keep the modal open so
      // the user can try again, and avoid the dashboard redirect that would
      // strand them.
      //
      // Cluster ε (Quinn #10) — lock the primary CTA for 15s post-429 so a
      // frustrated user can't immediately resubmit and trip the limiter
      // again. The lock visually disables the button AND blocks the onClick
      // handler (see the `disabled` prop below).
      if (responseStatus === 429) {
        setRetryLockedUntil(Date.now() + 15_000);
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
          // Cluster ε (Quinn #10) — `isRetryLocked` blocks the button while
          // the post-429 cooldown is in effect, in addition to the no-selection
          // and in-flight-migrate guards.
          disabled={!selected || isMigrating || isRetryLocked}
          aria-disabled={!selected || isMigrating || isRetryLocked}
          data-retry-locked={isRetryLocked ? "true" : undefined}
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
        onOpenChange={(open) => {
          // Cluster Δ C4 — when the user closes the modal WITHOUT completing
          // signup (cancel / X button), drop the pending migrate record. Any
          // subsequent OAuth on the same browser by a different user would
          // otherwise inherit this guest's character within the 10-min TTL.
          // Only clear when we haven't already fired a conversion (successful
          // paths clear on their own and shouldn't be stomped here).
          if (!open && !conversionFiredRef.current) {
            clearGuestMigratePending();
          }
          setAuthModalOpen(open);
        }}
        defaultTab="signup"
        onSuccess={handleAuthSuccess}
        // D3b: intentionally NO upgradeContext — guest signs up as a fresh
        // account, then migration is handled locally by the fetch above.
      />
    </Card>
  );
}
