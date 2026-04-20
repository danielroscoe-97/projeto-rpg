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
    // Unit tests focus on throttle/dedup/coalesce logic — skip the
    // BroadcastChannel-based multi-tab detector which pulls in jsdom-level
    // global state and cross-test pollution. The dedicated `multi-tab
    // detection` describe block below builds its own harness with a stub BC.
    disableMultiTabDetector: true,
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
        "/api/combat/enc-1/state",
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

  // ── C2 (Fetch Orchestrator Audit) — queryParams + path + multi-tab ─────

  describe("queryParams + path (C2)", () => {
    it("appends queryParams to the URL", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce(makeOk());

      await h.orchestrator.fetch(
        req({
          caller: "visibility_change:token_ownership_check",
          priority: "high",
          queryParams: { token_id: "tok-abc-123" },
        }),
      );

      expect(h.fetchMock).toHaveBeenCalledWith(
        "/api/session/enc-1/state?token_id=tok-abc-123",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("defaults to path='state' when omitted", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce(makeOk());

      await h.orchestrator.fetch(req({ caller: "turn_poll", priority: "emergency" }));

      expect(h.fetchMock).toHaveBeenCalledWith(
        "/api/session/enc-1/state",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    it("routes to /dm-presence when path='dm-presence'", async () => {
      const h = makeHarness();
      h.fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ dm_last_seen_at: "2026-04-19T10:00:00Z" }),
      });

      const state = await h.orchestrator.fetch(
        req({ caller: "dm_presence_poll", priority: "background", path: "dm-presence" }),
      );

      expect(h.fetchMock).toHaveBeenCalledWith(
        "/api/session/enc-1/dm-presence",
        expect.objectContaining({ credentials: "include" }),
      );
      // dm-presence returns the payload directly (no {data: ...} wrapper).
      // The orchestrator normalizes both shapes, so `state` should be the
      // raw body.
      expect(state).toMatchObject({ dm_last_seen_at: "2026-04-19T10:00:00Z" });
    });

    it("cache key segments /state and /dm-presence — they do not coalesce", async () => {
      const h = makeHarness();
      let resolveState: (res: FakeResponse) => void = () => {};
      let resolveDm: (res: FakeResponse) => void = () => {};
      h.fetchMock
        .mockImplementationOnce(
          () => new Promise<FakeResponse>((res) => { resolveState = res; }),
        )
        .mockImplementationOnce(
          () => new Promise<FakeResponse>((res) => { resolveDm = res; }),
        );

      // Both in-flight simultaneously — different path segments the pool.
      const statePromise = h.orchestrator.fetch(
        req({ caller: "turn_poll", priority: "emergency", path: "state" }),
      );
      const dmPromise = h.orchestrator.fetch(
        req({ caller: "dm_presence_poll", priority: "emergency", path: "dm-presence" }),
      );

      // Two distinct network calls — not coalesced.
      expect(h.fetchMock).toHaveBeenCalledTimes(2);

      resolveState(makeOk({ encounter: { id: "enc-1" } }));
      resolveDm({
        ok: true,
        status: 200,
        json: async () => ({ dm_last_seen_at: "now" }),
      });
      const [s, d] = await Promise.all([statePromise, dmPromise]);
      expect(s).toMatchObject({ encounter: { id: "enc-1" } });
      expect(d).toMatchObject({ dm_last_seen_at: "now" });
    });

    it("cache key segments different queryParams — they do not coalesce", async () => {
      const h = makeHarness();
      let resolveA: (res: FakeResponse) => void = () => {};
      let resolveB: (res: FakeResponse) => void = () => {};
      h.fetchMock
        .mockImplementationOnce(
          () => new Promise<FakeResponse>((res) => { resolveA = res; }),
        )
        .mockImplementationOnce(
          () => new Promise<FakeResponse>((res) => { resolveB = res; }),
        );

      const a = h.orchestrator.fetch(
        req({
          caller: "visibility_change:token_ownership_check",
          priority: "emergency",
          queryParams: { token_id: "tokA" },
        }),
      );
      const b = h.orchestrator.fetch(
        req({
          caller: "other_check",
          priority: "emergency",
          queryParams: { token_id: "tokB" },
        }),
      );

      // Two network calls — same encounterId but different queryParams, so
      // the response bodies will differ (token_owner filtering). Coalescing
      // them would mis-route tokB's answer to tokA's awaiter.
      expect(h.fetchMock).toHaveBeenCalledTimes(2);

      resolveA(makeOk({ token_owner: "userA" }));
      resolveB(makeOk({ token_owner: "userB" }));
      const [ra, rb] = await Promise.all([a, b]);
      expect(ra).toMatchObject({ token_owner: "userA" });
      expect(rb).toMatchObject({ token_owner: "userB" });
    });

    it("same caller + same queryParams dedups (one network call)", async () => {
      const h = makeHarness();
      let resolveFetch: (res: FakeResponse) => void = () => {};
      h.fetchMock.mockImplementationOnce(
        () => new Promise<FakeResponse>((res) => { resolveFetch = res; }),
      );

      const first = h.orchestrator.fetch(
        req({
          caller: "visibility_change:token_ownership_check",
          priority: "emergency",
          queryParams: { token_id: "tok-X" },
        }),
      );
      const second = await h.orchestrator.fetch(
        req({
          caller: "visibility_change:token_ownership_check",
          priority: "emergency",
          queryParams: { token_id: "tok-X" },
        }),
      );

      expect(second).toBeNull();
      const drop = h.trackEvents.find(
        (e) => e.name === "fetch_orchestrator:dropped" && e.props?.reason === "dedup",
      );
      expect(drop).toBeDefined();

      resolveFetch(makeOk({ token_owner: "userX" }));
      await first;
      expect(h.fetchMock).toHaveBeenCalledTimes(1);
    });

    it("queryParams key ordering is stable (cache key insensitive to property order)", async () => {
      const h = makeHarness();
      let resolveFetch: (res: FakeResponse) => void = () => {};
      h.fetchMock.mockImplementationOnce(
        () => new Promise<FakeResponse>((res) => { resolveFetch = res; }),
      );

      const first = h.orchestrator.fetch(
        req({
          caller: "check",
          priority: "emergency",
          queryParams: { a: "1", b: "2" },
        }),
      );
      // Same caller + same logical key but declared in reverse order —
      // must dedup onto the in-flight, not fire a second network call.
      const second = await h.orchestrator.fetch(
        req({
          caller: "check",
          priority: "emergency",
          queryParams: { b: "2", a: "1" },
        }),
      );

      expect(second).toBeNull();
      resolveFetch(makeOk());
      await first;
      expect(h.fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("multi-tab detection (C2)", () => {
    // Minimal in-memory BroadcastChannel stub — mimics the API surface we
    // rely on (onmessage + postMessage + close). Shared across all instances
    // with the same name so a message from tab A is delivered to tab B.
    class StubBroadcastChannel {
      static registry = new Map<string, StubBroadcastChannel[]>();
      name: string;
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      constructor(name: string) {
        this.name = name;
        const peers = StubBroadcastChannel.registry.get(name) ?? [];
        peers.push(this);
        StubBroadcastChannel.registry.set(name, peers);
      }
      postMessage(data: unknown): void {
        const peers = StubBroadcastChannel.registry.get(this.name) ?? [];
        for (const p of peers) {
          if (p === this) continue;
          queueMicrotask(() => {
            p.onmessage?.({ data });
          });
        }
      }
      close(): void {
        const peers = StubBroadcastChannel.registry.get(this.name) ?? [];
        StubBroadcastChannel.registry.set(
          this.name,
          peers.filter((p) => p !== this),
        );
      }
    }

    beforeEach(() => {
      StubBroadcastChannel.registry.clear();
    });

    it("emits fetch_orchestrator:multi_tab_detected when a 2nd tab joins", async () => {
      const events: Array<{ name: string; props?: Record<string, unknown> }> = [];
      const now = () => 1_000_000;

      // Tab A — existing instance.
      new FetchOrchestrator({
        fetchImpl: jest.fn() as unknown as typeof fetch,
        trackEventImpl: (name, props) => events.push({ name, props }),
        now,
        broadcastChannelImpl: StubBroadcastChannel as unknown as typeof BroadcastChannel,
      });

      // Give the microtask from Tab A's "hello" time to drain (no peers yet, no-op).
      await Promise.resolve();
      events.length = 0; // reset — only inspect events from the 2nd tab joining.

      // Tab B — the new tab. Its "hello" should reach tab A.
      new FetchOrchestrator({
        fetchImpl: jest.fn() as unknown as typeof fetch,
        trackEventImpl: (name, props) => events.push({ name, props }),
        now,
        broadcastChannelImpl: StubBroadcastChannel as unknown as typeof BroadcastChannel,
      });

      // Drain the microtask queue so postMessage handlers run.
      await new Promise((r) => setTimeout(r, 0));

      const detected = events.find(
        (e) => e.name === "fetch_orchestrator:multi_tab_detected",
      );
      expect(detected).toBeDefined();
      expect(detected?.props).toHaveProperty("instance_id");
      expect(detected?.props).toHaveProperty("peer_instance_id");
    });

    it("rate-limits multi_tab_detected to once per minute per tab", async () => {
      const events: Array<{ name: string; props?: Record<string, unknown> }> = [];
      let nowMs = 1_000_000;

      // Tab A
      new FetchOrchestrator({
        fetchImpl: jest.fn() as unknown as typeof fetch,
        trackEventImpl: (name, props) => events.push({ name, props }),
        now: () => nowMs,
        broadcastChannelImpl: StubBroadcastChannel as unknown as typeof BroadcastChannel,
      });
      await Promise.resolve();
      events.length = 0;

      // Three more tabs join within 10s — should only emit once from tab A.
      for (let i = 0; i < 3; i++) {
        new FetchOrchestrator({
          fetchImpl: jest.fn() as unknown as typeof fetch,
          // Tabs 2-4 don't count their own emissions for this test.
          trackEventImpl: () => {},
          now: () => nowMs,
          broadcastChannelImpl: StubBroadcastChannel as unknown as typeof BroadcastChannel,
        });
        nowMs += 1_000;
        await new Promise((r) => setTimeout(r, 0));
      }

      const detected = events.filter(
        (e) => e.name === "fetch_orchestrator:multi_tab_detected",
      );
      expect(detected).toHaveLength(1);
    });

    it("silently degrades if BroadcastChannel throws in constructor", () => {
      const events: Array<{ name: string; props?: Record<string, unknown> }> = [];
      class ThrowingBC {
        constructor() {
          throw new Error("COOP violation / exotic origin");
        }
      }

      // Must not throw — the orchestrator swallows the error.
      expect(() => {
        new FetchOrchestrator({
          fetchImpl: jest.fn() as unknown as typeof fetch,
          trackEventImpl: (name, props) => events.push({ name, props }),
          broadcastChannelImpl: ThrowingBC as unknown as typeof BroadcastChannel,
        });
      }).not.toThrow();
    });
  });
});
