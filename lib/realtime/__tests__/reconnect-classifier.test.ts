/**
 * Tests for the 3-tier reconnect classifier.
 *
 * Regression guard for the CRITICAL bug where `hiddenMs` was always 0 because
 * `hiddenAtRef.current = null` ran before the read. The classifier itself is
 * pure — the bug was in how the caller captured `hiddenMs`. These tests pin
 * the tier boundaries so any future regression in classify logic surfaces here.
 */

import {
  classifyReconnect,
  LONG_BACKGROUND_MS,
} from "../reconnect-classifier";

describe("classifyReconnect", () => {
  describe("Tier 3 — channel_recovery (high confidence)", () => {
    it("fires when wasDisconnected=true regardless of channelState", () => {
      const tier = classifyReconnect({
        hiddenMs: 0,
        wasDisconnected: true,
        channelState: "joined",
      });

      expect(tier.tier).toBe("channel_recovery");
      expect(tier.event).toBe("player:reconnected");
      expect(tier.method).toBe("channel_recovery");
      expect(tier.confidence).toBe("high");
    });

    it("fires when channelState is not 'joined'", () => {
      const tier = classifyReconnect({
        hiddenMs: 5_000,
        wasDisconnected: false,
        channelState: "closed",
      });

      expect(tier.tier).toBe("channel_recovery");
      expect(tier.confidence).toBe("high");
    });

    it("does NOT fire when channelState is undefined and no disconnect", () => {
      // Undefined means we couldn't read Supabase's private .state — we must
      // NOT treat that as a recovery signal, otherwise every reconnect would
      // be inflated to Tier 3.
      const tier = classifyReconnect({
        hiddenMs: 1_000,
        wasDisconnected: false,
        channelState: undefined,
      });

      expect(tier.tier).toBe("noise");
    });
  });

  describe("Tier 2 — long_background (medium confidence)", () => {
    it("fires when hiddenMs > 30s, no disconnect, channel still joined", () => {
      const tier = classifyReconnect({
        hiddenMs: 31_000,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.tier).toBe("long_background");
      expect(tier.event).toBe("player:reconnected");
      expect(tier.method).toBe("long_background");
      expect(tier.confidence).toBe("medium");
      expect(tier.hiddenMs).toBe(31_000);
    });

    it("fires at the threshold + 1ms (> 30_000)", () => {
      const tier = classifyReconnect({
        hiddenMs: LONG_BACKGROUND_MS + 1,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.tier).toBe("long_background");
    });

    it("does NOT fire at exactly 30_000 (strict >)", () => {
      const tier = classifyReconnect({
        hiddenMs: LONG_BACKGROUND_MS,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.tier).toBe("noise");
    });

    it("fires when channelState is undefined and hiddenMs > 30s", () => {
      // Even if we can't read Supabase's state, a long background reconnect
      // is still classified as medium-confidence "long_background".
      const tier = classifyReconnect({
        hiddenMs: 60_000,
        wasDisconnected: false,
        channelState: undefined,
      });

      expect(tier.tier).toBe("long_background");
    });
  });

  describe("Tier 1 — noise (resumed)", () => {
    it("fires for short tab-switch with channel still joined", () => {
      const tier = classifyReconnect({
        hiddenMs: 3_000,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.tier).toBe("noise");
      expect(tier.event).toBe("player:resumed");
      expect(tier.method).toBeNull();
      expect(tier.confidence).toBe("noise");
    });

    it("fires when hiddenMs is 0 (no hidden state captured)", () => {
      const tier = classifyReconnect({
        hiddenMs: 0,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.tier).toBe("noise");
    });
  });

  describe("regression — hiddenMs must surface in all tiers", () => {
    // This is the pin for the CRITICAL bug: if a caller manages to pass a
    // non-zero hiddenMs (which requires reading hiddenAtRef BEFORE nulling it),
    // the classifier echoes it back untouched in every tier.
    it.each([
      [0, "noise"],
      [3_000, "noise"],
      [30_000, "noise"],
      [30_001, "long_background"],
      [60_000, "long_background"],
    ] as const)("hiddenMs=%i is echoed back and produces tier=%s", (hiddenMs, expectedTier) => {
      const tier = classifyReconnect({
        hiddenMs,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.hiddenMs).toBe(hiddenMs);
      expect(tier.tier).toBe(expectedTier);
    });

    it("after >30s hidden + visible with channel joined, tier is long_background with medium confidence", () => {
      // This is the scenario the original bug broke: tab backgrounded for 45s
      // on mobile, comes back with channel still technically joined. Without
      // the fix, hiddenMs was 0 and this reconnect was mis-classified as noise.
      const hiddenAt = 1_700_000_000_000;
      const visibleAt = hiddenAt + 45_000;
      const hiddenMs = visibleAt - hiddenAt;

      const tier = classifyReconnect({
        hiddenMs,
        wasDisconnected: false,
        channelState: "joined",
      });

      expect(tier.tier).toBe("long_background");
      expect(tier.confidence).toBe("medium");
      expect(tier.method).toBe("long_background");
      expect(tier.hiddenMs).toBe(45_000);
    });
  });
});
