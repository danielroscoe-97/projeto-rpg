/**
 * Unit tests for FetchOrchestrator (S3.5).
 *
 * Coverage: throttle, dedup, in-flight coalescing, circuit breaker (open/close
 * + emergency bypass), telemetry emission.
 *
 * All tests use dependency injection (fetchImpl, trackEventImpl, now) to run
 * deterministically — no real timers, no real network.
 */

import {
  FetchOrchestrator,
  type FetchRequest,
  type SessionStateEnvelope,
} from "../fetch-orchestrator";

/**
 * Minimal fetch Response shape — the orchestrator only reads `.ok`, `.status`,
 * and `.json()`, so we don't need the full WHATWG Response API (which jsdom
 * doesn't expose by default in all environments).
 */
type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type MockFetch = jest.Mock<Promise<FakeResponse>, Parameters<typeof fetch>>;

function makeOk(state: Partial<SessionStateEnvelope> = {}): FakeResponse {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: { encounter: null, combatants: [], ...state } }),
  };
}

function makeError(status = 500): FakeResponse {
  return {
    ok: false,
    status,
    json: async () => ({ error: "boom" }),
  };
}

interface Harness {
  orchestrator: FetchOrchestrator;
  fetchMock: MockFetch;
  trackEvents: Array<{ name: string; props?: Record<string, unknown> }>;
  advance(ms: number): void;
  setTime(ms: number): void;
}

function makeHarness(): Harness {
  const trackEvents: Array<{ name: string; props?: Record<string, unknown> }> = [];
  const fetchMock = jest.fn() as MockFetch;
  let nowValue = 1_000_000; // arbitrary non-zero start

  const orchestrator = new FetchOrchestrator({
    fetchImpl: fetchMock as unknown as typeof fetch,
    trackEventImpl: (name, props) => {
      trackEvents.push({ name, props });
    },
    now: () => nowValue,
  });

  return {
    orchestrator,
    fetchMock,
    trackEvents,
    advance: (ms) => {
      nowValue += ms;
    },
    setTime: (ms) => {
      nowValue = ms;
    },
  };
}

function req(partial: Partial<FetchRequest> = {}): FetchRequest {
  return {
    encounterId: "enc-1",
    caller: partial.caller ?? "test_caller",
    priority: partial.priority ?? "throttled",
    ...partial,
  };
}

