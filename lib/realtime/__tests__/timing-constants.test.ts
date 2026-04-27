/**
 * Unit tests for lib/realtime/timing-constants.ts.
 *
 * The module-load invariant check (assertTimingInvariants at bottom of
 * the module) is already implicit: importing the module in a test would
 * throw if invariants were broken. These tests make the invariants explicit.
 */
import {
  WS_HEARTBEAT_MS,
  APP_HEARTBEAT_MS,
  PLAYER_STALE_THRESHOLD_MS,
  DM_OFFLINE_THRESHOLD_MS,
  assertTimingInvariants,
} from "../timing-constants";

describe("timing-constants invariants", () => {
  it("WS heartbeat is shorter than app heartbeat", () => {
    expect(WS_HEARTBEAT_MS).toBeLessThan(APP_HEARTBEAT_MS);
  });

  it("player stale threshold allows ≥ 1 missed app heartbeat", () => {
    expect(PLAYER_STALE_THRESHOLD_MS).toBeGreaterThanOrEqual(
      APP_HEARTBEAT_MS * 1.5,
    );
  });

  it("DM offline threshold allows ≥ 3 missed app heartbeats", () => {
    expect(DM_OFFLINE_THRESHOLD_MS).toBeGreaterThanOrEqual(
      APP_HEARTBEAT_MS * 3,
    );
  });

  it("assertTimingInvariants passes with current values", () => {
    expect(() => assertTimingInvariants()).not.toThrow();
  });
});
