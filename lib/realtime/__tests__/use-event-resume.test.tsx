/**
 * Unit tests for lib/realtime/use-event-resume.ts (Caminho A revision).
 *
 * Semantics shifted in the C-2 fix (PR #59 review 2026-04-26):
 *   - Cursor source is now `_journal_seq` from incoming broadcasts (set by
 *     server in /api/broadcast). state.currentSeq is no longer the gating
 *     signal — every `connected` transition triggers a resume fetch with
 *     the locally tracked lastSeenSeq.
 *   - The hook now exposes `noteSeqFromBroadcast` for the caller to
 *     register in their broadcast handler.
 *
 * @jest-environment jsdom
 */
jest.mock("@/lib/errors/capture", () => ({
  captureWarning: jest.fn(),
  captureError: jest.fn(),
}));

import { renderHook } from "@testing-library/react";
import { useEventResume } from "../use-event-resume";
import {
  transitionTo,
  __resetForTests as resetConnectionState,
} from "../connection-state";
import { setLastSeenSeq, getLastSeenSeq } from "../event-store";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  resetConnectionState();
  window.sessionStorage.clear();
  mockFetch.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function okJson(body: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as Response;
}

function errResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as Response;
}

describe("useEventResume — gating", () => {
  it("does nothing if encounterId or token missing", () => {
    const onEvents = jest.fn();
    const onFullRefetchNeeded = jest.fn();
    renderHook(() =>
      useEventResume({
        sessionId: "sid-1",
        encounterId: null,
        token: "tkn",
        onEvents,
        onFullRefetchNeeded,
      }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 5 });
    jest.advanceTimersByTime(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not fetch on non-connected transitions", () => {
    const onEvents = jest.fn();
    const onFullRefetchNeeded = jest.fn();
    renderHook(() =>
      useEventResume({
        sessionId: "sid-1",
        encounterId: "enc-1",
        token: "tkn",
        onEvents,
        onFullRefetchNeeded,
      }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    jest.advanceTimersByTime(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches on every connected transition (server decides no-op via empty events list)", async () => {
    const onEvents = jest.fn();
    const onFullRefetchNeeded = jest.fn();
    setLastSeenSeq("sid-1", 10);
    renderHook(() =>
      useEventResume({
        sessionId: "sid-1",
        encounterId: "enc-1",
        token: "tkn",
        onEvents,
        onFullRefetchNeeded,
      }),
    );
    mockFetch.mockResolvedValueOnce(
      okJson({ kind: "events", events: [], currentSeq: 10 }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("since_seq=10");
    expect(onEvents).not.toHaveBeenCalled(); // empty list
    expect(onFullRefetchNeeded).not.toHaveBeenCalled();
  });
});

describe("useEventResume — fetch paths", () => {
  const setup = () => {
    const onEvents = jest.fn();
    const onFullRefetchNeeded = jest.fn();
    setLastSeenSeq("sid-1", 5);
    renderHook(() =>
      useEventResume({
        sessionId: "sid-1",
        encounterId: "enc-1",
        token: "tkn",
        onEvents,
        onFullRefetchNeeded,
      }),
    );
    return { onEvents, onFullRefetchNeeded };
  };

  it("applies events and advances cursor on `events` response", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(
      okJson({
        kind: "events",
        events: [
          { seq: 6, sessionId: "sid-1", timestamp: "t1", event: { type: "combat:hp_update", combatant_id: "x" } },
          { seq: 7, sessionId: "sid-1", timestamp: "t2", event: { type: "combat:turn_advance" } },
        ],
        currentSeq: 7,
      }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("/api/combat/enc-1/events?");
    expect(mockFetch.mock.calls[0][0]).toContain("since_seq=5");
    expect(mockFetch.mock.calls[0][0]).toContain("token=tkn");
    expect(onEvents).toHaveBeenCalledTimes(1);
    expect(onEvents.mock.calls[0][0]).toHaveLength(2);
    expect(onFullRefetchNeeded).not.toHaveBeenCalled();
    expect(getLastSeenSeq("sid-1")).toBe(7);
  });

  it("advances cursor even when events list is empty (server says caught up)", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(
      okJson({ kind: "events", events: [], currentSeq: 12 }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();
    // No events to apply, but cursor moved forward — next reconnect won't
    // re-query the same range.
    expect(onEvents).not.toHaveBeenCalled();
    expect(onFullRefetchNeeded).not.toHaveBeenCalled();
    expect(getLastSeenSeq("sid-1")).toBe(12);
  });

  it("falls back to full refetch on too_stale", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(
      okJson({
        kind: "too_stale",
        currentSeq: 200,
        oldestSeq: 100,
        instruction: "refetch_full_state",
      }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFullRefetchNeeded).toHaveBeenCalledTimes(1);
    expect(onEvents).not.toHaveBeenCalled();
  });

  it("falls back to full refetch on `empty` response", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(okJson({ kind: "empty", currentSeq: 0 }));
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFullRefetchNeeded).toHaveBeenCalledTimes(1);
  });

  it("falls back to full refetch on non-ok HTTP response", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(errResponse(500));
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFullRefetchNeeded).toHaveBeenCalledTimes(1);
    expect(onEvents).not.toHaveBeenCalled();
  });

  it("falls back to full refetch on fetch throw (network error)", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFullRefetchNeeded).toHaveBeenCalledTimes(1);
    expect(onEvents).not.toHaveBeenCalled();
  });
});

describe("useEventResume — debounce", () => {
  it("debounces flaps: connected → reconnecting → connected within <300ms = 1 fetch", async () => {
    const onEvents = jest.fn();
    const onFullRefetchNeeded = jest.fn();
    setLastSeenSeq("sid-1", 5);
    renderHook(() =>
      useEventResume({
        sessionId: "sid-1",
        encounterId: "enc-1",
        token: "tkn",
        onEvents,
        onFullRefetchNeeded,
      }),
    );
    mockFetch.mockResolvedValue(
      okJson({ kind: "events", events: [], currentSeq: 10 }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(100);
    transitionTo({
      kind: "reconnecting",
      attempt: 2,
      since: 3,
      backoffMs: 1000,
    });
    jest.advanceTimersByTime(50);
    transitionTo({ kind: "connected", subscribedAt: 4, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("useEventResume — noteSeqFromBroadcast", () => {
  it("returns an API with noteSeqFromBroadcast that updates the local cursor", () => {
    const onEvents = jest.fn();
    const onFullRefetchNeeded = jest.fn();
    const { result } = renderHook(() =>
      useEventResume({
        sessionId: "sid-1",
        encounterId: "enc-1",
        token: "tkn",
        onEvents,
        onFullRefetchNeeded,
      }),
    );
    expect(result.current.noteSeqFromBroadcast).toBeInstanceOf(Function);
    result.current.noteSeqFromBroadcast(15);
    expect(getLastSeenSeq("sid-1")).toBe(15);
    // Higher seq advances
    result.current.noteSeqFromBroadcast(20);
    expect(getLastSeenSeq("sid-1")).toBe(20);
    // Older or missing seq is ignored
    result.current.noteSeqFromBroadcast(10);
    expect(getLastSeenSeq("sid-1")).toBe(20);
    result.current.noteSeqFromBroadcast(undefined);
    expect(getLastSeenSeq("sid-1")).toBe(20);
    result.current.noteSeqFromBroadcast(0);
    expect(getLastSeenSeq("sid-1")).toBe(20);
  });
});
