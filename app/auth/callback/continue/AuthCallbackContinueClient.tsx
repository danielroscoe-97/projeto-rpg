"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { consumePersistedUpgradeContext } from "@/lib/auth/upgrade-context-storage";
import type { PersistedUpgradeContext } from "@/lib/auth/upgrade-context-storage";
import {
  readGuestMigratePending,
  clearGuestMigratePending,
  readGuestSessionFingerprint,
} from "@/lib/guest/guest-migrate-pending";
import {
  trackConversionCompleted,
  trackConversionFailed,
} from "@/lib/conversion/analytics";
import { normalizeConversionErrorCode } from "@/lib/conversion/error-codes";

type CallbackState = "working" | "error" | "done";

/**
 * Read `identity-upgrade-context-v1` from localStorage. If present, call
 * `/api/player-identity/upgrade` in OAuth mode and then redirect to `next`.
 *
 * Wave 2 C1 fix: we pass `mode: "oauth"` instead of sending placeholder
 * `__oauth__@pocketdm.com.br` credentials. The server route reads the email
 * directly from the authenticated JWT.
 *
 * Wave 2 M5 fix: on upgrade failure we no longer silently redirect after
 * 1.5s — we surface an error banner with a Retry button plus a "continue
 * anyway" escape hatch. Silent redirects were masking real saga failures
 * and leaving users without any actionable feedback. Analytics get a
 * `conversion:failed` event so we can track the real-world rate.
 *
 * Wave 3a (Cluster β) fixes:
 *   - W#2: if `guest-migrate-pending` is set (GuestRecapFlow wrote it before
 *     the OAuth redirect), migrate the guest character AFTER the anon upgrade
 *     branch resolves. OAuth unmounts the whole tab, so GuestRecapFlow's
 *     in-memory state is gone; this key is the only way for the callback to
 *     finish the conversion.
 *   - W#4: fire `conversion:completed` via `trackConversionCompleted` when
 *     the anon `/upgrade` call succeeds and the persisted context carries a
 *     `moment` (Cluster γ populates this when writing the context).
 *   - W#5: replace ad-hoc `trackEvent("conversion:failed", ...)` calls with
 *     `trackConversionFailed(moment, { error, campaignId })` so every
 *     conversion:failed payload has the same shape.
 *
 * Precedence when BOTH persisted (rare — a player could theoretically be in
 * an anon flow AND have saved a guest character in the same tab):
 *   1. `upgradeContext` (anon → auth via `/upgrade`) runs first so the saga
 *      sees the user as anon.
 *   2. `guestMigratePending` (guest → auth via `/migrate-guest-character`)
 *      runs second, now that the user is authenticated.
 */
