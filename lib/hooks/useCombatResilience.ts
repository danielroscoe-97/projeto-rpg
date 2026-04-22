"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { saveCombatBackup } from "@/lib/stores/combat-persist";
import { reconcileFullState } from "@/lib/supabase/combat-sync";
import { replayOfflineQueue, broadcastEvent } from "@/lib/realtime/broadcast";
import { setSyncStatus } from "@/lib/realtime/offline-queue";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // exponential-ish backoff
const DM_HEARTBEAT_INTERVAL = 30_000; // 30s — players detect stale after 2 missed beats (~90s)
const STATE_SYNC_DEDUP_MS = 3_000; // P3: Prevent duplicate state_sync within 3s

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
  const lastStateSyncRef = useRef(0); // P3: dedup guard for state_sync broadcasts

  // Force-save current state to localStorage (called on unload + offline).
  //
  // QA 2026-04-22 P1-5 (Epic 12 Wave 1 full feature): also save in setup mode
  // (encounter_id=null). This lets F5 during combatant setup preserve the work
  // — previously only live combats were backed up, so users lost any monsters
  // they'd added before clicking "Iniciar Combate". Gated by session_id so we
  // never save a backup that can't be matched on recovery.
  const flushToLocalStorage = useCallback(() => {
    const state = useCombatStore.getState();
    const hasScope = state.encounter_id || state.session_id;
    if (hasScope && state.combatants.length > 0) {
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
          `/api/combat/${state.session_id}/dm-heartbeat`,
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

    // Unified reconnect: replay offline queue → broadcast state_sync (with dedup) → sync DB
    // Fixes P2 (flicker), P3 (duplicate broadcast), P4 (missing replay on visibility)
    const reconnectAndSync = async () => {
      if (!mountedRef.current) return;
      const state = useCombatStore.getState();
      if (state.session_id) {
        // Replay queued broadcast events first (sets status to "syncing" internally)
        await replayOfflineQueue(state.session_id);
        // E3: Force full state sync — deduplicated within 3s window
        const now = Date.now();
        if (
          state.is_active && state.encounter_id && state.combatants.length > 0 &&
          now - lastStateSyncRef.current > STATE_SYNC_DEDUP_MS
        ) {
          lastStateSyncRef.current = now;
          broadcastEvent(state.session_id, {
            type: "session:state_sync",
            combatants: state.combatants,
            current_turn_index: state.current_turn_index,
            round_number: state.round_number,
            encounter_id: state.encounter_id,
          });
        }
      }
      // Reconcile full state to DB
      syncToDatabase();
    };

    const handleOnline = () => {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        // P2: Immediately mark "syncing" to prevent flicker (module-level listener sets "online" first)
        setSyncStatus("syncing");
        // Small delay to let the network stabilize, then full reconnect
        timerRef.current = setTimeout(reconnectAndSync, 1500);
      }
    };

    // --- 3. Visibility change: sync when tab comes back if we were offline ---
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && wasOfflineRef.current && navigator.onLine) {
        wasOfflineRef.current = false;
        // P2: Mark syncing immediately
        setSyncStatus("syncing");
        // P4: Full reconnect (including replay) — same path as handleOnline
        // Cancel any pending handleOnline timeout to avoid double-run
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(reconnectAndSync, 500);
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
