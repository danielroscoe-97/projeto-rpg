"use client";

import { useEffect } from "react";
import { useSrdStore } from "@/lib/stores/srd-store";
import { setFullDataMode } from "@/lib/srd/srd-mode";

/** Triggers SRD data initialization on first client mount.
 *  Renders nothing — pure side-effect component.
 *
 *  Defers initialization via requestIdleCallback (or 2s setTimeout fallback)
 *  so SRD fetches don't compete with the initial page render for network
 *  bandwidth and CPU.
 *
 *  @param fullData - When true, fetches full monster/spell data (including
 *  non-SRD) via auth-gated API route. Default false = SRD-only static files.
 *  @param eager - When true, skip deferral and load immediately (e.g. compendium page).
 */
export function SrdInitializer({ fullData = false, eager = false }: { fullData?: boolean; eager?: boolean }) {
  useEffect(() => {
    setFullDataMode(fullData);

    if (eager) {
      useSrdStore.getState().initializeSrd();
      return;
    }

    // Defer SRD loading until the browser is idle, so the initial page
    // render and hydration complete without contention.
    const schedule =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 3000 })
        : (cb: () => void) => window.setTimeout(cb, 2000);

    const id = schedule(() => useSrdStore.getState().initializeSrd());

    return () => {
      if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof id === "number") {
        window.cancelIdleCallback(id);
      }
    };
  }, [fullData, eager]);

  return null;
}
