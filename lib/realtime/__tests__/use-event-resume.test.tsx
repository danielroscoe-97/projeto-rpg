/**
 * Unit tests for lib/realtime/use-event-resume.ts.
 *
 * Verifies CR-03 AC3-AC5: subscribes to state machine, fires resume on
 * connected transition, applies events or falls back, debounces flaps.
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
import { setLastSeenSeq } from "../event-store";

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

describe("useEventResume — basic flow", () => {
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

  it("no-ops on transitions other than connected", () => {
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

  it("no-ops when lastSeenSeq === currentSeq (nothing missed)", () => {
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
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 10 });
    jest.advanceTimersByTime(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("no-ops when currentSeq is 0 (fresh server)", () => {
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
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 0 });
    jest.advanceTimersByTime(400);
    expect(mockFetch).not.toHaveBeenCalled();
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
          { seq: 6, sessionId: "sid-1", timestamp: 1, event: { type: "combat:hp_update", combatant_id: "x" } },
          { seq: 7, sessionId: "sid-1", timestamp: 2, event: { type: "combat:turn_advance" } },
        ],
        currentSeq: 7,
      }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 7 });
    jest.advanceTimersByTime(400);
    // Flush fetch microtask
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("/api/combat/enc-1/events?");
    expect(mockFetch.mock.calls[0][0]).toContain("since_seq=5");
    expect(mockFetch.mock.calls[0][0]).toContain("token=tkn");
    expect(onEvents).toHaveBeenCalledTimes(1);
    expect(onEvents.mock.calls[0][0]).toHaveLength(2);
    expect(onFullRefetchNeeded).not.toHaveBeenCalled();
    // Cursor advanced to currentSeq (7), not just last event seq.
    expect(window.sessionStorage.getItem("estcombate:lastseq:sid-1")).toBe("7");
  });

  it("falls back to full refetch on too_stale", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(
      okJson({ kind: "too_stale", currentSeq: 200, oldestSeq: 100 }),
    );
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 200 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFullRefetchNeeded).toHaveBeenCalledTimes(1);
    expect(onEvents).not.toHaveBeenCalled();
  });

  it("falls back to full refetch on `empty` response", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(okJson({ kind: "empty", currentSeq: 0 }));
    // empty comes with currentSeq: 0 → our early-return skips fetch entirely
    // but if server had events (currentSeq > 0 somehow)... test for the case where endpoint
    // returns empty with currentSeq > 0 by forcing fetch path via lastSeen=5, currentSeq=10
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 10 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(onFullRefetchNeeded).toHaveBeenCalledTimes(1);
  });

  it("falls back to full refetch on non-ok HTTP response", async () => {
    const { onEvents, onFullRefetchNeeded } = setup();
    mockFetch.mockResolvedValueOnce(errResponse(500));
    transitionTo({ kind: "connecting", attempt: 1, since: 1 });
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 10 });
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
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 10 });
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
    transitionTo({ kind: "connected", subscribedAt: 2, currentSeq: 10 });
    jest.advanceTimersByTime(100);
    transitionTo({
      kind: "reconnecting",
      attempt: 2,
      since: 3,
      backoffMs: 1000,
    });
    jest.advanceTimersByTime(50);
    transitionTo({ kind: "connected", subscribedAt: 4, currentSeq: 10 });
    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
