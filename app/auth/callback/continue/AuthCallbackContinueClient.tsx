"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { consumePersistedUpgradeContext } from "@/lib/auth/upgrade-context-storage";

type CallbackState = "working" | "error";

/**
 * Read `identity-upgrade-context-v1` from localStorage. If present, call
 * `/api/player-identity/upgrade` and then redirect to `next`. If absent,
 * just redirect. Errors are soft — we log and still route to `next` so a
 * failed upgrade doesn't strand the user.
 */
export function AuthCallbackContinueClient() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("auth.modal");
  const [state, setState] = useState<CallbackState>("working");
  // useRef — StrictMode double-invokes effects in dev; we only want one fetch.
  const ranRef = useRef(false);

  const next = (() => {
    const raw = params.get("next") ?? "/app/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app/dashboard";
  })();

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const persisted = consumePersistedUpgradeContext();
    if (!persisted) {
      router.replace(next);
      return;
    }

    (async () => {
      try {
        const response = await fetch("/api/player-identity/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionTokenId: persisted.sessionTokenId,
            // OAuth already provided credentials — the saga only needs the
            // session token + optional character. We pass a placeholder
            // email/password so the server shape check doesn't reject; the
            // server relies on the authenticated JWT for identity (see
            // app/api/player-identity/upgrade/route.ts).
            credentials: {
              email: "__oauth__@pocketdm.com.br",
              password: "__oauth__",
            },
            guestCharacter: persisted.guestCharacter,
          }),
        });

        if (!response.ok) {
          // Keep the error visible briefly, then continue so the user isn't
          // stranded on a white page. The saga's recovery endpoint can be
          // invoked from the dashboard.
          setState("error");
          setTimeout(() => router.replace(next), 1500);
          return;
        }

        router.replace(next);
      } catch {
        setState("error");
        setTimeout(() => router.replace(next), 1500);
      }
    })();
  }, [router, next]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-surface-auth p-6"
      data-testid="auth.callback.continue"
    >
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        <p className="text-sm text-muted-foreground">
          {state === "error" ? t("upgrade_failed") : t("loading")}
        </p>
      </div>
    </div>
  );
}
