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
    const hasIdleCallback =
      typeof window !== "undefined" && "requestIdleCallback" in window;

    const id = hasIdleCallback
      ? window.requestIdleCallback(() => useSrdStore.getState().initializeSrd(), { timeout: 3000 })
      : window.setTimeout(() => useSrdStore.getState().initializeSrd(), 2000);

    return () => {
      if (typeof window === "undefined") return;
      if (hasIdleCallback) window.cancelIdleCallback(id as number);
      else clearTimeout(id);
    };
  }, [fullData, eager]);

  return null;
}
