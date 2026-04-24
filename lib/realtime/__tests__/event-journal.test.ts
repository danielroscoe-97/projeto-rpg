/**
 * Unit tests for lib/realtime/event-journal.ts.
 *
 * Covers CR-02 AC8 — ring buffer wrapping, getEventsSince branches, purge.
 */
import {
  recordEvent,
  getEventsSince,
  purgeIdleSessions,
  getBufferSize,
  __resetForTests,
} from "../event-journal";
import type { SanitizedEvent } from "@/lib/types/realtime";

// Minimal stand-in for SanitizedEvent (shape doesn't matter for the journal).
const mkEvent = (n: number): SanitizedEvent =>
  ({ type: "combat:hp_update", combatant_id: `c-${n}`, hp_status: "FULL" as const }) as unknown as SanitizedEvent;

beforeEach(() => {
  __resetForTests();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-04-24T12:00:00Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("recordEvent", () => {
  it("creates a buffer on first record", () => {
    recordEvent("sid-1", 1, mkEvent(1));
    expect(getBufferSize("sid-1")).toBe(1);
  });

  it("appends subsequent events", () => {
    recordEvent("sid-1", 1, mkEvent(1));
    recordEvent("sid-1", 2, mkEvent(2));
    recordEvent("sid-1", 3, mkEvent(3));
    expect(getBufferSize("sid-1")).toBe(3);
  });

  it("scopes per sessionId", () => {
    recordEvent("sid-a", 1, mkEvent(1));
    recordEvent("sid-b", 1, mkEvent(1));
    expect(getBufferSize("sid-a")).toBe(1);
    expect(getBufferSize("sid-b")).toBe(1);
  });

  it("wraps at 100 entries (drops oldest)", () => {
    for (let i = 1; i <= 150; i++) {
      recordEvent("sid-1", i, mkEvent(i));
    }
    expect(getBufferSize("sid-1")).toBe(100);
    const result = getEventsSince("sid-1", 0);
    if (result.kind !== "too_stale") throw new Error(`expected too_stale, got ${result.kind}`);
    expect(result.currentSeq).toBe(150);
    expect(result.oldestSeq).toBe(51); // 150 - 100 + 1 = 51
  });
});

describe("getEventsSince — events branch", () => {
  beforeEach(() => {
    for (let i = 1; i <= 10; i++) recordEvent("sid-1", i, mkEvent(i));
  });

  it("returns events after sinceSeq when buffer has them all", () => {
    const result = getEventsSince("sid-1", 5);
    if (result.kind !== "events") throw new Error(`expected events, got ${result.kind}`);
    expect(result.events.map((e) => e.seq)).toEqual([6, 7, 8, 9, 10]);
    expect(result.currentSeq).toBe(10);
  });

  it("returns empty events list when sinceSeq equals currentSeq", () => {
    const result = getEventsSince("sid-1", 10);
    if (result.kind !== "events") throw new Error(`expected events, got ${result.kind}`);
    expect(result.events).toEqual([]);
    expect(result.currentSeq).toBe(10);
  });

  it("returns all events when sinceSeq is 0 and all seqs are in buffer (boundary — 0 equals oldestSeq - 1)", () => {
    // Buffer has seqs 1..10, oldest=1, so sinceSeq=0 means "give me everything after 0"
    // 0 >= 1 - 1 → NOT too_stale, return all events
    const result = getEventsSince("sid-1", 0);
    if (result.kind !== "events") throw new Error(`expected events, got ${result.kind}`);
    expect(result.events.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("returns empty events list when sinceSeq exceeds currentSeq (client ahead — no-op)", () => {
    const result = getEventsSince("sid-1", 999);
    if (result.kind !== "events") throw new Error(`expected events, got ${result.kind}`);
    expect(result.events).toEqual([]);
    expect(result.currentSeq).toBe(10);
  });
});

describe("getEventsSince — too_stale branch", () => {
  it("returns too_stale when sinceSeq is below oldestSeq - 1", () => {
    // record seqs 50..60 → oldest=50, so sinceSeq 48 is below (50-1=49)
    for (let i = 50; i <= 60; i++) recordEvent("sid-1", i, mkEvent(i));
    const result = getEventsSince("sid-1", 48);
    if (result.kind !== "too_stale") throw new Error(`expected too_stale, got ${result.kind}`);
    expect(result.currentSeq).toBe(60);
    expect(result.oldestSeq).toBe(50);
  });

  it("returns events (not too_stale) when sinceSeq equals oldestSeq - 1 (boundary)", () => {
    // oldestSeq=50, sinceSeq=49 → 49 >= 49, events (and filter excludes seq<=49 — i.e. all 50..60 included)
    for (let i = 50; i <= 60; i++) recordEvent("sid-1", i, mkEvent(i));
    const result = getEventsSince("sid-1", 49);
    if (result.kind !== "events") throw new Error(`expected events, got ${result.kind}`);
    expect(result.events.map((e) => e.seq)).toEqual([50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]);
  });
});

describe("getEventsSince — empty branch", () => {
  it("returns empty when session has no buffer", () => {
    const result = getEventsSince("sid-unknown", 0);
    if (result.kind !== "empty") throw new Error(`expected empty, got ${result.kind}`);
    expect(result.currentSeq).toBe(0);
  });
});

describe("purgeIdleSessions", () => {
  it("removes sessions whose last event is older than 1h", () => {
    // Session A: recent event
    recordEvent("sid-a", 1, mkEvent(1));
    // Advance 90min
    jest.setSystemTime(new Date("2026-04-24T13:30:00Z"));
    // Session B: fresh event at t+90min
    recordEvent("sid-b", 1, mkEvent(1));
    purgeIdleSessions();
    expect(getBufferSize("sid-a")).toBe(0); // evicted
    expect(getBufferSize("sid-b")).toBe(1); // kept
  });

  it("does not remove sessions whose last event is within 1h", () => {
    recordEvent("sid-1", 1, mkEvent(1));
    jest.setSystemTime(new Date("2026-04-24T12:30:00Z")); // +30min
    purgeIdleSessions();
    expect(getBufferSize("sid-1")).toBe(1);
  });
});
