"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { saveCombatBackup } from "@/lib/stores/combat-persist";
import { reconcileFullState } from "@/lib/supabase/combat-sync";
import { toast } from "sonner";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // exponential-ish backoff

/**
 * Combat resilience hook — handles:
 * 1. beforeunload/pagehide: force-save to localStorage so no data is lost on tab close
 * 2. Online/offline detection: track connection status
 * 3. Reconnection sync: when going offline→online, push full Zustand state to DB
 * 4. Retry with backoff: if reconciliation fails, retry up to 3 times
 *
 * Race condition mitigation: reads Zustand state at the moment of the DB write
 * (not when the sync was scheduled), so the latest DM state is always pushed.
 */
export function useCombatResilience() {
  const wasOfflineRef = useRef(false);
  const isSyncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  // Force-save current state to localStorage (called on unload + offline)
  const flushToLocalStorage = useCallback(() => {
    const state = useCombatStore.getState();
    if (state.encounter_id && state.combatants.length > 0) {
      saveCombatBackup(state);
    }
  }, []);

  // Full state reconciliation: push Zustand → Supabase
  // Reads state at call time (not schedule time) to avoid race conditions
  const syncToDatabase = useCallback(async () => {
    if (isSyncingRef.current) return;

    // Read state NOW — this is the latest DM state, mitigating race with normal writes
    const state = useCombatStore.getState();
    if (!state.encounter_id || !state.is_active || state.combatants.length === 0) {
      retryCountRef.current = 0;
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
        if (mountedRef.current) {
          toast.success("Combate sincronizado!", { id: toastId, duration: 2000 });
        }
        retryCountRef.current = 0;
      } else {
        // Retry with backoff
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retryCountRef.current] ?? 8000;
          retryCountRef.current++;
          wasOfflineRef.current = true; // keep offline flag for retry
          if (mountedRef.current) {
            toast.error(
              `Sincronização falhou (tentativa ${retryCountRef.current}/${MAX_RETRIES}). Retentando...`,
              { id: toastId, duration: delay }
            );
            timerRef.current = setTimeout(() => {
              if (mountedRef.current) syncToDatabase();
            }, delay);
          }
        } else {
          if (mountedRef.current) {
            toast.error("Falha ao sincronizar após 3 tentativas. Recarregue a página.", {
              id: toastId,
              duration: 10000,
            });
          }
          retryCountRef.current = 0;
        }
      }
    } catch {
      // Network-level error — retry
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCountRef.current] ?? 8000;
        retryCountRef.current++;
        wasOfflineRef.current = true;
        if (mountedRef.current) {
          toast.error("Erro de rede. Retentando...", { id: toastId, duration: delay });
          timerRef.current = setTimeout(() => {
            if (mountedRef.current) syncToDatabase();
          }, delay);
        }
      } else {
        if (mountedRef.current) {
          toast.error("Falha ao sincronizar. Recarregue a página.", {
            id: toastId,
            duration: 10000,
          });
        }
        retryCountRef.current = 0;
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

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
      retryCountRef.current = 0;
      flushToLocalStorage();
      toast.warning("Sem conexão — suas ações estão salvas localmente", {
        duration: 4000,
      });
    };

    const handleOnline = () => {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        // Small delay to let the network stabilize
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) syncToDatabase();
        }, 1500);
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
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushToLocalStorage, syncToDatabase]);
}
