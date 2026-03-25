"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  brand: string;
  brandHref: string;
  links?: NavLink[];
  rightSlot?: React.ReactNode;
}

export function Navbar({ brand, brandHref, links = [], rightSlot }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            className="font-display text-xl text-gold tracking-tight min-h-[44px] inline-flex items-center gap-2 hover:drop-shadow-[0_0_8px_rgba(212,168,83,0.4)] transition-all duration-[250ms]"
          >
            <Image src="/art/icons/pet-poring.png" alt="" width={28} height={28} className="pixel-art" aria-hidden="true" unoptimized />
            {brand}
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1 ml-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground font-medium px-3 py-2 rounded-lg hover:text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right slot (desktop) */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {rightSlot}
          </div>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="md:hidden ml-auto flex flex-col gap-[5px] p-2 min-h-[44px] min-w-[44px] items-center justify-center"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
      </nav>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-[72px] z-40 glass-nav border-b border-white/[0.08] p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground font-medium px-4 py-3 rounded-lg hover:text-foreground hover:bg-white/[0.06] transition-all duration-[250ms] min-h-[44px] flex items-center"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          {rightSlot && (
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center gap-3">
              {rightSlot}
            </div>
          )}
        </div>
      )}
    </>
  );
}
