"use client";

import { useState, useCallback } from "react";
import { PublicMobileMenu } from "./PublicMobileMenu";

type Locale = "en" | "pt-BR";

interface PublicNavClientProps {
  locale: Locale;
}

export function PublicNavClient({ locale }: PublicNavClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCloseMobile = useCallback(() => setMobileOpen(false), []);

  const handleSearchClick = useCallback(() => {
    // Dispatch Ctrl+K to open command palette (same pattern as Navbar)
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      }),
    );
  }, []);

  return (
    <>
      {/* Search trigger — always visible */}
      <button
        type="button"
        onClick={handleSearchClick}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-foreground transition-colors"
        aria-label="Search"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {/* Hamburger — mobile only */}
      <button
        type="button"
        className="lg:hidden flex flex-col gap-[5px] p-2 min-h-[44px] min-w-[44px] items-center justify-center"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
      >
        <span
          className={`block w-5 h-[2px] bg-gray-400 rounded-full transition-all duration-[250ms] ${
            mobileOpen ? "rotate-45 translate-y-[7px]" : ""
          }`}
        />
        <span
          className={`block w-5 h-[2px] bg-gray-400 rounded-full transition-all duration-[250ms] ${
            mobileOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block w-5 h-[2px] bg-gray-400 rounded-full transition-all duration-[250ms] ${
            mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
          }`}
        />
      </button>

      {/* Mobile menu drawer */}
      <PublicMobileMenu
        open={mobileOpen}
        onClose={handleCloseMobile}
        locale={locale}
      />
    </>
  );
}
