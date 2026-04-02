"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function AuthError({
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
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-surface-auth border border-white/10 rounded-lg p-6 space-y-4">
          <h1 className="text-xl font-semibold text-white font-[family-name:var(--font-cinzel)]">
            {t("auth_title")}
          </h1>
          <p className="text-sm text-white/60">
            {t("auth_description")}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 bg-gold text-surface-primary rounded-md font-semibold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] hover:shadow-gold-glow w-full"
            >
              {t("retry")}
            </button>
            <Link
              href="/auth/login"
              className="px-4 py-2 border border-gold/30 text-gold rounded-md text-sm min-h-[44px] flex items-center justify-center hover:bg-gold/10 transition-colors w-full"
            >
              {t("auth_back_to_login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
