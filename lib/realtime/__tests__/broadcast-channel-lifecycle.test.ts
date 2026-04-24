/**
 * Tests for the DM channel lifecycle in broadcast.ts:
 *   - `scheduleDmChannelCleanup` debounce (grace window before teardown)
 *   - `getDmChannel` reclaiming a pending-cleanup channel
 *   - Auto-reconnect with exponential backoff on subscribe failure
 *   - `resetDmChannel` / `cleanupDmChannel` clearing every pending timer
 *
 * These behaviors are the core of the P1 fix (2026-04-21): they exist so
 * the `/app/combat/new → /app/combat/[id]` router.replace transition does
 * not race phx_leave against phx_join on the same topic, AND so a
 * TIMED_OUT subscribe doesn't leave the DM permanently deaf.
 */

// ── Mocks ────────────────────────────────────────────────────────

/** Controllable subscribe callback — each test overrides this to drive
 *  the desired status sequence (SUBSCRIBED, TIMED_OUT, CHANNEL_ERROR). */
type SubscribeCallback = (status: string, err?: Error) => void;
let subscribeBehavior: (cb: SubscribeCallback) => void = (cb) => cb("SUBSCRIBED");

/** Each `supabase.channel()` call produces a fresh instance so tests can
 *  assert the old instance was removed from the registry. */
function makeChannelInstance() {
  const instance = {
    send: jest.fn(),
    subscribe: jest.fn((cb?: SubscribeCallback) => {
      if (cb) subscribeBehavior(cb);
      return instance;
    }),
    on: jest.fn(() => instance),
    unsubscribe: jest.fn(),
    state: "joined" as string,
  };
  return instance;
}

const mockRemoveChannel = jest.fn();
const channelFactory = jest.fn(() => makeChannelInstance());

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: channelFactory,
    removeChannel: mockRemoveChannel,
  }),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));

jest.mock("@/lib/realtime/broadcast-server", () => ({
  broadcastViaServer: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/realtime/offline-queue", () => ({
  enqueueAction: jest.fn(),
  getSyncStatus: jest.fn().mockReturnValue("online"),
  setSyncStatus: jest.fn(),
  replayQueue: jest.fn(),
}));

import {
  getDmChannel,
  cleanupDmChannel,
  resetDmChannel,
  scheduleDmChannelCleanup,
} from "../broadcast";

// ── Shared setup ─────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  subscribeBehavior = (cb) => cb("SUBSCRIBED");
  // Pin Math.random to 0 so the reconnect jitter (Math.random() * 500 in
  // broadcast.ts — added for R2/Beta #4) is deterministic. Tests below
  // advance timers by exact base delays (1s, 2s, 4s...); without this
  // mock they'd need a 500ms tolerance and the "exactly 1s retry" assertion
  // would become inherently flaky.
  jest.spyOn(Math, "random").mockReturnValue(0);
  // Reset module-level state between tests so one test can't leak channel
  // singleton state into another. `cleanupDmChannel` clears every timer
  // and nulls every reference.
  cleanupDmChannel();
  jest.clearAllMocks(); // clear again — cleanupDmChannel may have called removeChannel
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── scheduleDmChannelCleanup: debounce grace window ──────────────

