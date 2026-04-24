/**
 * Event Journal — in-memory ring buffer of recent broadcast events per session.
 *
 * Purpose: enable sequence-cursor based resume when a client reconnects.
 * Without this, reconnect forces a full /state refetch — expensive, slow,
 * and fragile if DB 504s during persist (replay state could diverge from
 * live state).
 *
 * Architecture is standard for multiplayer/chat systems (IRC since 1988,
 * Matrix /sync, Slack RTM, Discord Gateway Resume). See tech spec §3.3.
 *
 * MVP constraints (intentional):
 *   - In-memory Map — serverless cold start loses the journal; client falls
 *     back to /state fetch (same as too_stale response)
 *   - 100-entry ring buffer per session — ~1-2 combat rounds of gap
 *   - 1h idle TTL for memory pressure
 *
 * Trigger to migrate to Redis: too_stale_rate > 5% OR cold-start fallback > 10%.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-02-event-journal.md
 */
import type { SanitizedEvent } from "@/lib/types/realtime";

export interface JournalEntry {
  /** Monotonic per-session seq, matches `_seq` injected by broadcast.ts. */
  seq: number;
  sessionId: string;
  /** Date.now() when recordEvent was called. Used for idle cleanup. */
  timestamp: number;
  event: SanitizedEvent;
}

export type EventsSinceResult =
  | { kind: "events"; events: JournalEntry[]; currentSeq: number }
  | { kind: "too_stale"; currentSeq: number; oldestSeq: number }
  | { kind: "empty"; currentSeq: number };

const BUFFER_CAP = 100;
const SESSION_TTL_MS = 60 * 60 * 1000; // 1h idle → purge

const journals = new Map<string, JournalEntry[]>();

/**
 * Record an event in the session's ring buffer. Called by broadcast.ts after
 * successful sanitization, on EVERY outbound event (DM→player and player→DM).
 *
 * Ring semantics: push to tail; when length > cap, shift oldest. This gives
 * us the last N events, regardless of session duration.
 */
export function recordEvent(
  sessionId: string,
  seq: number,
  event: SanitizedEvent,
): void {
  let buffer = journals.get(sessionId);
  if (!buffer) {
    buffer = [];
    journals.set(sessionId, buffer);
  }
  buffer.push({ seq, sessionId, timestamp: Date.now(), event });
  if (buffer.length > BUFFER_CAP) {
    buffer.shift();
  }
}

/**
 * Retrieve events with seq > sinceSeq.
 *
 * Response shapes (discriminated by `kind`):
 *   - `events`: normal case; client applies the events via its reducer
 *   - `too_stale`: gap too large (sinceSeq < oldestSeq - 1); client falls
 *      back to a full /state refetch
 *   - `empty`: buffer has nothing for this session (never happened, or
 *      cold-started process); client falls back to /state
 */
export function getEventsSince(
  sessionId: string,
  sinceSeq: number,
): EventsSinceResult {
  const buffer = journals.get(sessionId);
  if (!buffer || buffer.length === 0) {
    return { kind: "empty", currentSeq: 0 };
  }
  const currentSeq = buffer[buffer.length - 1].seq;
  const oldestSeq = buffer[0].seq;
  // Gap too large: client's last-seen seq is older than what we still have.
  // Oldest buffered is (oldestSeq); client sinceSeq < oldestSeq - 1 means at
  // least one event between client's cursor and the oldest we have was dropped.
  if (sinceSeq < oldestSeq - 1) {
    return { kind: "too_stale", currentSeq, oldestSeq };
  }
  const events = buffer.filter((e) => e.seq > sinceSeq);
  return { kind: "events", events, currentSeq };
}

/**
 * Purge idle sessions. Called periodically via setInterval (5min).
 *
 * A session is idle if its newest event is older than SESSION_TTL_MS.
 * This bounds memory usage — infinite-session bugs won't leak.
 */
export function purgeIdleSessions(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [sid, buffer] of journals) {
    const last = buffer[buffer.length - 1];
    if (!last || last.timestamp < cutoff) {
      journals.delete(sid);
    }
  }
}

/**
 * Current buffer size for a session (for observability / tests).
 */
export function getBufferSize(sessionId: string): number {
  return journals.get(sessionId)?.length ?? 0;
}

/**
 * Test-only: clear all journals.
 */
export function __resetForTests(): void {
  journals.clear();
}

// Start background cleanup only in server runtime (skip in tests, SSR-safe).
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  setInterval(purgeIdleSessions, 5 * 60 * 1000);
}