describe("FetchOrchestrator", () => {
  describe("throttle", () => {
    it("allows the first throttled call through", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce(makeOk());

      const state = await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "throttled" }));

      expect(state).not.toBeNull();
      expect(h.fetchMock).toHaveBeenCalledTimes(1);
      expect(h.fetchMock).toHaveBeenCalledWith(
        "/api/session/enc-1/state",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("drops a 2nd throttled call inside the 5s window (returns null)", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce(makeOk());

      await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "throttled" }));

      h.advance(3_000); // still within 5s window
      const second = await h.orchestrator.fetch(
        req({ caller: "lobby_poll", priority: "throttled" }),
      );

      expect(second).toBeNull();
      expect(h.fetchMock).toHaveBeenCalledTimes(1);
      expect(h.trackEvents.find((e) => e.name === "fetch_orchestrator:dropped")).toMatchObject({
        props: { caller: "lobby_poll", reason: "throttle" },
      });
    });

    it("allows a throttled call after the 5s window elapses", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeOk());

      await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "throttled" }));
      h.advance(5_001);
      const second = await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "throttled" }));

      expect(second).not.toBeNull();
      expect(h.fetchMock).toHaveBeenCalledTimes(2);
    });

    it("runs an emergency call in parallel with a throttled call", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeOk());

      // First throttled call completes.
      await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "throttled" }));
      // 1s later — throttled would be rejected, emergency must proceed.
      h.advance(1_000);
      const emergency = await h.orchestrator.fetch(
        req({ caller: "visibility_change", priority: "emergency" }),
      );

      expect(emergency).not.toBeNull();
      expect(h.fetchMock).toHaveBeenCalledTimes(2);
    });

    it("enforces a 2s min-interval for priority=high", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeOk());

      await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "high" }));
      h.advance(1_500); // still within 2s window
      const dropped = await h.orchestrator.fetch(req({ caller: "turn_poll_2", priority: "high" }));
      expect(dropped).toBeNull();

      h.advance(600); // now > 2s total
      const allowed = await h.orchestrator.fetch(req({ caller: "turn_poll_3", priority: "high" }));
      expect(allowed).not.toBeNull();
      expect(h.fetchMock).toHaveBeenCalledTimes(2);
    });

    it("enforces a 15s min-interval for priority=background", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeOk());

      await h.orchestrator.fetch(req({ caller: "lobby_poll", priority: "background" }));
      h.advance(10_000);
      const dropped = await h.orchestrator.fetch(
        req({ caller: "dm_presence_poll", priority: "background" }),
      );
      expect(dropped).toBeNull();

      h.advance(5_001);
      const allowed = await h.orchestrator.fetch(
        req({ caller: "lobby_poll_2", priority: "background" }),
      );
      expect(allowed).not.toBeNull();
    });
  });

  describe("dedup", () => {
    it("drops a 2nd in-flight call from the same caller (same encounterId)", async () => {
      const h = makeHarness();
      let resolveFetch: (res: FakeResponse) => void = () => {};
      h.fetchMock.mockImplementationOnce(
        () =>
          new Promise<FakeResponse>((res) => {
            resolveFetch = res;
          }),
      );

      const first = h.orchestrator.fetch(req({ caller: "turn_poll", priority: "emergency" }));
      // Same caller + same encounterId → dedup. Emergency here ensures throttle
      // doesn't masquerade as the reason for the drop.
      const second = await h.orchestrator.fetch(
        req({ caller: "turn_poll", priority: "emergency" }),
      );

      expect(second).toBeNull();
      expect(h.trackEvents.find((e) => e.name === "fetch_orchestrator:dropped")).toMatchObject({
        props: { caller: "turn_poll", reason: "dedup" },
      });

      // Let the in-flight resolve so the test doesn't leave a pending promise.
      resolveFetch(makeOk());
      await first;
      expect(h.fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("in-flight coalescing", () => {
    it("coalesces 3 concurrent distinct callers into 1 network call", async () => {
      const h = makeHarness();
      let resolveFetch: (res: FakeResponse) => void = () => {};
      h.fetchMock.mockImplementationOnce(
        () =>
          new Promise<FakeResponse>((res) => {
            resolveFetch = res;
          }),
      );

      const envelope = { encounter: { id: "enc-1" }, combatants: [{ id: "c1" }] };
      const p1 = h.orchestrator.fetch(req({ caller: "visibility_change", priority: "emergency" }));
      const p2 = h.orchestrator.fetch(req({ caller: "turn_poll", priority: "high" }));
      const p3 = h.orchestrator.fetch(req({ caller: "lobby_poll", priority: "background" }));

      // Only 1 network request — the other two coalesce onto the pending promise.
      expect(h.fetchMock).toHaveBeenCalledTimes(1);

      resolveFetch(makeOk(envelope));
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      // All three awaiters get the same state.
      expect(r1).toMatchObject(envelope);
      expect(r2).toMatchObject(envelope);
      expect(r3).toMatchObject(envelope);
      expect(h.fetchMock).toHaveBeenCalledTimes(1);
    });

    it("awaiters receive null when the in-flight fetch fails", async () => {
      const h = makeHarness();
      let rejectFetch: (err: unknown) => void = () => {};
      h.fetchMock.mockImplementationOnce(
        () =>
          new Promise<FakeResponse>((_res, rej) => {
            rejectFetch = rej;
          }),
      );

      const p1 = h.orchestrator.fetch(req({ caller: "a", priority: "emergency" }));
      const p2 = h.orchestrator.fetch(req({ caller: "b", priority: "emergency" }));

      rejectFetch(new Error("network"));
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });
  });

  describe("circuit breaker", () => {
    it("opens after 3 consecutive errors and rejects background calls", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeError(500));

      // 3 failures — spaced out so throttle doesn't intercept them.
      for (let i = 0; i < 3; i++) {
        await h.orchestrator.fetch(
          req({ caller: `c${i}`, priority: "emergency" }),
        );
        h.advance(100);
      }

      const open = h.trackEvents.find((e) => e.name === "fetch_orchestrator:circuit_open");
      expect(open).toBeDefined();

      // Background call during open circuit → dropped with reason=circuit.
      const dropped = await h.orchestrator.fetch(
        req({ caller: "lobby_poll", priority: "background" }),
      );
      expect(dropped).toBeNull();
      expect(
        h.trackEvents.find(
          (e) => e.name === "fetch_orchestrator:dropped" && e.props?.reason === "circuit",
        ),
      ).toBeDefined();
    });

    it("emergency call bypasses an open circuit", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeError(500));

      for (let i = 0; i < 3; i++) {
        await h.orchestrator.fetch(req({ caller: `c${i}`, priority: "emergency" }));
        h.advance(100);
      }
      // Circuit is now open. Next emergency still fires a network call.
      const callsBefore = h.fetchMock.mock.calls.length;
      h.fetchMock.mockResolvedValueOnce(makeOk()); // emergency probe succeeds
      const state = await h.orchestrator.fetch(
        req({ caller: "visibility_change", priority: "emergency" }),
      );

      expect(h.fetchMock.mock.calls.length).toBe(callsBefore + 1);
      expect(state).not.toBeNull();

      // Success should close the circuit.
      const close = h.trackEvents.find((e) => e.name === "fetch_orchestrator:circuit_close");
      expect(close).toBeDefined();
      expect(close?.props?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("closes the circuit automatically after 30s cooldown", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValue(makeError(500));

      for (let i = 0; i < 3; i++) {
        await h.orchestrator.fetch(req({ caller: `c${i}`, priority: "emergency" }));
        h.advance(100);
      }

      // Advance past the 30s cooldown.
      h.advance(30_001);
      h.fetchMock.mockResolvedValueOnce(makeOk());
      const state = await h.orchestrator.fetch(
        req({ caller: "lobby_poll", priority: "background" }),
      );

      expect(state).not.toBeNull();
      const close = h.trackEvents.find((e) => e.name === "fetch_orchestrator:circuit_close");
      expect(close).toBeDefined();
    });

    it("successful fetch resets consecutive error counter", async () => {
      const h = makeHarness();

      // 2 errors then 1 success.
      h.fetchMock
        .mockResolvedValueOnce(makeError(500))
        .mockResolvedValueOnce(makeError(500))
        .mockResolvedValueOnce(makeOk());

      await h.orchestrator.fetch(req({ caller: "a", priority: "emergency" }));
      h.advance(100);
      await h.orchestrator.fetch(req({ caller: "b", priority: "emergency" }));
      h.advance(100);
      const success = await h.orchestrator.fetch(
        req({ caller: "c", priority: "emergency" }),
      );
      expect(success).not.toBeNull();

      // Now 2 more failures — still should NOT open the circuit (counter was reset).
      h.fetchMock
        .mockResolvedValueOnce(makeError(500))
        .mockResolvedValueOnce(makeError(500));
      h.advance(100);
      await h.orchestrator.fetch(req({ caller: "d", priority: "emergency" }));
      h.advance(100);
      await h.orchestrator.fetch(req({ caller: "e", priority: "emergency" }));

      const openEvents = h.trackEvents.filter((e) => e.name === "fetch_orchestrator:circuit_open");
      expect(openEvents).toHaveLength(0);
    });
  });

  describe("telemetry", () => {
    it("emits fetch_orchestrator:hit with caller and priority on success", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce(makeOk());

      await h.orchestrator.fetch(
        req({ caller: "manual_refresh_button", priority: "emergency" }),
      );

      const hit = h.trackEvents.find((e) => e.name === "fetch_orchestrator:hit");
      expect(hit).toMatchObject({
        props: { caller: "manual_refresh_button", priority: "emergency" },
      });
    });

    it("does NOT emit :hit on network failure", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce(makeError(500));

      await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "emergency" }));

      const hit = h.trackEvents.find((e) => e.name === "fetch_orchestrator:hit");
      expect(hit).toBeUndefined();
    });
  });
});
