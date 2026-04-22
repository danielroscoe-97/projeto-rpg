"use client";

import { useCallback, useEffect, useState } from "react";
import { staleIdleMinutes } from "@/components/campaign/StaleSessionConfirm";

/**
 * Epic 12 Story 12.9 AC5 — shared stale-session guard logic.
 *
 * Gates the "enter active combat" action behind a confirmation dialog when
 * the session has been idle for more than 4h (see `STALE_SESSION_THRESHOLD_MS`
 * in StaleSessionConfirm). Prevents accidental hydrate of a stale combat
 * after a browser crash / tab-reopen the next day.
 *
 * Originally duplicated between `CampaignHero` (onboarding path) and
 * `BriefingToday` (post-onboarding path — the real DM flow). Extracted here
 * so a single source of truth owns:
 *   - the threshold comparison (via `staleIdleMinutes`),
 *   - open/cancel/confirm state transitions,
 *   - auto-dismiss when `lastSessionDate` refreshes mid-open (e.g. router
 *     refresh or WebSocket update lands fresh data while the modal is up —
 *     otherwise the modal would display "0 minutes idle" nonsensically).
 *
 * Usage:
 *
 *     const guard = useStaleSessionGuard({
 *       activeSessionId,
 *       lastSessionDate,
 *       onOpenCombatSheet: () => setCombatOpen(true),
 *     });
 *
 *     // Wire the entry button:
 *     <button onClick={guard.requestOpenCombat}>Entrar no combate ativo</button>
 *
 *     // Render the modal wherever shared dialogs live:
 *     <StaleSessionConfirm
 *       open={guard.staleConfirmOpen}
 *       encounterName={activeSessionName}
 *       idleMinutes={guard.idleMinutes ?? 0}
 *       onCancel={guard.cancelStale}
 *       onConfirm={guard.confirmStale}
 *     />
 */
export interface UseStaleSessionGuardOptions {
  /** The active session's ID, or null if no session is active. Guard is a no-op when null. */
  activeSessionId: string | null;
  /** ISO timestamp of the session's last activity — typically `sessions.updated_at`. */
  lastSessionDate: string | null;
  /** Called when the caller should actually open the combat launch sheet (guard passed or confirmed). */
  onOpenCombatSheet: () => void;
}

export interface UseStaleSessionGuardReturn {
  /** Call from your entry button's onClick. Either opens the confirm modal or proceeds directly. */
  requestOpenCombat: () => void;
  /** Pass to `<StaleSessionConfirm open={...}>`. */
  staleConfirmOpen: boolean;
  /** Pass to `<StaleSessionConfirm idleMinutes={idleMinutes ?? 0}>`. Nullable when fresh. */
  idleMinutes: number | null;
  /** Pass to `<StaleSessionConfirm onConfirm={...}>` — dismisses + opens combat sheet. */
  confirmStale: () => void;
  /** Pass to `<StaleSessionConfirm onCancel={...}>` — dismisses without opening. */
  cancelStale: () => void;
}

export function useStaleSessionGuard({
  activeSessionId,
  lastSessionDate,
  onOpenCombatSheet,
}: UseStaleSessionGuardOptions): UseStaleSessionGuardReturn {
  const [staleConfirmOpen, setStaleConfirmOpen] = useState(false);
  const idleMinutes = staleIdleMinutes(lastSessionDate);

  // Auto-dismiss if lastSessionDate refreshes while modal is open and the
  // session is no longer stale. Without this, the modal keeps rendering with
  // `idleMinutes ?? 0` → "0 minutes idle" — nonsensical. Introduced by the
  // 2026-04-21 code-review P3 patch.
  useEffect(() => {
    if (staleConfirmOpen && idleMinutes == null) {
      setStaleConfirmOpen(false);
      onOpenCombatSheet();
    }
  }, [staleConfirmOpen, idleMinutes, onOpenCombatSheet]);

  const requestOpenCombat = useCallback(() => {
    if (activeSessionId && idleMinutes != null) {
      setStaleConfirmOpen(true);
    } else {
      onOpenCombatSheet();
    }
  }, [activeSessionId, idleMinutes, onOpenCombatSheet]);

  const confirmStale = useCallback(() => {
    setStaleConfirmOpen(false);
    onOpenCombatSheet();
  }, [onOpenCombatSheet]);

  const cancelStale = useCallback(() => {
    setStaleConfirmOpen(false);
  }, []);

  return {
    requestOpenCombat,
    staleConfirmOpen,
    idleMinutes,
    confirmStale,
    cancelStale,
  };
}
