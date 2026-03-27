"use client";

import { useTranslations } from "next-intl";

/**
 * Floating Action Button for mobile — opens the Command Palette.
 * Hidden on desktop (lg: breakpoint) where the Navbar trigger + Ctrl+K are available.
 */
export function OracleFAB() {
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
      className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gold text-surface-primary shadow-lg shadow-gold/20 flex items-center justify-center hover:bg-gold/90 active:scale-95 transition-all"
      aria-label={t("trigger_aria")}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    </button>
  );
}
