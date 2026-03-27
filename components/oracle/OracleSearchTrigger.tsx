"use client";

import { useTranslations } from "next-intl";

/**
 * A compact search trigger button for the Navbar.
 * Dispatches Ctrl+K to open the CommandPalette.
 */
export function OracleSearchTrigger() {
  const t = useTranslations("command_palette");

  function handleClick() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:text-foreground transition-all duration-[250ms] min-h-[36px]"
      aria-label={t("trigger_aria")}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <span className="hidden xl:inline">{t("trigger_aria")}</span>
      <kbd className="hidden xl:inline text-[10px] font-mono px-1 py-0.5 bg-white/[0.06] rounded border border-white/[0.08]">
        Ctrl+K
      </kbd>
    </button>
  );
}
