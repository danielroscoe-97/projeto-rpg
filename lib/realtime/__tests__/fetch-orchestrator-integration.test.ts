/**
 * Integration smoke test for FetchOrchestrator wiring used by PlayerJoinClient
 * (S3.5 γ refactor, 505-line orchestrator hook path).
 *
 * Sibling file `fetch-orchestrator.test.ts` covers the class in isolation with
 * pure unit cases; this file layers end-to-end scenarios that mirror how
 * PlayerJoinClient composes the orchestrator (priority bypass, circuit
 * breaker recovery, 401 onUnauthorized hook, dedup, per-encounter throttle).
 *
 * We intentionally do NOT import PlayerJoinClient.tsx — that suite has a
 * pre-existing `useRouter` mock issue (documented in the Wave 1 review,
 * finding #4). Instead we drive the orchestrator's public API directly,
 * which is exactly what the refactored hook does internally.
 */

import {
  FetchOrchestrator,
  type FetchRequest,
  type SessionStateEnvelope,
} from "../fetch-orchestrator";

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
  setUnauthorizedHandler(handler: (() => Promise<boolean>) | null): void;
}

function makeHarness(options: { onUnauthorized?: () => Promise<boolean> } = {}): Harness {
  const trackEvents: Array<{ name: string; props?: Record<string, unknown> }> = [];
  const fetchMock = jest.fn() as MockFetch;
  let nowValue = 1_000_000;

  const orchestrator = new FetchOrchestrator({
    fetchImpl: fetchMock as unknown as typeof fetch,
    trackEventImpl: (name, props) => {
      trackEvents.push({ name, props });
    },
    now: () => nowValue,
    onUnauthorized: options.onUnauthorized,
    disableMultiTabDetector: true,
  });

  return {
    orchestrator,
    fetchMock,
    trackEvents,
    advance: (ms) => {
      nowValue += ms;
    },
    setUnauthorizedHandler: (handler) => {
      orchestrator.setUnauthorizedHandler(handler);
    },
  };
}

function req(partial: Partial<FetchRequest> = {}): FetchRequest {
  return {
    encounterId: partial.encounterId ?? "enc-1",
    caller: partial.caller ?? "test_caller",
    priority: partial.priority ?? "throttled",
    ...partial,
  };
}