export function AuthCallbackContinueClient() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("auth.modal");
  const [state, setState] = useState<CallbackState>("working");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // useRef — StrictMode double-invokes effects in dev; we only want one fetch.
  const ranRef = useRef(false);
  // We capture the persisted context on first run so Retry can re-use it
  // without re-reading (the entry is consumed-on-read).
  const contextRef = useRef<PersistedUpgradeContext | null>(null);

  const next = (() => {
    const raw = params.get("next") ?? "/app/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app/dashboard";
  })();

  /**
   * Migrate a pending guest character (written by GuestRecapFlow before
   * OAuth) into `player_characters`. Best-effort: on failure we still clear
   * the pending key so the next page load doesn't loop, and we still
   * redirect — the user can retry from the HQ if they care. Analytics fire
   * either way so we can track the real-world completion rate.
   */
  const runGuestMigrate = useCallback(async (): Promise<void> => {
    const pending = readGuestMigratePending();
    if (!pending) return;

    // Cluster Δ C4 — fingerprint ownership check. If the pending record carries
    // an `ownerFingerprint` (new format) and the current session's fingerprint
    // differs (or is absent), the pending record was written by a different
    // tab / user — most likely another user who opened the modal in this
    // browser, never completed signup, left pending in localStorage, and now a
    // different user is landing on the callback. Clearing + skipping prevents
    // the guest character from migrating to the wrong account. Records without
    // `ownerFingerprint` (legacy, pre-Cluster Δ) are tolerated for backward
    // compat — no check, behaviour unchanged.
    if (pending.ownerFingerprint) {
      const current = readGuestSessionFingerprint();
      if (current !== pending.ownerFingerprint) {
        clearGuestMigratePending();
        // eslint-disable-next-line no-console
        console.warn(
          "[auth/callback] Guest migrate pending fingerprint mismatch — skipping migrate to avoid cross-user contamination.",
        );
        return;
      }
    }

    try {
      const response = await fetch(
        "/api/player-identity/migrate-guest-character",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestCharacter: pending.guestCharacter,
            campaignId: pending.campaignId,
            setAsDefault: true,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        character?: { id?: string };
        code?: string;
      };
      if (response.ok && body?.character?.id) {
        trackConversionCompleted("recap_guest", {
          campaignId: pending.campaignId,
          characterId: body.character.id,
          flow: "signup_and_migrate",
          // Cluster ε (Mary #3) — forward the combatant count that
          // GuestRecapFlow persisted at click time so async OAuth / email
          // guest conversions share the same analytics shape as in-page ones.
          guestCombatantCount: pending.guestCombatantCount,
        });
      } else {
        trackConversionFailed("recap_guest", {
          campaignId: pending.campaignId,
          // Cluster ε (Winston #7) — normalize server code through the
          // allowlist to keep the analytics `error` cardinality bounded.
          error: normalizeConversionErrorCode(
            body?.code ?? `http_${response.status}`,
          ),
        });
      }
    } catch (err) {
      trackConversionFailed("recap_guest", {
        campaignId: pending.campaignId,
        // Cluster ε (Winston #7) — err.name may be any string; allowlist it.
        error: normalizeConversionErrorCode(
          err instanceof Error ? err.name : "network",
        ),
      });
    } finally {
      // Always clear — a zombie key from a partial failure would otherwise
      // retry on every subsequent auth callback, potentially duplicating
      // characters if the previous attempt actually succeeded server-side.
      clearGuestMigratePending();
    }
  }, []);

  const runUpgrade = useCallback(
    async (persisted: PersistedUpgradeContext): Promise<void> => {
      setState("working");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/player-identity/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionTokenId: persisted.sessionTokenId,
            mode: "oauth",
            guestCharacter: persisted.guestCharacter,
          }),
        });

        if (!response.ok) {
          let msg: string | undefined;
          try {
            const body = (await response.json()) as { message?: string };
            msg = typeof body?.message === "string" ? body.message : undefined;
          } catch {
            // non-JSON body — fall back to the generic translation
          }
          // W#5: unified shape via typed helper. `moment` defaults to
          // `recap_anon` when the persisted context predates Cluster γ's
          // moment-tagging (legacy contexts don't carry the field).
          // Cluster ε (Winston #7) — `msg` is a server-localized string that
          // would blow out the analytics `error` cardinality; only allow it
          // through the normalizer. HTTP status maps to `http_${status}`.
          trackConversionFailed(persisted.moment ?? "recap_anon", {
            campaignId: persisted.campaignId,
            error: normalizeConversionErrorCode(
              msg ?? `http_${response.status}`,
            ),
          });
          setErrorMessage(msg ?? t("upgrade_failed"));
          setState("error");
          return;
        }

        // W#4: fire `conversion:completed` when the anon upgrade lands. We
        // only have a `moment` if Cluster γ wrote the context — older
        // contexts (Wave 2 pre-moment) simply don't emit a completed event
        // here; the dashboard post-upgrade hook picks them up.
        // `/api/player-identity/upgrade` does not return a characterId, so
        // we pass only `campaignId + flow` — the analytics payload tolerates
        // `characterId` being optional.
        if (persisted.moment) {
          trackConversionCompleted(persisted.moment, {
            campaignId: persisted.campaignId,
            flow: "upgrade",
          });
        }

        // Cluster Δ Winston#3 — when the anon upgrade succeeded, the server
        // saga has already carried the anon user's character into the
        // authenticated account. Running a parallel /migrate-guest-character
        // here would either double-insert (same character arrives twice) or
        // fire a second redundant `conversion:completed` event. Clear the
        // pending marker and skip — upgrade is the authoritative path.
        // Legitimate guest flows (no upgradeContext) still reach
        // runGuestMigrate via the other branch in the useEffect below.
        clearGuestMigratePending();

        setState("done");
        router.replace(next);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Cluster ε (Winston #7) — Error.name may be any string (custom
        // subclasses, bundler wrappers); keep the analytics dimension bounded
        // by the allowlist.
        trackConversionFailed(persisted.moment ?? "recap_anon", {
          campaignId: persisted.campaignId,
          error: normalizeConversionErrorCode(
            err instanceof Error ? err.name : "network",
          ),
        });
        setErrorMessage(msg || t("upgrade_failed"));
        setState("error");
      }
    },
    [next, router, t],
  );

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const persisted = consumePersistedUpgradeContext();
    if (!persisted) {
      // No anon upgrade to run. We may still have a guest migrate pending
      // (common path: `/try` → email signup → confirmation email → callback
      // with no upgradeContext). Drain it before the redirect so the user
      // lands on the dashboard with their character already persisted.
      void (async () => {
        await runGuestMigrate();
        router.replace(next);
      })();
      return;
    }
    contextRef.current = persisted;
    void runUpgrade(persisted);
  }, [router, next, runUpgrade, runGuestMigrate]);

  const handleRetry = useCallback(() => {
    if (!contextRef.current) {
      router.replace(next);
      return;
    }
    void runUpgrade(contextRef.current);
  }, [next, router, runUpgrade]);

  const handleDismiss = useCallback(() => {
    // W#5: keep using the typed helper for shape consistency. `moment`
    // derives from the context that was in flight when the error surfaced;
    // fallback `recap_anon` when the context is missing (shouldn't happen,
    // since Dismiss is only visible in the error state triggered by a
    // persisted upgrade, but the guard keeps the helper contract honest).
    const ctx = contextRef.current;
    trackConversionFailed(ctx?.moment ?? "recap_anon", {
      campaignId: ctx?.campaignId,
      // Cluster ε (Winston #7) — `user_dismissed` is on the allowlist; the
      // normalize call is defensive and keeps the call-site consistent.
      error: normalizeConversionErrorCode("user_dismissed"),
    });
    router.replace(next);
  }, [next, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-surface-auth p-6"
      data-testid="auth.callback.continue"
    >
      <div className="text-center max-w-md">
        {state === "working" || state === "done" ? (
          <>
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </>
        ) : (
          <div data-testid="auth.callback.continue.error" role="alert">
            <p className="mb-3 text-sm text-red-400">{t("upgrade_failed")}</p>
            {errorMessage && errorMessage !== t("upgrade_failed") ? (
              <p className="mb-4 text-xs text-muted-foreground/80">
                {errorMessage}
              </p>
            ) : null}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={handleRetry}
                data-testid="auth.callback.continue.retry"
                className="rounded-md bg-gold/15 px-4 py-2 text-sm text-gold hover:bg-gold/25 focus:outline-none focus:ring-2 focus:ring-gold/60"
              >
                {t("retry")}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                data-testid="auth.callback.continue.dismiss"
                className="rounded-md border border-white/[0.12] px-4 py-2 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                {t("continue_anyway")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
