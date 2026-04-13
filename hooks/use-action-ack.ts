"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  usePendingActionsStore,
  type PendingAction,
  type PendingActionStatus,
} from "@/lib/stores/pending-actions-store";

// ---------------------------------------------------------------------------
// useActionAck — connects pending actions store to DM re-broadcasts
// ---------------------------------------------------------------------------
// Listens to incoming DM broadcasts (combat:hp_update, combat:condition_change,
// combat:reaction_toggle) and matches them against pending player actions.
// Manages timeout → retry → fail lifecycle for each action.
// ---------------------------------------------------------------------------

/** How long to wait for DM re-broadcast before marking unconfirmed (ms) */
const ACK_TIMEOUT_MS = 5_000;
/** How long to wait after retry before marking failed (ms) */
const RETRY_TIMEOUT_MS = 5_000;
/** Max retries per action */
const MAX_RETRIES = 1;
/** Cleanup interval for stale confirmed/failed actions */
const CLEANUP_INTERVAL_MS = 10_000;

interface UseActionAckOptions {
  /** Function to re-send a broadcast (for retry logic) */
  resendBroadcast: (event: string, payload: Record<string, unknown>) => boolean;
  /** Callback when an action fails permanently — receives rollback snapshot */
  onActionFailed?: (action: PendingAction) => void;
  /** i18n translation function */
  t: (key: string) => string;
}

/** Timer cancel callback — set by useActionAck hook so confirmActionsForCombatant can cancel timers */
let _cancelTimerCallback: ((actionId: string) => void) | null = null;

/**
 * Confirm all pending actions matching a combatant + type.
 * Called from PlayerJoinClient when a DM re-broadcast arrives.
 * P3-fix: also cancels associated ACK timers.
 */
export function confirmActionsForCombatant(
  combatantId: string,
  type: PendingAction["type"]
): void {
  const store = usePendingActionsStore.getState();
  for (const [id, action] of store.actions) {
    if (
      action.combatantId === combatantId &&
      action.type === type &&
      (action.status === "pending" || action.status === "unconfirmed")
    ) {
      store.confirmAction(id);
      _cancelTimerCallback?.(id);
    }
  }
}

/**
 * Hook that manages the timeout/retry/fail lifecycle for pending actions.
 * Must be called inside PlayerJoinClient.
 */
export function useActionAck({ resendBroadcast, onActionFailed, t }: UseActionAckOptions) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup interval
  useEffect(() => {
    const interval = setInterval(() => {
      usePendingActionsStore.getState().cleanup(CLEANUP_INTERVAL_MS);
    }, CLEANUP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // P3-fix: wire cancel callback so confirmActionsForCombatant can cancel timers
  const cancelTimer = useCallback((actionId: string) => {
    const timer = timersRef.current.get(actionId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(actionId);
    }
  }, []);

  useEffect(() => {
    _cancelTimerCallback = cancelTimer;
    return () => { _cancelTimerCallback = null; };
  }, [cancelTimer]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  /**
   * Start the ACK timeout for a pending action.
   * Called right after addAction + broadcast send.
   */
  const startAckTimer = useCallback(
    (actionId: string, broadcastEvent: string) => {
      // Clear any existing timer for this action
      const existing = timersRef.current.get(actionId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        timersRef.current.delete(actionId);
        const store = usePendingActionsStore.getState();
        const action = store.actions.get(actionId);
        if (!action || action.status !== "pending") return;

        // Mark unconfirmed
        store.markUnconfirmed(actionId);

        if (action.retryCount < MAX_RETRIES) {
          // Retry: re-send broadcast
          toast(t("ack_retrying"), { duration: 2000 });
          store.retryAction(actionId);
          const retried = resendBroadcast(broadcastEvent, action.payload);

          if (retried) {
            // Start retry timeout
            const retryTimer = setTimeout(() => {
              timersRef.current.delete(actionId);
              const retryState = usePendingActionsStore.getState();
              const retriedAction = retryState.actions.get(actionId);
              if (!retriedAction || retriedAction.status === "confirmed") return;

              // Retry also failed
              retryState.failAction(actionId);
              toast.error(t("ack_failed"), { duration: 4000 });
              onActionFailed?.(retriedAction);
            }, RETRY_TIMEOUT_MS);
            timersRef.current.set(actionId, retryTimer);
          } else {
            // Can't send (offline) — fail immediately
            store.failAction(actionId);
            toast.error(t("ack_failed"), { duration: 4000 });
            onActionFailed?.(action);
          }
        } else {
          // Max retries exceeded
          store.failAction(actionId);
          toast.error(t("ack_failed"), { duration: 4000 });
          onActionFailed?.(action);
        }
      }, ACK_TIMEOUT_MS);

      timersRef.current.set(actionId, timer);
    },
    [resendBroadcast, onActionFailed, t]
  );

  /**
   * Cancel the ACK timer for an action (called when confirmed early).
   */
  const cancelAckTimer = useCallback((actionId: string) => {
    const timer = timersRef.current.get(actionId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(actionId);
    }
  }, []);

  /**
   * Get visual status for a combatant (memoize-friendly helper).
   */
  const getCombatantPendingStatus = useCallback(
    (combatantId: string) =>
      usePendingActionsStore.getState().getCombatantStatus(combatantId),
    []
  );

  return {
    startAckTimer,
    cancelAckTimer,
    getCombatantPendingStatus,
    confirmActionsForCombatant,
  };
}

/** Type for the pending state prop passed to UI components */
export type CombatantPendingState = {
  hp?: PendingActionStatus;
  death_save?: PendingActionStatus;
  condition?: PendingActionStatus;
  reaction?: PendingActionStatus;
};
