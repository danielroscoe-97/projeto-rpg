"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { saveCombatBackup } from "@/lib/stores/combat-persist";
import { reconcileFullState } from "@/lib/supabase/combat-sync";
import { replayOfflineQueue, broadcastEvent } from "@/lib/realtime/broadcast";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // exponential-ish backoff
const DM_HEARTBEAT_INTERVAL = 30_000; // 30s — players detect stale after 2 missed beats (~90s)

/**
 * Combat resilience hook — handles:
 * 1. beforeunload/pagehide: force-save to localStorage so no data is lost on tab close
 * 2. Online/offline detection: track connection status
 * 3. Reconnection sync: when going offline→online, push full Zustand state to DB
 * 4. Retry with backoff: if reconciliation fails, retry up to 3 times
 * 5. DM heartbeat: updates dm_last_seen_at every 30s (players detect stale after ~90s)
 *
 * Race condition mitigation: reads Zustand state at the moment of the DB write
 * (not when the sync was scheduled), so the latest DM state is always pushed.
 */
export function useCombatResilience() {
  const wasOfflineRef = useRef(false);
  const isSyncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);
  const dmUserIdRef = useRef<string | null>(null);

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

  // DM heartbeat — updates dm_last_seen_at in DB (lightweight, no full state broadcast)
  const dmHeartbeat = useCallback(async () => {
    if (document.visibilityState === "hidden") return; // Don't heartbeat when hidden
    const state = useCombatStore.getState();
    if (!state.session_id || !state.is_active) return;

    try {
      const supabase = createClient();

      // Cache DM user ID for sendBeacon on pagehide
      if (!dmUserIdRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) dmUserIdRef.current = user.id;
      }

      await supabase
        .from("sessions")
        .update({ dm_last_seen_at: new Date().toISOString() })
        .eq("id", state.session_id);
    } catch {
      // Heartbeat is best-effort — next one will update
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // --- 1. beforeunload / pagehide: flush to localStorage + DM disconnect ---
    const handleBeforeUnload = () => {
      flushToLocalStorage();
    };

    // pagehide is more reliable on mobile (Safari doesn't always fire beforeunload)
    const handlePageHide = () => {
      flushToLocalStorage();
      // Best-effort: clear dm_last_seen_at so players know DM is gone
      const state = useCombatStore.getState();
      if (state.session_id && navigator.sendBeacon && dmUserIdRef.current) {
        navigator.sendBeacon(
          `/api/session/${state.session_id}/dm-heartbeat`,
          new Blob([JSON.stringify({ offline: true, dm_user_id: dmUserIdRef.current })], { type: "application/json" })
        );
      }
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
        timerRef.current = setTimeout(async () => {
          if (!mountedRef.current) return;
          // Replay queued broadcast events first, then sync full state to DB
          const state = useCombatStore.getState();
          if (state.session_id) {
            await replayOfflineQueue(state.session_id);
          }
          syncToDatabase();
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

    // --- 5. DM heartbeat: update dm_last_seen_at every 30s ---
    dmHeartbeat(); // Immediate on mount
    heartbeatRef.current = setInterval(dmHeartbeat, DM_HEARTBEAT_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushToLocalStorage, syncToDatabase, dmHeartbeat]);
}
