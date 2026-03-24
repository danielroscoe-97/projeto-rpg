"use client";

import { useEffect } from "react";
import { useSrdStore } from "@/lib/stores/srd-store";

/** Triggers SRD data initialization on first client mount.
 *  Renders nothing — pure side-effect component. */
export function SrdInitializer() {
  useEffect(() => {
    useSrdStore.getState().initializeSrd();
  }, []);

  return null;
}
