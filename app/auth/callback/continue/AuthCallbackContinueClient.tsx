"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { consumePersistedUpgradeContext } from "@/lib/auth/upgrade-context-storage";
import type { PersistedUpgradeContext } from "@/lib/auth/upgrade-context-storage";
import { trackEvent } from "@/lib/analytics/track";

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
          trackEvent("conversion:failed", {
            stage: "oauth_upgrade",
            status: response.status,
            reason: msg ?? "http_error",
          });
          setErrorMessage(msg ?? t("upgrade_failed"));
          setState("error");
          return;
        }

        setState("done");
        router.replace(next);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        trackEvent("conversion:failed", {
          stage: "oauth_upgrade",
          status: 0,
          reason: "network",
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
      router.replace(next);
      return;
    }
    contextRef.current = persisted;
    void runUpgrade(persisted);
  }, [router, next, runUpgrade]);

  const handleRetry = useCallback(() => {
    if (!contextRef.current) {
      router.replace(next);
      return;
    }
    void runUpgrade(contextRef.current);
  }, [next, router, runUpgrade]);

  const handleDismiss = useCallback(() => {
    trackEvent("conversion:failed", {
      stage: "oauth_upgrade",
      status: -1,
      reason: "user_dismissed",
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
