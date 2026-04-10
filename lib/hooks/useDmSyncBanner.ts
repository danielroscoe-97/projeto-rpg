"use client";

import { useEffect, useState } from "react";
import { getSyncStatus, onSyncStatusChange, type SyncStatus } from "@/lib/realtime/offline-queue";

export type DmBannerState = "online" | "offline" | "syncing";

/**
 * Tracks the DM's sync status for persistent banner display.
 * Unlike toasts (which disappear), this provides a persistent state
 * that can drive a visible banner in the combat UI.
 */
export function useDmSyncBanner(): DmBannerState {
  const [state, setState] = useState<DmBannerState>(() => {
    const s = getSyncStatus();
    return s === "syncing" ? "syncing" : s === "offline" ? "offline" : "online";
  });

  useEffect(() => {
    const unsub = onSyncStatusChange((status: SyncStatus) => {
      if (status === "offline" || status === "error") {
        setState("offline");
      } else if (status === "syncing") {
        setState("syncing");
      } else {
        setState("online");
      }
    });
    return unsub;
  }, []);

  return state;
}
