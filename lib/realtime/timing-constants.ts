/**
 * Single source of truth for realtime heartbeat / presence timings.
 *
 * BEFORE this module, four related timings were scattered across four files
 * as magic numbers without explicit relation. Drift risk: tweaking one
 * value without the others could silently break presence detection.
 *
 * Invariants (enforced at module load via assertTimingInvariants):
 *   WS_HEARTBEAT_MS < APP_HEARTBEAT_MS
 *   PLAYER_STALE_THRESHOLD_MS >= APP_HEARTBEAT_MS * 1.5
 *     (margin for 1 missed app-level heartbeat)
 *   DM_OFFLINE_THRESHOLD_MS >= APP_HEARTBEAT_MS * 3
 *     (3 missed beats threshold for DM-offline banner)
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-06-heartbeat-timing.md
 */

/**
 * Supabase Realtime WebSocket-level ping interval.
 * Lower = faster dead-connection detect; higher = less server load.
 * Tuned 2026-04-24 (PR #48): 20s balances snappy detection with CDC
 * pool health after the saturation incident.
 */
export const WS_HEARTBEAT_MS = 20_000;

/**
 * App-level DM heartbeat. Updates sessions.dm_last_seen_at periodically
 * so players can detect DM absence independently of the WS layer.
 * Must be > WS_HEARTBEAT_MS (WS is the tighter loop).
 */
export const APP_HEARTBEAT_MS = 30_000;

/**
 * Threshold for the DM's player list UI to mark a player as stale
 * (via session_tokens.last_seen_at). Must allow at least 1 missed
 * app-level heartbeat (APP_HEARTBEAT_MS * 1.5) to avoid flap on a
 * single missed beat.
 */
export const PLAYER_STALE_THRESHOLD_MS = 45_000;

/**
 * Threshold for the player to display a "DM offline" banner when the
 * DM's dm_last_seen_at has not been refreshed. Must allow 3 missed
 * app-level heartbeats (APP_HEARTBEAT_MS * 3) to avoid flap.
 */
export const DM_OFFLINE_THRESHOLD_MS = 90_000;

/**
 * Dev-time invariant check. Runs once at module load; throws if
 * constants drift (prevents accidental regression to mis-aligned values).
 * Also re-exported for explicit testing.
 */
export function assertTimingInvariants(): void {
  if (!(WS_HEARTBEAT_MS < APP_HEARTBEAT_MS)) {
    throw new Error(
      `Timing invariant violated: WS_HEARTBEAT_MS (${WS_HEARTBEAT_MS}) must be < APP_HEARTBEAT_MS (${APP_HEARTBEAT_MS})`,
    );
  }
  if (!(PLAYER_STALE_THRESHOLD_MS >= APP_HEARTBEAT_MS * 1.5)) {
    throw new Error(
      `Timing invariant violated: PLAYER_STALE_THRESHOLD_MS (${PLAYER_STALE_THRESHOLD_MS}) must be >= APP_HEARTBEAT_MS * 1.5 (${APP_HEARTBEAT_MS * 1.5})`,
    );
  }
  if (!(DM_OFFLINE_THRESHOLD_MS >= APP_HEARTBEAT_MS * 3)) {
    throw new Error(
      `Timing invariant violated: DM_OFFLINE_THRESHOLD_MS (${DM_OFFLINE_THRESHOLD_MS}) must be >= APP_HEARTBEAT_MS * 3 (${APP_HEARTBEAT_MS * 3})`,
    );
  }
}

// Run once at module load so any bad edit fails fast in dev.
assertTimingInvariants();
