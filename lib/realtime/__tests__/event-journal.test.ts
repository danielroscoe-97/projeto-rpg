/**
 * Unit tests for lib/realtime/event-journal.ts (Postgres-backed).
 *
 * Caminho A revision (PR #59 review fix, 2026-04-26): the journal moved
 * from an in-memory Map to the `combat_events` Postgres table. These
 * tests mock @supabase/supabase-js client to verify the query shape and
 * branch logic without hitting a real DB.
 *
 * For end-to-end coverage of the Postgres path, see CR-04 E2E spec
 * (Sprint 1 follow-up) which exercises the real DB.
 */

// Mock the server-only Supabase client. We control the chain so we can
// assert call args + return shaped data per test scenario.
const mockSingle = jest.fn();
const mockSelectAfterInsert = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: mockSelectAfterInsert }));
const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({
  insert: mockInsert,
  select: mockSelect,
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

import {
  recordEvent,
  getEventsSince,
  type EventsSinceResult,
} from "../event-journal";
import type { SanitizedEvent } from "@/lib/types/realtime";

// Minimal stand-in for SanitizedEvent.
const mkEvent = (id: number): SanitizedEvent =>
  ({
    type: "combat:hp_update",
    combatant_id: `c-${id}`,
    hp_status: "FULL" as const,
  }) as unknown as SanitizedEvent;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("recordEvent", () => {
  it("inserts the event and returns the assigned seq", async () => {
    mockSingle.mockResolvedValueOnce({ data: { seq: 42 }, error: null });
    const seq = await recordEvent("sid-1", mkEvent(1));
    expect(seq).toBe(42);
    expect(mockFrom).toHaveBeenCalledWith("combat_events");
    expect(mockInsert).toHaveBeenCalledWith({
      session_id: "sid-1",
      event_type: "combat:hp_update",
      event: expect.objectContaining({ type: "combat:hp_update" }),
    });
  });

  it("coerces stringy seq to number", async () => {
    mockSingle.mockResolvedValueOnce({ data: { seq: "100" }, error: null });
    const seq = await recordEvent("sid-1", mkEvent(1));
    expect(seq).toBe(100);
  });

  it("returns null on insert error (does not throw)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "constraint violation" },
    });
    const seq = await recordEvent("sid-1", mkEvent(1));
    expect(seq).toBeNull();
  });

  it("returns null when supabase throws (network error etc)", async () => {
    mockSingle.mockRejectedValueOnce(new Error("network"));
    const seq = await recordEvent("sid-1", mkEvent(1));
    expect(seq).toBeNull();
  });
});

describe("getEventsSince — empty branch", () => {
  it("returns empty when session has no events", async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    const result = await getEventsSince("sid-1", 0);
    expect(result).toEqual({ kind: "empty", currentSeq: 0 });
  });

  it("returns empty on db error (graceful)", async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "connection timeout" },
    });
    const result = await getEventsSince("sid-1", 0);
    expect(result.kind).toBe("empty");
  });
});

describe("getEventsSince — events branch", () => {
  it("returns events newer than sinceSeq, in ASC order", async () => {
    // Server returns DESC; helper reverses to ASC for client application.
    mockLimit.mockResolvedValueOnce({
      data: [
        rowAt(10, mkEvent(10)),
        rowAt(9, mkEvent(9)),
        rowAt(8, mkEvent(8)),
        rowAt(7, mkEvent(7)),
        rowAt(6, mkEvent(6)),
        rowAt(5, mkEvent(5)),
      ],
      error: null,
    });
    const result = (await getEventsSince("sid-1", 7)) as Extract<
      EventsSinceResult,
      { kind: "events" }
    >;
    expect(result.kind).toBe("events");
    expect(result.events.map((e) => e.seq)).toEqual([8, 9, 10]);
    expect(result.currentSeq).toBe(10);
  });

  it("returns empty events list when client is at currentSeq", async () => {
    mockLimit.mockResolvedValueOnce({
      data: [rowAt(10, mkEvent(10)), rowAt(9, mkEvent(9))],
      error: null,
    });
    const result = (await getEventsSince("sid-1", 10)) as Extract<
      EventsSinceResult,
      { kind: "events" }
    >;
    expect(result.kind).toBe("events");
    expect(result.events).toEqual([]);
    expect(result.currentSeq).toBe(10);
  });

  it("does NOT classify as too_stale when sinceSeq equals oldestSeq - 1 (boundary)", async () => {
    // oldest=50, sinceSeq=49 → 49 >= 49, events branch (returns 50..60)
    mockLimit.mockResolvedValueOnce({
      data: [60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50].map((s) =>
        rowAt(s, mkEvent(s)),
      ),
      error: null,
    });
    const result = await getEventsSince("sid-1", 49);
    expect(result.kind).toBe("events");
    if (result.kind !== "events") return;
    expect(result.events.map((e) => e.seq)).toEqual([
      50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
    ]);
  });
});

describe("getEventsSince — too_stale branch", () => {
  it("returns too_stale when sinceSeq is below oldestSeq - 1", async () => {
    // oldest=50, sinceSeq=48 → 48 < 49, too_stale
    mockLimit.mockResolvedValueOnce({
      data: [rowAt(60, mkEvent(60)), rowAt(50, mkEvent(50))],
      error: null,
    });
    const result = await getEventsSince("sid-1", 48);
    expect(result.kind).toBe("too_stale");
    if (result.kind !== "too_stale") return;
    expect(result.currentSeq).toBe(60);
    expect(result.oldestSeq).toBe(50);
    expect(result.instruction).toBe("refetch_full_state");
  });
});

// ── helper ────────────────────────────────────────────────────────────
function rowAt(seq: number, event: SanitizedEvent) {
  return {
    seq,
    session_id: "sid-1",
    event,
    created_at: new Date(2026, 3, 26, 12, 0, 0, seq * 100).toISOString(),
  };
}
