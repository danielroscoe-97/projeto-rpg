"use client";

/**
 * /invite/[token] error boundary (M12 from code review).
 *
 * Catches throws from `detectInviteState` (Supabase outages, unexpected RPC
 * shape, etc.) and renders a friendly retry surface instead of the Next.js
 * default error page. Delegates to `reset()` so the user can retry without
 * reloading the whole tab. Copy pulled from the shared `error_boundary`
 * namespace (consistent with the auth + compendium boundaries).
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error_boundary");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      data-testid="invite.landing.error-boundary"
      className="flex min-h-[60vh] w-full items-center justify-center p-6"
    >
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-xl font-semibold text-white font-[family-name:var(--font-cinzel)]">
          {t("invite_title")}
        </h1>
        <p className="text-sm text-white/60">
          {t("invite_description")}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            data-testid="invite.landing.error-boundary.retry"
            onClick={reset}
            className="px-4 py-2 bg-gold text-surface-primary rounded-md font-semibold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] hover:shadow-gold-glow"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            data-testid="invite.landing.error-boundary.back"
            className="px-4 py-2 border border-gold/30 text-gold rounded-md text-sm min-h-[44px] flex items-center justify-center hover:bg-gold/10 transition-colors"
          >
            {t("invite_back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
