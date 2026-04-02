"use client";

import { useTranslations } from "next-intl";

/**
 * Navbar button that opens the Oracle AI modal.
 * Dispatches a custom event that OracleAIModal listens for.
 */
export function OracleAITrigger() {
  const t = useTranslations("oracle_ai");

  function handleClick() {
    window.dispatchEvent(new CustomEvent("open-oracle-ai"));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-oracle bg-oracle/10 border border-oracle/20 hover:bg-oracle/20 hover:text-oracle-light transition-all duration-[250ms] min-h-[36px]"
      aria-label={t("trigger_label")}
    >
      <span aria-hidden="true">✨</span>
      <span className="hidden xl:inline">{t("trigger_label")}</span>
    </button>
  );
}
