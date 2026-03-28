"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { saveCombatBackup } from "@/lib/stores/combat-persist";
import { reconcileFullState } from "@/lib/supabase/combat-sync";
import { toast } from "sonner";

/**
 * Combat resilience hook — handles:
 * 1. beforeunload/pagehide: force-save to localStorage so no data is lost on tab close
 * 2. Online/offline detection: track connection status
 * 3. Reconnection sync: when going offline→online, push full Zustand state to DB
 *
 * This ensures the DM never loses combat actions, even during internet outages.
 */
export function useCombatResilience() {
  const wasOfflineRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Force-save current state to localStorage (called on unload + offline)
  const flushToLocalStorage = useCallback(() => {
    const state = useCombatStore.getState();
    if (state.encounter_id && state.combatants.length > 0) {
      saveCombatBackup(state);
    }
  }, []);

  // Full state reconciliation: push Zustand → Supabase
  const syncToDatabase = useCallback(async () => {
    if (isSyncingRef.current) return;

    const state = useCombatStore.getState();
    if (!state.encounter_id || !state.is_active || state.combatants.length === 0) {
      return;
    }

    isSyncingRef.current = true;
    const toastId = toast.loading("Sincronizando combate...");

    try {
      const result = await reconcileFullState(
        state.encounter_id,
        state.combatants,
        state.round_number,
        state.current_turn_index,
        state.is_active
      );

      if (result.success) {
        toast.success("Combate sincronizado!", { id: toastId, duration: 2000 });
      } else {
        toast.error(`Erro ao sincronizar: ${result.error}`, {
          id: toastId,
          duration: 5000,
        });
      }
    } catch {
      toast.error("Falha ao sincronizar combate", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // --- 1. beforeunload / pagehide: flush to localStorage ---
    const handleBeforeUnload = () => {
      flushToLocalStorage();
    };

    // pagehide is more reliable on mobile (Safari doesn't always fire beforeunload)
    const handlePageHide = () => {
      flushToLocalStorage();
    };

    // --- 2. Online/offline detection ---
    const handleOffline = () => {
      wasOfflineRef.current = true;
      flushToLocalStorage();
      toast.warning("Sem conexão — suas ações estão salvas localmente", {
        duration: 4000,
      });
    };

    const handleOnline = () => {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        // Small delay to let the network stabilize
        setTimeout(() => {
          syncToDatabase();
        }, 1000);
      }
    };

    // --- 3. Visibility change: sync when tab comes back if we were offline ---
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && wasOfflineRef.current && navigator.onLine) {
        wasOfflineRef.current = false;
        syncToDatabase();
      }
      // Always flush when hiding (user might be switching tabs before closing)
      if (document.visibilityState === "hidden") {
        flushToLocalStorage();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Check if already offline on mount
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushToLocalStorage, syncToDatabase]);
}
