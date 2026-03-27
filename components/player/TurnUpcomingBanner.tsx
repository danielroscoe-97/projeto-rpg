"use client";

import { useTranslations } from "next-intl";

interface TurnUpcomingBannerProps {
  visible: boolean;
}

export function TurnUpcomingBanner({ visible }: TurnUpcomingBannerProps) {
  const t = useTranslations("player");

  if (!visible) return null;

  return (
    <div
      className="bg-amber-500/15 border border-amber-400/50 rounded-lg px-4 py-3 text-center transition-opacity duration-200"
      role="status"
      aria-live="polite"
      data-testid="turn-upcoming-banner"
    >
      <span className="text-amber-300 font-semibold text-sm">
        {t("turn_upcoming")}
      </span>
    </div>
  );
}
