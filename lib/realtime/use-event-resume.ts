/**
 * useEventResume — React hook for client-side event reconciliation on reconnect.
 *
 * Caminho A revision (PR #59 review fix, 2026-04-26):
 *   - Cursor source is `_journal_seq` from incoming broadcasts (set by the
 *     server in /api/broadcast). Replaces the previous attempt that read
 *     `state.currentSeq` from the connection-state machine — that field
 *     was sourced from `_broadcastSeq`, a per-tab counter that was always
 *     0 in player tabs (players don't broadcast).
 *   - The tracking primitive `noteSeqFromBroadcast` is exposed; the
 *     caller registers it in their broadcast handler. Every broadcast
 *     that carries `_journal_seq` advances the local cursor.
 *
 * F1a follow-up (2026-04-26): also expose `triggerResume()` so callers
 * that don't drive the DM-side `connection-state.ts` machine (e.g.
 * PlayerJoinClient maintains its own SUBSCRIBED → CONNECTED transitions)
 * can invoke the same debounced resume flow from their own subscribe
 * handler. The auto-trigger via `onConnectionStateChange` still fires
 * for DM-side consumers; player-side calls `triggerResume()` manually.
 *
 * Flow on reconnect:
 *   1. Connection re-subscribes (auto via state machine OR manual via
 *      caller's SUBSCRIBED → triggerResume())
 *   2. After 300ms debounce, hook fetches /events?since_seq=<lastSeenJournalSeq>
 *   3. Endpoint returns:
 *        - { kind: "events", events, currentSeq } → applied via onEvents,
 *          cursor advanced to currentSeq
 *        - { kind: "too_stale" | "empty" } → onFullRefetchNeeded fallback
 *        - HTTP error / network error → onFullRefetchNeeded fallback
 *
 * See: _bmad-output/estabilidade-combate/01-TECH-SPEC.md §3.5 (revised)
 */
import { useEffect, useRef, useCallback } from "react";
import type { SanitizedEvent } from "@/lib/types/realtime";
import { onConnectionStateChange } from "./connection-state";
import { getLastSeenSeq, setLastSeenSeq } from "./event-store";

interface UseEventResumeProps {
  /** Session ID the client is joined to. */
  sessionId: string;
  /** Encounter ID (used in the /events endpoint path). */
  encounterId: string | null;
  /** Session token (plain `session_tokens.token` — same value used by /state). */
  token: string | null;
  /** Apply a batch of SanitizedEvent — typically the same reducer as live broadcasts. */
  onEvents: (events: SanitizedEvent[]) => void;
  /** Signal that a full /state refetch is required (fallback path). */
  onFullRefetchNeeded: () => void;
}

interface UseEventResumeApi {
  /**
   * Caller registers this in their broadcast handlers. Called for every
   * incoming broadcast that includes `_journal_seq` so the local cursor
   * advances in real time. Resume on reconnect uses this cursor.
   */
  noteSeqFromBroadcast: (journalSeq: number | undefined) => void;

  /**
   * Manually trigger a resume fetch. For callers that don't drive the
   * `connection-state.ts` machine (PlayerJoinClient has its own state
   * machine — call this from its SUBSCRIBED handler).
   *
   * Same debounce + abort + fallback flow as the auto-trigger. Idempotent
   * if a resume is already in flight (cancels prior, starts new).
   */
  triggerResume: () => void;
}

const RESUME_DEBOUNCE_MS = 300;
/**
 * AbortController timeout — bound the resume fetch so a hung connection
 * doesn't latch `inFlight=true` forever and silence subsequent reconnects.
 */
const RESUME_FETCH_TIMEOUT_MS = 10_000;

interface EventsJournalEntry {
  seq: number;
  sessionId: string;
  timestamp: string;
  event: SanitizedEvent;
}

type EventsResponse =
  | { kind: "events"; events: EventsJournalEntry[]; currentSeq: number }
  | {
      kind: "too_stale";
      currentSeq: number;
      oldestSeq: number;
      instruction: "refetch_full_state";
    }
  | { kind: "empty"; currentSeq: number };

