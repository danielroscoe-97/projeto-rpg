/**
 * Event Journal — Postgres-backed (combat_events table).
 *
 * Caminho A fix (PR #59 code review, 2026-04-26): the previous in-memory
 * Map-based implementation was broken because `recordEvent` ran in the DM
 * browser while `getEventsSince` ran in the serverless function — separate
 * runtimes meant the Map was always empty server-side and resume returned
 * `kind: "empty"` every time.
 *
 * The journal now lives in `combat_events` (migration 184). Writes happen
 * server-side from `/api/broadcast` AFTER sanitization (already the
 * anti-metagaming gate). Reads happen server-side from
 * `/api/combat/[id]/events`. All runtimes share Postgres state.
 *
 * Per-session cap of 100 entries is enforced by an AFTER INSERT trigger
 * (`trim_combat_events_per_session`) — matches the in-memory ring buffer
 * semantics from the original MVP design.
 *
 * Sequence: bigserial GLOBAL (not per-session). Seqs ARE monotonic within
 * a session because INSERTs serialize, but gaps are expected when other
 * sessions interleave. Clients only compare `seq > since_seq`, which is
 * order-preserving regardless of gaps.
 *
 * Server-only module — must NOT be imported from client bundles. Using
 * `createServiceClient` enforces server-side only at runtime; this module
 * has no `"use client"` directive and importing it client-side would fail
 * to bundle the service-role key (env var is server-only).
 *
 * See: _bmad-output/estabilidade-combate/01-TECH-SPEC.md §3.3 (revised)
 */
import { createServiceClient } from "@/lib/supabase/server";
import { captureWarning } from "@/lib/errors/capture";
import type { SanitizedEvent } from "@/lib/types/realtime";

export interface JournalEntry {
  /** Global monotonic seq from combat_events.seq (bigserial). */
  seq: number;
  sessionId: string;
  /** ISO 8601 timestamp from combat_events.created_at. */
  timestamp: string;
  event: SanitizedEvent;
}

export type EventsSinceResult =
  | {
      kind: "events";
      events: JournalEntry[];
      currentSeq: number;
    }
  | {
      kind: "too_stale";
      currentSeq: number;
      oldestSeq: number;
      /** Spec §3.4 — explicit instruction to client; included since the
       *  alternative (silent kind discrimination) was a CR-02 spec drift. */
      instruction: "refetch_full_state";
    }
  | {
      kind: "empty";
      currentSeq: number;
    };

const BUFFER_CAP = 100;

/**
 * Record an event in the journal. Called server-side from /api/broadcast
 * AFTER sanitization. Returns the assigned `seq` so the broadcast payload
 * can carry it as `_journal_seq` for client-side resume cursor tracking.
 *
 * Failure mode: returns null on DB error. Callers should still broadcast
 * (the event still reaches connected players via the channel) — only
 * resume for late-reconnects is impacted.
 */
export async function recordEvent(
  sessionId: string,
  event: SanitizedEvent,
): Promise<number | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("combat_events")
      .insert({
        session_id: sessionId,
        event_type: event.type,
        event: event as unknown as Record<string, unknown>,
      })
      .select("seq")
      .single();

    if (error || !data) {
      // P-14 fix (2026-04-26 review): surface to Sentry so the F14
      // dashboard can graph recordEvent failure rate alongside
      // too_stale_rate. Silent console.warn meant a Postgres outage
      // would degrade resume coverage with no visible signal.
      captureWarning("[event-journal] recordEvent failed", {
        component: "event-journal",
        action: "recordEvent",
        category: "database",
        sessionId,
        extra: { errorMessage: error?.message, eventType: event.type },
      });
      return null;
    }
    // Postgres bigserial returns as number-like; coerce to be safe.
    return typeof data.seq === "number" ? data.seq : Number(data.seq);
  } catch (err) {
    captureWarning("[event-journal] recordEvent threw", {
      component: "event-journal",
      action: "recordEvent",
      category: "database",
      sessionId,
      extra: { errorMessage: (err as Error).message, eventType: event.type },
    });
    return null;
  }
}

/**
 * Retrieve events with seq > sinceSeq for a given session.
 *
 * Response shapes (discriminated by `kind`):
 *   - `events`: events newer than sinceSeq (may be empty list if up-to-date)
 *   - `too_stale`: sinceSeq is older than the oldest buffered event for
 *      this session — client should refetch full state
 *   - `empty`: no events recorded for this session (cold start, never
 *      broadcast, or just-trimmed)
 */
export async function getEventsSince(
  sessionId: string,
  sinceSeq: number,
): Promise<EventsSinceResult> {
  const supabase = createServiceClient();

  // Single query: newest events for this session, capped at BUFFER_CAP+1
  // so we can detect too_stale. Ordering DESC + reversing client-side
  // simplifies the index access.
  const { data, error } = await supabase
    .from("combat_events")
    .select("seq, session_id, event, created_at")
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(BUFFER_CAP);

  if (error) {
    captureWarning("[event-journal] getEventsSince failed", {
      component: "event-journal",
      action: "getEventsSince",
      category: "database",
      sessionId,
      extra: { errorMessage: error.message, sinceSeq },
    });
    return { kind: "empty", currentSeq: 0 };
  }

  if (!data || data.length === 0) {
    return { kind: "empty", currentSeq: 0 };
  }

  // data is DESC; first row is currentSeq (newest), last is oldestSeq.
  const currentSeq = Number(data[0].seq);
  const oldestSeq = Number(data[data.length - 1].seq);

  // Gap too large: client cursor is older than what we still have buffered.
  // Use `oldestSeq - 1` boundary to match the spec semantics: sinceSeq=49
  // when oldestSeq=50 means "you are caught up to seq 49, next is 50" —
  // we still have everything from 50 onward, so it's NOT too_stale.
  if (sinceSeq < oldestSeq - 1) {
    return {
      kind: "too_stale",
      currentSeq,
      oldestSeq,
      instruction: "refetch_full_state",
    };
  }

  // Filter and reverse to ASC order so the client applies events in the
  // order the DM emitted them.
  const events: JournalEntry[] = data
    .filter((row) => Number(row.seq) > sinceSeq)
    .map((row) => ({
      seq: Number(row.seq),
      sessionId: row.session_id as string,
      timestamp: row.created_at as string,
      event: row.event as unknown as SanitizedEvent,
    }))
    .reverse();

  return { kind: "events", events, currentSeq };
}