describe("FetchOrchestrator — PlayerJoinClient integration wiring", () => {
  it("emergency fetch coalesces onto an in-flight background fetch (priority semantics end-to-end)", async () => {
    const h = makeHarness();
    let resolveFetch: (res: FakeResponse) => void = () => {};
    h.fetchMock.mockImplementationOnce(
      () =>
        new Promise<FakeResponse>((res) => {
          resolveFetch = res;
        }),
    );

    // Background is enqueued first — it goes on the wire.
    const bg = h.orchestrator.fetch(
      req({ caller: "lobby_poll", priority: "background" }),
    );

    // Emergency arrives while background is pending. Same encounterId → coalesces
    // onto the in-flight promise instead of firing a second network call.
    const emergency = h.orchestrator.fetch(
      req({ caller: "visibility_change", priority: "emergency" }),
    );

    // Only ONE network call so far — they're sharing the same pending promise.
    expect(h.fetchMock).toHaveBeenCalledTimes(1);

    const envelope = { encounter: { id: "enc-1" }, combatants: [{ id: "c1" }] };
    resolveFetch(makeOk(envelope));

    const [bgState, emergencyState] = await Promise.all([bg, emergency]);

    // Both awaiters receive the same state — no duplicate network call.
    expect(bgState).toMatchObject(envelope);
    expect(emergencyState).toMatchObject(envelope);
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("circuit breaker closes after 30s cooldown and emits circuit_close on recovery probe", async () => {
    const h = makeHarness();
    h.fetchMock.mockResolvedValue(makeError(500));

    // Drive 3 consecutive errors (via emergency, which bypasses throttle).
    for (let i = 0; i < 3; i++) {
      await h.orchestrator.fetch(
        req({ caller: `err_${i}`, priority: "emergency" }),
      );
      h.advance(100);
    }

    expect(
      h.trackEvents.find((e) => e.name === "fetch_orchestrator:circuit_open"),
    ).toBeDefined();

    // While circuit is open, background fetches must be dropped with circuit reason.
    const dropped = await h.orchestrator.fetch(
      req({ caller: "lobby_poll", priority: "background" }),
    );
    expect(dropped).toBeNull();
    expect(
      h.trackEvents.find(
        (e) => e.name === "fetch_orchestrator:dropped" && e.props?.reason === "circuit",
      ),
    ).toBeDefined();

    // Advance past the 30s cooldown — the next call (even background) should
    // close the circuit on success.
    h.advance(30_001);
    h.fetchMock.mockResolvedValueOnce(makeOk());
    const recovered = await h.orchestrator.fetch(
      req({ caller: "lobby_poll_recovery", priority: "background" }),
    );

    expect(recovered).not.toBeNull();
    const close = h.trackEvents.find(
      (e) => e.name === "fetch_orchestrator:circuit_close",
    );
    expect(close).toBeDefined();
    expect(close?.props?.duration_ms).toBeGreaterThanOrEqual(30_000);
  });

  it("401 unauthorized hook recovers silently without counting as an error", async () => {
    let hookCalls = 0;
    const handler = jest.fn(async () => {
      hookCalls++;
      return true; // recovered — orchestrator retries the fetch once.
    });

    const h = makeHarness({ onUnauthorized: handler });

    // First response is 401, retry after handler recovers returns OK.
    h.fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "unauthorized" }),
      })
      .mockResolvedValueOnce(makeOk({ encounter: { id: "enc-1" } }));

    const state = await h.orchestrator.fetch(
      req({ caller: "turn_poll", priority: "emergency" }),
    );

    expect(state).not.toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(hookCalls).toBe(1);
    expect(h.fetchMock).toHaveBeenCalledTimes(2);

    // The 401→retry path was treated as a success — no consecutive errors
    // should have accrued, so the circuit should NOT open even after two more
    // forced 401s if the hook keeps recovering.
    h.fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce(makeOk())
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce(makeOk());

    h.advance(100);
    await h.orchestrator.fetch(req({ caller: "turn_poll_b", priority: "emergency" }));
    h.advance(100);
    await h.orchestrator.fetch(req({ caller: "turn_poll_c", priority: "emergency" }));

    const openEvents = h.trackEvents.filter(
      (e) => e.name === "fetch_orchestrator:circuit_open",
    );
    expect(openEvents).toHaveLength(0);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it("deduplicates same caller+encounterId — one network call, both awaiters resolve", async () => {
    const h = makeHarness();
    let resolveFetch: (res: FakeResponse) => void = () => {};
    h.fetchMock.mockImplementationOnce(
      () =>
        new Promise<FakeResponse>((res) => {
          resolveFetch = res;
        }),
    );

    const first = h.orchestrator.fetch(
      req({ caller: "turn_poll", priority: "emergency", encounterId: "enc-dup" }),
    );
    const second = await h.orchestrator.fetch(
      req({ caller: "turn_poll", priority: "emergency", encounterId: "enc-dup" }),
    );

    // The 2nd call is dedup'd — same (caller, encounterId) pair.
    expect(second).toBeNull();
    const drop = h.trackEvents.find(
      (e) => e.name === "fetch_orchestrator:dropped" && e.props?.reason === "dedup",
    );
    expect(drop).toMatchObject({ props: { caller: "turn_poll", reason: "dedup" } });

    // Resolve the in-flight so the first awaiter completes and the test doesn't leak.
    resolveFetch(makeOk({ encounter: { id: "enc-dup" } }));
    const firstState = await first;
    expect(firstState).toMatchObject({ encounter: { id: "enc-dup" } });

    // And only ONE network call was made.
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throttle differentiates by inFlightKey — different encounterId still respects global window", async () => {
    // Regression coverage for commit 896e2e8d. Scenario:
    //   1. throttled fetch for encounter:A completes at t=0.
    //   2. throttled fetch for encounter:B arrives at t=1s — inFlight is null now
    //      (A completed) but lastFetchAt is 1s old, inside the 5s window.
    //   3. Must drop as throttle (NOT coalesce, NOT start a parallel fetch).
    const h = makeHarness();
    h.fetchMock.mockResolvedValueOnce(makeOk({ encounter: { id: "enc-A" } }));

    const first = await h.orchestrator.fetch(
      req({ caller: "turn_poll_a", priority: "throttled", encounterId: "enc-A" }),
    );
    expect(first).not.toBeNull();

    // Advance 1s — well within the 5s throttled window.
    h.advance(1_000);

    const second = await h.orchestrator.fetch(
      req({ caller: "turn_poll_b", priority: "throttled", encounterId: "enc-B" }),
    );

    // Dropped as throttle — different encounterId, so it can't coalesce onto
    // any in-flight promise (there isn't one), and the global throttle window
    // still applies.
    expect(second).toBeNull();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);

    const drop = h.trackEvents.find(
      (e) =>
        e.name === "fetch_orchestrator:dropped" &&
        e.props?.caller === "turn_poll_b" &&
        e.props?.reason === "throttle",
    );
    expect(drop).toBeDefined();

    // Advance past the window → encounter:B fetch now proceeds on its own.
    h.advance(5_001);
    h.fetchMock.mockResolvedValueOnce(makeOk({ encounter: { id: "enc-B" } }));
    const third = await h.orchestrator.fetch(
      req({ caller: "turn_poll_b", priority: "throttled", encounterId: "enc-B" }),
    );
    expect(third).not.toBeNull();
    expect(h.fetchMock).toHaveBeenCalledTimes(2);
  });
});
