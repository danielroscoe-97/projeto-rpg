"use client";

import { useTranslations } from "next-intl";

interface StreakBadgeProps {
  weeks: number;
}

export function StreakBadge({ weeks }: StreakBadgeProps) {
  const t = useTranslations("dashboard");

  if (weeks < 2) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1">
      <span className="text-base leading-none">🔥</span>
      <span className="text-sm font-medium text-orange-400">
        {t("streak_weeks", { count: weeks })}
      </span>
    </div>
  );
}
