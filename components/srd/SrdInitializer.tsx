"use client";

import { useEffect } from "react";
import { useSrdStore } from "@/lib/stores/srd-store";
import { setFullDataMode } from "@/lib/srd/srd-mode";

/** Triggers SRD data initialization on first client mount.
 *  Renders nothing — pure side-effect component.
 *
 *  @param fullData - When true, fetches full monster/spell data (including
 *  non-SRD) via auth-gated API route. Default false = SRD-only static files.
 */
export function SrdInitializer({ fullData = false }: { fullData?: boolean }) {
  useEffect(() => {
    setFullDataMode(fullData);
    useSrdStore.getState().initializeSrd();
  }, [fullData]);

  return null;
}
