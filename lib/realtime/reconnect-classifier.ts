/**
 * Reconnect classifier — 3-tier telemetry bucketing for visibilitychange reconnects.
 *
 * Finding 4 of beta-test-3 spike: the "player:reconnected" event was over-inflated
 * by every trivial tab-switch, which polluted the reconnection funnel. This helper
 * splits the event into 3 tiers so dashboards can filter by `confidence`.
 *
 *   Tier 1 (noise)    — short hidden, channel still joined, no disconnect logged
 *                       → emit `player:resumed` (separate event, out of funnel)
 *   Tier 2 (ambiguous)— hidden >30s but channel still joined
 *                       → emit `player:reconnected` with confidence="medium" and
 *                         method="long_background"
 *   Tier 3 (real)     — channel dropped OR we recorded a disconnect
 *                       → emit `player:reconnected` with confidence="high" and
 *                         method="channel_recovery"
 *
 * The classifier is pure so it can be unit-tested without mounting the full
 * PlayerJoinClient. See `reconnect-classifier.test.ts`.
 */

export type ReconnectTier =
  | {
      tier: "noise";
      event: "player:resumed";
      method: null;
      confidence: "noise";
      hiddenMs: number;
    }
  | {
      tier: "long_background";
      event: "player:reconnected";
      method: "long_background";
      confidence: "medium";
      hiddenMs: number;
    }
  | {
      tier: "channel_recovery";
      event: "player:reconnected";
      method: "channel_recovery";
      confidence: "high";
      hiddenMs: number;
    };

export interface ClassifyReconnectInput {
  /** Milliseconds the tab was hidden (0 if never hidden). */
  hiddenMs: number;
  /** True if we recorded a realtime disconnect while hidden. */
  wasDisconnected: boolean;
  /** Current Supabase channel state (undefined if we can't read it). */
  channelState: string | undefined;
}

/** Threshold above which a long-hidden reconnect is considered ambiguous. */
export const LONG_BACKGROUND_MS = 30_000;

/**
 * Pure classifier — no side effects, no refs. Given signals observed at the
 * moment the tab became visible, return which telemetry event and confidence
 * bucket to emit.
 */
export function classifyReconnect(input: ClassifyReconnectInput): ReconnectTier {
  const { hiddenMs, wasDisconnected, channelState } = input;

  // Tier 3 — real recovery signal (channel was down or we saw a disconnect).
  if (wasDisconnected || (channelState !== undefined && channelState !== "joined")) {
    return {
      tier: "channel_recovery",
      event: "player:reconnected",
      method: "channel_recovery",
      confidence: "high",
      hiddenMs,
    };
  }

  // Tier 2 — ambiguous long background (mobile may have silently killed the socket).
  if (hiddenMs > LONG_BACKGROUND_MS) {
    return {
      tier: "long_background",
      event: "player:reconnected",
      method: "long_background",
      confidence: "medium",
      hiddenMs,
    };
  }

  // Tier 1 — noise (trivial tab-switch).
  return {
    tier: "noise",
    event: "player:resumed",
    method: null,
    confidence: "noise",
    hiddenMs,
  };
}
