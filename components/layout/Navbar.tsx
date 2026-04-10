"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

interface NavLink {
  href?: string;
  label: React.ReactNode;
  children?: { href: string; label: React.ReactNode }[];
  tourId?: string;
}

interface NavbarProps {
  brand: string;
  brandHref: string;
  links?: NavLink[];
  rightSlot?: React.ReactNode;
  /** Optional sync status dot — rendered next to brand text */
  syncSlot?: React.ReactNode;
  /** Hide mobile hamburger, search, and drawer — used during onboarding wizard */
  minimal?: boolean;
}

export function Navbar({ brand, brandHref, links = [], rightSlot, syncSlot, minimal }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // D5: Close mobile drawer on route change (browser back/forward)
  useEffect(() => { setMobileOpen(false) }, [pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center px-6 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] border-b ${
          scrolled
            ? "glass-nav border-white/[0.08]"
            : "bg-transparent border-transparent"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-6 w-full">
          {/* Brand */}
          <Link
            href={brandHref}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="relative z-50 font-display text-lg text-gold tracking-[0.15em] uppercase font-bold min-h-[44px] inline-flex items-center gap-2 hover:drop-shadow-[0_0_8px_rgba(212,168,83,0.4)] transition-all duration-[250ms]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/brand/logo-icon.svg" alt="" width={36} height={36} className="pointer-events-none drop-shadow-[0_0_8px_rgba(212,168,83,0.3)]" aria-hidden="true" />
            {brand}
            {syncSlot}
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1 ml-6">
            {links.map((link) =>
              link.children ? (
                <DropdownMenu key={link.label?.toString()}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="text-sm text-muted-foreground font-medium px-3 py-2 rounded-lg hover:text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] min-h-[44px] inline-flex items-center gap-1"
                      data-tour-id={link.tourId}
                    >
                      {link.label}
                      <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-surface-secondary border-white/10 shadow-xl backdrop-blur-none">
                    {link.children.map((child) => (
                      <DropdownMenuItem key={child.href} asChild>
                        <Link
                          href={child.href}
                          className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={link.href}
                  href={link.href!}
                  className="text-sm text-muted-foreground font-medium px-3 py-2 rounded-lg hover:text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>

          {/* Right slot (desktop) */}
          <div className="hidden lg:flex items-center gap-3 ml-auto">
            {rightSlot}
          </div>

          {/* Mobile right actions: search + hamburger — hidden in minimal mode */}
          <div className={`lg:hidden ml-auto flex items-center gap-1${minimal ? " hidden" : ""}`}>
            {/* Search trigger (mobile) — opens Command Palette */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    ctrlKey: true,
                    bubbles: true,
                  }),
                );
              }}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-foreground transition-colors"
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

            {/* Hamburger */}
            <button
              type="button"
              className="flex flex-col gap-[5px] p-2 min-h-[44px] min-w-[44px] items-center justify-center"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? t("close_menu") : t("open_menu")}
            aria-expanded={mobileOpen}
          >
            <span
              className={`block w-5 h-[2px] bg-muted-foreground rounded-full transition-all duration-[250ms] ${
                mobileOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`block w-5 h-[2px] bg-muted-foreground rounded-full transition-all duration-[250ms] ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-5 h-[2px] bg-muted-foreground rounded-full transition-all duration-[250ms] ${
                mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-[72px] bottom-0 z-40 bg-background border-b border-white/[0.08] p-4 lg:hidden overflow-y-auto flex flex-col">
          <ErrorBoundary name="MobileDrawer">
            <div className="flex flex-col gap-1">
              {links.map((link) =>
                link.children ? (
                  <div key={link.label?.toString()}>
                    <span className="text-muted-foreground font-medium px-4 py-3 min-h-[44px] flex items-center text-sm">
                      {link.label}
                    </span>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="text-muted-foreground font-medium pl-8 pr-4 py-3 rounded-lg hover:text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] min-h-[44px] flex items-center"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href!}
                    className="text-muted-foreground font-medium px-4 py-3 rounded-lg hover:text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] min-h-[44px] flex items-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
            {rightSlot && (
              <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center gap-3">
                {rightSlot}
              </div>
            )}
          </ErrorBoundary>

          {/* Quick value prop — fills empty space */}
          <div className="mt-auto pb-6 pt-6 text-center">
            <p className="text-xs text-muted-foreground/40 leading-relaxed">
              {t("mobile_tagline")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
