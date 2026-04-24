/**
 * useEventResume — React hook for client-side event reconciliation on reconnect.
 *
 * Observes the connection state machine (CR-01). When we transition into
 * `connected`, check the gap between `state.currentSeq` and our locally
 * persisted `lastSeenSeq`. If there's a gap, fetch the missed events via
 * the journal endpoint (CR-02) and apply them via the caller-provided
 * reducer. Fall back to a full /state refetch if the gap is too large
 * (too_stale), the buffer is empty, or the fetch fails.
 *
 * Debounce (300ms) ensures a flap like `connected → reconnecting → connected`
 * in <300ms does not fire two resume requests in parallel. The natural rest
 * state after reconnect is "connected for longer than 300ms", so 300ms is
 * a safe threshold with negligible UX impact.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-03-client-event-resume.md
 */
import { useEffect, useRef } from "react";
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

const RESUME_DEBOUNCE_MS = 300;

interface EventsJournalEntry {
  seq: number;
  sessionId: string;
  timestamp: number;
  event: SanitizedEvent;
}

type EventsResponse =
  | { kind: "events"; events: EventsJournalEntry[]; currentSeq: number }
  | { kind: "too_stale"; currentSeq: number; oldestSeq: number }
  | { kind: "empty"; currentSeq: number };

export function useEventResume({
  sessionId,
  encounterId,
  token,
  onEvents,
  onFullRefetchNeeded,
}: UseEventResumeProps): void {
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

  useEffect(() => {
    if (!encounterId || !token) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;

    const unsubscribe = onConnectionStateChange((state) => {
      if (state.kind !== "connected") {
        // Cancel any pending resume if we leave `connected` before the debounce fires.
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        return;
      }
      if (inFlight) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        runResume(state);
      }, RESUME_DEBOUNCE_MS);
    });

    async function runResume(
      state: Extract<ConnectionState, { kind: "connected" }>,
    ): Promise<void> {
      const lastSeen = getLastSeenSeq(sessionId);
      // currentSeq is 0 on a fresh module (no broadcasts yet) — treat as "nothing to catch up on".
      // Also skip when client is at-or-ahead of server (idempotent no-op).
      if (state.currentSeq === 0 || lastSeen >= state.currentSeq) return;

      inFlight = true;
      try {
        const qs = new URLSearchParams({
          since_seq: String(lastSeen),
          token: token!,
        });
        const res = await fetch(
          `/api/combat/${encounterId}/events?${qs.toString()}`,
        );
        if (!res.ok) {
          onFullRefetchRef.current();
          return;
        }
        const data = (await res.json()) as EventsResponse;
        if (data.kind === "events") {
          // Apply the missed events. Caller's reducer handles idempotency
          // via the same `_seq` discarding live broadcasts already use.
          if (data.events.length > 0) {
            onEventsRef.current(data.events.map((e) => e.event));
            // Advance cursor to the currentSeq, not the last event's seq,
            // so a future reconnect doesn't re-fetch events we already applied.
            setLastSeenSeq(sessionId, data.currentSeq);
          }
        } else {
          // too_stale or empty — fall back to full refetch.
          onFullRefetchRef.current();
        }
      } catch {
        onFullRefetchRef.current();
      } finally {
        inFlight = false;
      }
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [sessionId, encounterId, token]);
}
