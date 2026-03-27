"use client";

import { useTranslations } from "next-intl";

/**
 * Purple "Homebrew" badge shown on search results for user-created content.
 */
export function HomebrewBadge() {
  const t = useTranslations("homebrew");
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 border border-purple-500/30">
      {t("badge")}
    </span>
  );
}
