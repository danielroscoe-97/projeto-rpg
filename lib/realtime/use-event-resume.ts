/**
 * useEventResume — React hook for client-side event reconciliation on reconnect.
 *
 * Caminho A revision (PR #59 review fix, 2026-04-26):
 *   - Cursor source is now `_journal_seq` from incoming broadcasts (set by
 *     the server in /api/broadcast). This replaces the previous attempt
 *     that read `state.currentSeq` from the connection-state machine —
 *     that field was sourced from `_broadcastSeq`, a per-tab counter that
 *     was always 0 in player tabs (players don't broadcast).
 *   - The tracking primitive is exposed as `noteSeqFromBroadcast` so the
 *     caller registers it in their broadcast handler. Every time a
 *     broadcast arrives with `_journal_seq`, the caller calls this to
 *     advance the local cursor.
 *
 * Flow on reconnect:
 *   1. Connection state transitions: connecting → connected
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
import {
  onConnectionStateChange,
  type ConnectionState,
} from "./connection-state";
import { getLastSeenSeq, setLastSeenSeq } from "./event-store";

interface UseEventResumeProps {
  /** Session ID the client is joined to. */
  sessionId: string;
  /** Encounter ID (used in the /events endpoint path). */
  encounterId: string | null;
  /** Session token (for endpoint auth). */
  token: string | null;
  /** Apply a batch of SanitizedEvent — typically the same reducer as live broadcasts. */
  onEvents: (events: SanitizedEvent[]) => void;
  /** Signal that a full /state refetch is required (fallback path). */
  onFullRefetchNeeded: () => void;
}

interface UseEventResumeApi {
  /**
   * Caller registers this in their broadcast handler. Called for every
   * incoming broadcast that includes `_journal_seq` so the local cursor
   * advances in real time. Resume on reconnect uses this cursor.
   */
  noteSeqFromBroadcast: (journalSeq: number | undefined) => void;
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

  useEffect(() => {
    if (!encounterId || !token) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let inFlightAbort: AbortController | null = null;
    let unmounted = false;

    const unsubscribe = onConnectionStateChange((state) => {
      if (state.kind !== "connected") {
        // Cancel any pending resume if we leave `connected` before the debounce fires.
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        return;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        runResume(state);
      }, RESUME_DEBOUNCE_MS);
    });

    async function runResume(
      _state: Extract<ConnectionState, { kind: "connected" }>,
    ): Promise<void> {
      const lastSeen = getLastSeenSeq(sessionId);

      // Cancel any prior in-flight resume — only the most recent matters.
      if (inFlightAbort) inFlightAbort.abort();
      const abort = new AbortController();
      inFlightAbort = abort;

      const timeoutId = setTimeout(
        () => abort.abort(),
        RESUME_FETCH_TIMEOUT_MS,
      );

      try {
        const qs = new URLSearchParams({
          since_seq: String(lastSeen),
          token: token!,
        });
        const res = await fetch(
          `/api/combat/${encounterId}/events?${qs.toString()}`,
          { signal: abort.signal },
        );
        if (unmounted) return;
        if (!res.ok) {
          onFullRefetchRef.current();
          return;
        }
        const data = (await res.json()) as EventsResponse;
        if (unmounted) return;
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
        if (!unmounted) onFullRefetchRef.current();
      } finally {
        clearTimeout(timeoutId);
        if (inFlightAbort === abort) inFlightAbort = null;
      }
    }

    return () => {
      unmounted = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (inFlightAbort) inFlightAbort.abort();
      unsubscribe();
    };
  }, [sessionId, encounterId, token]);

  return { noteSeqFromBroadcast };
}