describe("scheduleDmChannelCleanup — debounce", () => {
  it("tears down the channel after the grace window if nobody reclaims", () => {
    getDmChannel("sid-1");
    expect(channelFactory).toHaveBeenCalledTimes(1);

    scheduleDmChannelCleanup();
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    // Advance past the grace window (2_000 ms in the module).
    jest.advanceTimersByTime(2_000);

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("is cancelled by getDmChannel(sameSession) within the grace window", () => {
    const first = getDmChannel("sid-1");
    expect(channelFactory).toHaveBeenCalledTimes(1);

    scheduleDmChannelCleanup();
    jest.advanceTimersByTime(500); // still within grace

    const second = getDmChannel("sid-1");
    // Same instance returned — channel was reclaimed, not recreated.
    expect(second).toBe(first);
    expect(channelFactory).toHaveBeenCalledTimes(1);

    // Flush the rest of the grace window; the cancelled timer must NOT fire.
    jest.advanceTimersByTime(5_000);
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it("tears down the old channel when getDmChannel(differentSession) arrives mid-grace", () => {
    getDmChannel("sid-1");
    expect(channelFactory).toHaveBeenCalledTimes(1);

    scheduleDmChannelCleanup();
    jest.advanceTimersByTime(500);

    // New session mid-grace → old channel must be removed, new one created.
    getDmChannel("sid-2");
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(channelFactory).toHaveBeenCalledTimes(2);

    // Old pending cleanup should be cancelled — no extra teardown later.
    jest.advanceTimersByTime(5_000);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("supports multiple scheduleDmChannelCleanup calls (last-wins)", () => {
    getDmChannel("sid-1");
    scheduleDmChannelCleanup();
    jest.advanceTimersByTime(1_000);
    scheduleDmChannelCleanup(); // resets the timer
    jest.advanceTimersByTime(1_500);
    // At t=2500 the ORIGINAL timer would have fired, but it was reset.
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000); // reach the NEW timer's deadline
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});

// ── Auto-reconnect on subscribe failure ─────────────────────────

describe("getDmChannel — subscribe retry with exponential backoff", () => {
  it("schedules a retry after TIMED_OUT", () => {
    subscribeBehavior = (cb) => cb("TIMED_OUT");

    getDmChannel("sid-1");
    expect(channelFactory).toHaveBeenCalledTimes(1);

    // First backoff is 1_000 ms; at that point the retry must have created
    // a fresh channel instance and called removeChannel on the errored one.
    jest.advanceTimersByTime(1_000);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(channelFactory).toHaveBeenCalledTimes(2);
  });

  it("schedules a retry after CHANNEL_ERROR", () => {
    subscribeBehavior = (cb) => cb("CHANNEL_ERROR", new Error("fail"));

    getDmChannel("sid-1");
    jest.advanceTimersByTime(1_000);

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    expect(channelFactory).toHaveBeenCalledTimes(2);
  });

  it("grows the backoff geometrically (1s → 2s → 4s)", () => {
    subscribeBehavior = (cb) => cb("TIMED_OUT");

    getDmChannel("sid-1"); // attempt 1
    jest.advanceTimersByTime(1_000); // → attempt 2 at t=1000
    jest.advanceTimersByTime(2_000); // → attempt 3 at t=3000
    jest.advanceTimersByTime(4_000); // → attempt 4 at t=7000

    // 1 initial + 3 retries = 4 channel creations
    expect(channelFactory).toHaveBeenCalledTimes(4);
  });

  it("caps backoff at the ceiling (30s)", () => {
    subscribeBehavior = (cb) => cb("TIMED_OUT");

    getDmChannel("sid-1");
    // Burn through the growth curve until we reach the ceiling.
    jest.advanceTimersByTime(1_000); // retry 2 at 1s
    jest.advanceTimersByTime(2_000); // retry 3 at 2s
    jest.advanceTimersByTime(4_000); // retry 4 at 4s
    jest.advanceTimersByTime(8_000); // retry 5 at 8s
    jest.advanceTimersByTime(16_000); // retry 6 at 16s
    jest.advanceTimersByTime(30_000); // retry 7 capped at 30s

    const countAfterCeiling = channelFactory.mock.calls.length;

    // Next retry must also fire at ≤30s, never slower.
    jest.advanceTimersByTime(30_000);
    expect(channelFactory.mock.calls.length).toBe(countAfterCeiling + 1);
  });

  it("resets the backoff after a successful SUBSCRIBED", () => {
    // First attempt: TIMED_OUT to bump backoff to 2s.
    subscribeBehavior = (cb) => cb("TIMED_OUT");
    getDmChannel("sid-1");
    jest.advanceTimersByTime(1_000);
    // Second attempt: SUBSCRIBED — backoff resets to initial.
    subscribeBehavior = (cb) => cb("SUBSCRIBED");
    jest.advanceTimersByTime(0); // let the retry tick
    expect(channelFactory).toHaveBeenCalledTimes(2);

    // Trigger a NEW subscribe failure; retry must come after 1s (reset),
    // not after 2s (would be the pre-SUBSCRIBED carry-over value).
    subscribeBehavior = (cb) => cb("TIMED_OUT");
    cleanupDmChannel();
    jest.clearAllMocks();
    getDmChannel("sid-2");
    jest.advanceTimersByTime(999);
    expect(channelFactory).toHaveBeenCalledTimes(1); // retry hasn't fired yet
    jest.advanceTimersByTime(1);
    expect(channelFactory).toHaveBeenCalledTimes(2); // retry fired at 1s
  });

  it("does NOT retry after a session change", () => {
    subscribeBehavior = (cb) => cb("TIMED_OUT");
    getDmChannel("sid-1");

    // Mid-backoff, a different session claims the channel.
    jest.advanceTimersByTime(500);
    subscribeBehavior = (cb) => cb("SUBSCRIBED");
    getDmChannel("sid-2");

    const countAfterSwitch = channelFactory.mock.calls.length;

    // Burn through a few backoff windows; the old retry must not fire.
    jest.advanceTimersByTime(10_000);
    expect(channelFactory.mock.calls.length).toBe(countAfterSwitch);
  });
});

// ── Explicit teardown: clears every timer ───────────────────────

describe("cleanupDmChannel / resetDmChannel", () => {
  it("cleanupDmChannel cancels a pending scheduleDmChannelCleanup", () => {
    getDmChannel("sid-1");
    scheduleDmChannelCleanup();
    cleanupDmChannel(); // should clear both channel AND pending timer
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);

    // The pending cleanup timer, if it were still alive, would call
    // removeChannel a second time. Assert it doesn't.
    jest.advanceTimersByTime(10_000);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("cleanupDmChannel cancels a pending reconnect timer", () => {
    subscribeBehavior = (cb) => cb("TIMED_OUT");
    getDmChannel("sid-1");
    // A retry is now scheduled. Tear down before it fires.
    cleanupDmChannel();

    const countAfterCleanup = channelFactory.mock.calls.length;
    jest.advanceTimersByTime(10_000);
    expect(channelFactory.mock.calls.length).toBe(countAfterCleanup);
  });

  it("resetDmChannel cancels a pending scheduleDmChannelCleanup", () => {
    getDmChannel("sid-1");
    scheduleDmChannelCleanup();
    resetDmChannel(); // nullifies singleton AND must clear pending timer

    // No removeChannel from the nullification path itself (resetDmChannel is
    // "forget about the channel" — NOT "remove it"). But the pending
    // timer, if alive, would have called removeChannel here. Assert 0.
    jest.advanceTimersByTime(10_000);
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });

  it("resetDmChannel cancels a pending reconnect timer", () => {
    subscribeBehavior = (cb) => cb("TIMED_OUT");
    getDmChannel("sid-1");
    resetDmChannel();

    const countAfterReset = channelFactory.mock.calls.length;
    jest.advanceTimersByTime(10_000);
    expect(channelFactory.mock.calls.length).toBe(countAfterReset);
  });
});
