"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Automatic page view tracker. Emits `page:view` on every route change.
 * Place once in the root layout — covers all pages.
 *
 * Captures UTM params on first load for attribution tracking.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string>("");

  useEffect(() => {
    // Deduplicate — don't emit twice for same path
    if (pathname === lastPath.current) return;
    // Skip API and admin routes
    if (pathname.startsWith("/api/") || pathname.startsWith("/admin")) return;

    lastPath.current = pathname;

    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");

    trackEvent("page:view", {
      path: pathname,
      ...(utmSource && { utm_source: utmSource }),
      ...(utmMedium && { utm_medium: utmMedium }),
      ...(utmCampaign && { utm_campaign: utmCampaign }),
    });
  }, [pathname, searchParams]);

  return null;
}
