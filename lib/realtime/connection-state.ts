/**
 * Connection State Machine — explicit pubsub for realtime subscribe lifecycle.
 *
 * Before this module, broadcast.ts scattered connection state across module-level
 * vars (`reconnectAttempts`, `reconnectBackoffMs`, `channel`, `channelReady`,
 * `errorHandledForThisLifecycle`). Consumers couldn't answer basic questions:
 *   - "Are we connected?"       → `channel.state` reflects Supabase SDK, not our retry loop
 *   - "Are we reconnecting?"    → no clean observable signal
 *   - "Did we hit the ceiling?" → only via `setSyncStatus("offline")` side-effect
 *
 * This module makes the state machine explicit and observable. It is the
 * foundation for:
 *   - CR-03 `useEventResume` — reacts to `connected` transitions to fetch missed events
 *   - PlayerJoinClient skeleton rendering — reacts to `reconnecting`/`degraded`
 *   - Sync indicator UI — reacts to `degraded`
 *
 * Transitions are validated against a table; invalid transitions are logged via
 * captureWarning and ignored (do not throw — we don't want prod crashes from
 * bug-ridden callsites).
 *
 * Emission is synchronous — listeners are invoked before `transitionTo` returns.
 * Async listener work should happen inside the callback.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-01-connection-state-machine.md
 */
import { captureWarning } from "@/lib/errors/capture";

export type ConnectionState =
  | { kind: "idle" }
  | { kind: "connecting"; attempt: number; since: number }
  | { kind: "connected"; subscribedAt: number; currentSeq: number }
  | { kind: "reconnecting"; attempt: number; since: number; backoffMs: number }
  | { kind: "degraded"; reason: DegradedReason; since: number }
  | { kind: "closed" };

/**
 * IG-2 fix (2026-04-26 review): `ceiling_hit` was the original CR-01 AC2
 * reason but F5 evolved the broadcast.ts logic to always pick a more
 * specific reason on ceiling-burnt — `navigator.onLine === false` →
 * `network_offline`, otherwise `broker_down` (the OS thinks it's online
 * but the broker isn't responding). `ceiling_hit` was never emitted
 * post-F5; removing it from the enum so a future contributor doesn't
 * mistakenly pattern-match on a dead value.
 */
export type DegradedReason = "network_offline" | "broker_down";

let current: ConnectionState = { kind: "idle" };
const listeners = new Set<(s: ConnectionState) => void>();

/** Get the current connection state. */
export function getConnectionState(): ConnectionState {
  return current;
}

/**
 * Subscribe to state transitions.
 * Listener is called immediately with the current state (useful for initial render).
 * Returns an unsubscribe function.
 */
export function onConnectionStateChange(cb: (s: ConnectionState) => void): () => void {
  listeners.add(cb);
  // Fire immediately so the consumer sees current state without waiting for next transition.
  try {
    cb(current);
  } catch (err) {
    captureWarning("Connection state listener threw on initial emit", {
      component: "connection-state",
      category: "realtime",
      extra: { err: (err as Error).message },
    });
  }
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Transition to a new state. Invalid transitions (per `isValidTransition`) are
 * ignored with a warning — we don't crash prod on a callsite bug.
 *
 * Called by broadcast.ts internals; not intended for external use.
 */
export function transitionTo(next: ConnectionState): void {
  if (!isValidTransition(current, next)) {
    captureWarning(
      `Invalid connection state transition: ${current.kind} → ${next.kind}`,
      {
        component: "connection-state",
        action: "transitionTo",
        category: "realtime",
        extra: { from: current, to: next },
      },
    );
    return;
  }
  current = next;
  // Copy listeners to array so removal during iteration doesn't skip callbacks.
  const snapshot = Array.from(listeners);
  for (const cb of snapshot) {
    try {
      cb(next);
    } catch (err) {
      captureWarning("Connection state listener threw during transition", {
        component: "connection-state",
        action: "listener",
        category: "realtime",
        extra: { err: (err as Error).message, stateKind: next.kind },
      });
    }
  }
}

/** Transition validity table. Codifies the FSM from the tech spec §3.2.
 *
 *  H-1 fix (Estabilidade Combate review 2026-04-26):
 *    - `reconnecting → connecting` is valid: the retry timer fires
 *      `createAndSubscribe` which emits `connecting` for the new attempt.
 *    - `closed → closed` is permitted as a no-op so cleanup chains
 *      (cleanupDmChannel followed by resetDmChannel, or double-cleanup
 *      from React StrictMode) don't generate spurious warnings.
 *    - `idle → idle` is permitted for the same reason on reset paths.
 */
function isValidTransition(from: ConnectionState, to: ConnectionState): boolean {
  const table: Record<ConnectionState["kind"], ConnectionState["kind"][]> = {
    idle: ["idle", "connecting", "closed"],
    connecting: ["connected", "reconnecting", "closed"],
    connected: ["reconnecting", "degraded", "closed"],
    reconnecting: ["connecting", "connected", "degraded", "closed"],
    degraded: ["connecting", "closed"],
    closed: ["idle", "closed"],
  };
  return table[from.kind].includes(to.kind);
}

/**
 * Test-only: reset the module-level state. Don't call from runtime code.
 * Exported to let unit tests start from a known state (`idle`) between cases.
 */
export function __resetForTests(): void {
  current = { kind: "idle" };
  listeners.clear();
}