export function useEventResume({
  sessionId,
  encounterId,
  token,
  onEvents,
  onFullRefetchNeeded,
}: UseEventResumeProps): UseEventResumeApi {
  // Keep latest callbacks in refs so the effect doesn't re-subscribe on every
  // parent re-render (callers typically inline the callbacks).
  const onEventsRef = useRef(onEvents);
  const onFullRefetchRef = useRef(onFullRefetchNeeded);
  useEffect(() => {
    onEventsRef.current = onEvents;
  }, [onEvents]);
  useEffect(() => {
    onFullRefetchRef.current = onFullRefetchNeeded;
  }, [onFullRefetchNeeded]);

  /**
   * Caller registers this in broadcast event handlers. Updates the local
   * cursor whenever a broadcast carries `_journal_seq` from the server.
   */
  const noteSeqFromBroadcast = useCallback(
    (journalSeq: number | undefined) => {
      if (typeof journalSeq !== "number" || journalSeq <= 0) return;
      const current = getLastSeenSeq(sessionId);
      if (journalSeq > current) setLastSeenSeq(sessionId, journalSeq);
    },
    [sessionId],
  );

  // Module-private state for the active resume cycle. Refs (not state) so
  // updates don't trigger re-renders of consumers and so triggerResume()
  // closes over the latest values without becoming dep-unstable.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const unmountedRef = useRef(false);

  const runResume = useCallback(async (): Promise<void> => {
    if (!encounterId || !token) return;
    const lastSeen = getLastSeenSeq(sessionId);

    // Cancel any prior in-flight resume — only the most recent matters.
    if (inFlightAbortRef.current) inFlightAbortRef.current.abort();
    const abort = new AbortController();
    inFlightAbortRef.current = abort;

    const timeoutId = setTimeout(
      () => abort.abort(),
      RESUME_FETCH_TIMEOUT_MS,
    );

    try {
      const qs = new URLSearchParams({
        since_seq: String(lastSeen),
        token,
      });
      const res = await fetch(
        `/api/combat/${encounterId}/events?${qs.toString()}`,
        { signal: abort.signal },
      );
      if (unmountedRef.current) return;
      if (!res.ok) {
        onFullRefetchRef.current();
        return;
      }
      const data = (await res.json()) as EventsResponse;
      if (unmountedRef.current) return;
      if (data.kind === "events") {
        if (data.events.length > 0) {
          onEventsRef.current(data.events.map((e) => e.event));
        }
        // Always advance to currentSeq so a future reconnect doesn't
        // re-fetch the same range. Safe even when events is empty
        // (server says "you are caught up to currentSeq").
        if (data.currentSeq > lastSeen) {
          setLastSeenSeq(sessionId, data.currentSeq);
        }
      } else {
        // too_stale or empty — fall back to full refetch.
        onFullRefetchRef.current();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // expected on unmount/cancel
      if (!unmountedRef.current) onFullRefetchRef.current();
    } finally {
      clearTimeout(timeoutId);
      if (inFlightAbortRef.current === abort) inFlightAbortRef.current = null;
    }
  }, [sessionId, encounterId, token]);

  /** Schedule a debounced resume attempt. Internal helper shared by auto-
   *  trigger (state machine) and manual triggerResume(). */
  const scheduleResume = useCallback(() => {
    if (!encounterId || !token) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runResume();
    }, RESUME_DEBOUNCE_MS);
  }, [encounterId, token, runResume]);

  const triggerResume = useCallback(() => {
    scheduleResume();
  }, [scheduleResume]);

  useEffect(() => {
    if (!encounterId || !token) return;
    unmountedRef.current = false;

    const unsubscribe = onConnectionStateChange((state) => {
      if (state.kind !== "connected") {
        // Cancel any pending resume if we leave `connected` before the debounce fires.
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        return;
      }
      scheduleResume();
    });

    return () => {
      unmountedRef.current = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (inFlightAbortRef.current) inFlightAbortRef.current.abort();
      unsubscribe();
    };
  }, [sessionId, encounterId, token, scheduleResume]);

  return { noteSeqFromBroadcast, triggerResume };
}
