"use client";

import { useEffect, useRef, useCallback } from "react";
import { trackEvent } from "@/lib/analytics/track";

const LP_SECTIONS = [
  "hero",
  "features",
  "social-proof",
  "how-it-works",
  "comparison",
  "final-cta",
] as const;

/**
 * Landing page analytics tracker.
 * - Section views via IntersectionObserver (threshold 0.3, fire once)
 * - Scroll depth quartiles (25/50/75/100)
 * - CTA clicks via event delegation
 *
 * Place once inside the LP — renders nothing visible.
 */
export function LandingPageTracker() {
  const trackedSections = useRef(new Set<string>());
  const trackedDepths = useRef(new Set<number>());

  // Section view tracking via IntersectionObserver
  // Uses data-section attributes as canonical section names (language-independent)
  useEffect(() => {
    const sections = document.querySelectorAll("section[data-section]");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const sectionName = (entry.target as HTMLElement).dataset.section;
          if (!sectionName || trackedSections.current.has(sectionName)) continue;
          trackedSections.current.add(sectionName);
          trackEvent("lp:section_view", { section: sectionName });
        }
      },
      { threshold: 0.3 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Scroll depth tracking (quartiles)
  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const quartile of [25, 50, 75, 100]) {
        if (pct >= quartile && !trackedDepths.current.has(quartile)) {
          trackedDepths.current.add(quartile);
          trackEvent("page:scroll_depth", { depth: quartile });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // CTA click tracking via event delegation
  const handleCtaClick = useCallback((e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
    if (!link) return;

    const href = link.getAttribute("href");
    let cta: string | null = null;

    if (href === "/try") cta = "try_free";
    else if (href === "/auth/sign-up") cta = "signup";
    else if (href === "/auth/login") cta = "login";
    else if (href === "/pricing") cta = "pricing";

    if (cta) {
      trackEvent("lp:cta_click", { cta });
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleCtaClick);
    return () => document.removeEventListener("click", handleCtaClick);
  }, [handleCtaClick]);

  return null;
}
