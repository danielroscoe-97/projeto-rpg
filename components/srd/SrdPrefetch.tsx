"use client";

import { useEffect } from "react";

/**
 * Prefetches SRD JSON files after the page is idle.
 * Uses requestIdleCallback so it never blocks the main thread or delays LP render.
 * Priority order: monsters-2014 (default ruleset) first, then smaller files.
 */

const SRD_FILES = [
  "/srd/monsters-2014.json",
  "/srd/conditions.json",
  "/srd/spells-2014.json",
  "/srd/monsters-2024.json",
  "/srd/spells-2024.json",
  "/srd/items.json",
];

function prefetchFiles() {
  for (const href of SRD_FILES) {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = href;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
}

export function SrdPrefetch() {
  useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(prefetchFiles);
      return () => cancelIdleCallback(id);
    }
    // Fallback: wait 2s after mount
    const timer = setTimeout(prefetchFiles, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
