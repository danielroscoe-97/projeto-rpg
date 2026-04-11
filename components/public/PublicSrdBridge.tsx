"use client";

import { useEffect, useRef } from "react";
import { useContentAccess } from "@/lib/hooks/use-content-access";
import { setFullDataMode } from "@/lib/srd/srd-mode";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";

/**
 * Auth-aware SRD initialization bridge for public pages.
 *
 * - Deslogado → SRD-only mode (loads from /srd/*.json)
 * - Beta tester logado → Full data mode (loads from /api/srd/full/)
 * - On access revocation → clears pinned cards to prevent non-SRD leaks
 *
 * Renders nothing — pure side-effect component.
 */
export function PublicSrdBridge() {
  const { canAccess, isLoading } = useContentAccess();
  const srdLoading = useSrdStore((s) => s.is_loading);
  const loadedMode = useSrdStore((s) => s.loadedMode);
  const prevCanAccess = useRef<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // P4: Clear pinned cards when access is revoked (logout/session expiry)
    // to prevent non-SRD content from persisting in floating cards
    if (prevCanAccess.current === true && !canAccess) {
      usePinnedCardsStore.getState().unpinAll();
    }
    prevCanAccess.current = canAccess;

    // P5: Only call initializeSrd when the store is NOT already loading
    // and the loaded mode doesn't match. This prevents the is_loading
    // guard inside initializeSrd from silently dropping a mode switch.
    const requestedMode = canAccess ? "full" : "public";
    if (srdLoading || loadedMode === requestedMode) return;

    setFullDataMode(canAccess);
    useSrdStore.getState().initializeSrd();
  }, [canAccess, isLoading, srdLoading, loadedMode]);

  return null;
}
