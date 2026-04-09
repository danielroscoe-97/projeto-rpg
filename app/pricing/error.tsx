"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function PricingError({
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
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-xl font-semibold text-white font-[family-name:var(--font-cinzel)]">
          {t("pricing_title")}
        </h1>
        <p className="text-sm text-white/60">
          {t("pricing_description")}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-gold text-surface-primary rounded-md font-semibold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] hover:shadow-gold-glow"
          >
            {t("retry")}
          </button>
          <Link
            href="mailto:support@pocketdm.com.br"
            className="text-sm text-gold/70 hover:text-gold transition-colors"
          >
            {t("pricing_contact")}
          </Link>
        </div>
      </div>
    </div>
  );
}
