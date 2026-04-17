/**
 * Fetch orchestrator (S3.5) — singleton that deduplicates, coalesces, throttles,
 * and circuit-breaks /api/session/[id]/state requests coming from the 4-5
 * polling loops inside `PlayerJoinClient.tsx`.
 *
 * Problem this fixes: during beta 3 the player page hit the endpoint 219 req/min
 * at peak (90 × 429 in 2min). Loops: lobby-poll, turn-poll, late-join-poll,
 * dm-presence-poll, visibility-change fetch. When 8 players' tabs all regained
 * focus at the same time (group session break ending), they storm the endpoint.
 *
 * Design:
 *   - 4 priority tiers (emergency / high / throttled / background) with different
 *     min-intervals (0 / 2s / 5s / 15s).
 *   - Emergency bypasses throttle AND circuit breaker (recovery paths MUST proceed).
 *   - Dedup: if the same caller already has a request queued / in-flight for the
 *     same encounterId, the new call returns null without hitting the network.
 *   - In-flight coalescing: if a fetch is already on the wire, new callers attach
 *     to the same promise — one network call resolves N awaiters.
 *   - Circuit breaker: after 3 consecutive errors, circuit opens for 30s. All
 *     non-emergency calls return null during that window; emergency calls still
 *     go through (and reset the circuit on success).
 *
 * Rollback: delete this file + revert PlayerJoinClient.tsx body changes; the
 * pre-existing Track-C in-memory throttle in fetchFullState continues to work.
 *
 * Telemetry events:
 *   - fetch_orchestrator:hit        { caller, priority }
 *   - fetch_orchestrator:dropped    { caller, reason }
 *   - fetch_orchestrator:circuit_open  { caller }
 *   - fetch_orchestrator:circuit_close { duration_ms }
 */

import { trackEvent } from "@/lib/analytics/track";

export type FetchPriority = "emergency" | "high" | "throttled" | "background";

export interface FetchRequest {
  encounterId: string;
  priority: FetchPriority;
  /** Stable caller name — used for dedup and telemetry. */
  caller: string;
}

/** The shape of `data` returned by /api/session/[id]/state. */
export interface SessionStateEnvelope {
  encounter: unknown;
  combatants: unknown;
  dm_plan?: unknown;
  dm_last_seen_at?: unknown;
  token_owner?: unknown;
  lobby_players?: unknown;
}

export interface OrchestratorConfig {
  /** Called when a fetch actually hits the network. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Telemetry hook — defaults to `trackEvent`. Override for tests. */
  trackEventImpl?: (name: string, props?: Record<string, unknown>) => void;
  /** Clock — defaults to Date.now. Override for deterministic tests. */
  now?: () => number;
  /**
   * Hook fired on HTTP 401 before counting the failure. Return `true` to
   * have the orchestrator retry the same request once (useful for silent
   * Supabase session refresh). Return `false` to treat 401 as a terminal
   * failure (opens circuit after 3 consecutive errors like any other).
   */
  onUnauthorized?: () => Promise<boolean>;
}

type DropReason = "throttle" | "dedup" | "circuit";

interface CoalescedAwaiter {
  caller: string;
  priority: FetchPriority;
  resolve: (state: SessionStateEnvelope | null) => void;
}

// Priority intervals (ms). Emergency bypasses the throttle entirely.
const INTERVALS: Record<FetchPriority, number> = {
  emergency: 0,
  high: 2_000,
  throttled: 5_000,
  background: 15_000,
};

const MAX_CONSECUTIVE_ERRORS = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;

/**
 * Internal class — instantiated as a singleton via `fetchOrchestrator` below.
 * Exported for tests that need a fresh instance with injected deps.
 */
export class FetchOrchestrator {
  private lastFetchAt = 0;
  private inFlight: Promise<SessionStateEnvelope | null> | null = null;
  private inFlightKey: string | null = null;
  /** Awaiters piggy-backing on the current in-flight request. */
  private awaiters: CoalescedAwaiter[] = [];
  /** Callers currently queued (dedup key = `${caller}::${encounterId}`). */
  private queuedKeys = new Set<string>();

  private consecutiveErrors = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;

  private readonly fetchImpl: typeof fetch;
  private readonly trackEventImpl: (name: string, props?: Record<string, unknown>) => void;
  private readonly now: () => number;
  private onUnauthorized: (() => Promise<boolean>) | null;

  constructor(config: OrchestratorConfig = {}) {
    this.fetchImpl =
      config.fetchImpl ??
      (typeof fetch !== "undefined"
        ? fetch.bind(globalThis)
        : (() => {
            throw new Error("fetch is not defined");
          }));
    this.trackEventImpl = config.trackEventImpl ?? trackEvent;
    this.now = config.now ?? (() => Date.now());
    this.onUnauthorized = config.onUnauthorized ?? null;
  }

  /**
   * Register (or update) the 401 recovery hook. Safe to call multiple times —
   * the most recent hook wins. Used by PlayerJoinClient to plumb in Supabase
   * session refresh without coupling this module to supabase-js.
   */
  setUnauthorizedHandler(handler: (() => Promise<boolean>) | null): void {
    this.onUnauthorized = handler;
  }

  /** Request a fresh session state. Returns null if the request was dropped. */
  async fetch(req: FetchRequest): Promise<SessionStateEnvelope | null> {
    // --- Circuit breaker -------------------------------------------------
    if (this.circuitOpen) {
      const elapsed = this.now() - this.circuitOpenedAt;
      if (elapsed < CIRCUIT_COOLDOWN_MS) {
        if (req.priority !== "emergency") {
          this.emitDropped(req, "circuit");
          return null;
        }
        // Emergency bypass — fall through. Success will close the circuit.
      } else {
        // Cooldown expired — close circuit, allow probe.
        this.closeCircuit(elapsed);
      }
    }

    // --- Throttle (emergency bypasses) -----------------------------------
    const minInterval = INTERVALS[req.priority];
    if (req.priority !== "emergency" && this.lastFetchAt > 0) {
      const since = this.now() - this.lastFetchAt;
      // Only bypass the throttle when the in-flight request is for the SAME
      // encounterId — that's the only case where we can coalesce below. If an
      // in-flight exists for a different encounterId, coalescing won't apply
      // and falling through would start a parallel fetch, violating the
      // throttle window. In that case, drop as throttled.
      const canCoalesce =
        this.inFlight !== null && this.inFlightKey === req.encounterId;
      if (since < minInterval && !canCoalesce) {
        this.emitDropped(req, "throttle");
        return null;
      }
    }

    // --- Dedup: same caller + encounterId already pending? ---------------
    const dedupKey = `${req.caller}::${req.encounterId}`;
    if (this.queuedKeys.has(dedupKey)) {
      this.emitDropped(req, "dedup");
      return null;
    }

    // --- In-flight coalescing --------------------------------------------
    // If a fetch is already on the wire for the same encounterId, attach to it.
    // Different encounterId is exceedingly rare (single session per client) but
    // we still coalesce — the awaiter will get whatever state comes back. The
    // caller can filter by encounterId on the response if needed.
    if (this.inFlight && this.inFlightKey === req.encounterId) {
      this.queuedKeys.add(dedupKey);
      return new Promise<SessionStateEnvelope | null>((resolve) => {
        this.awaiters.push({
          caller: req.caller,
          priority: req.priority,
          resolve: (state) => {
            this.queuedKeys.delete(dedupKey);
            resolve(state);
          },
        });
      });
    }

    // --- Execute fresh fetch ---------------------------------------------
    this.queuedKeys.add(dedupKey);
    const promise = this.executeFetch(req).finally(() => {
      this.queuedKeys.delete(dedupKey);
    });
    this.inFlight = promise;
    this.inFlightKey = req.encounterId;
    return promise;
  }

  private async executeFetch(req: FetchRequest): Promise<SessionStateEnvelope | null> {
    this.lastFetchAt = this.now();

    try {
      const url = `/api/session/${req.encounterId}/state`;
      let res = await this.fetchImpl(url, { credentials: "include" });

      // 401 recovery: give the caller a chance to refresh auth silently.
      // The hook returns `true` if the refresh succeeded and we should retry.
      if (res.status === 401 && this.onUnauthorized) {
        const refreshed = await this.onUnauthorized().catch(() => false);
        if (refreshed) {
          res = await this.fetchImpl(url, { credentials: "include" });
        }
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as { data?: SessionStateEnvelope };
      const state = body?.data ?? null;

      // Success — reset error counter and close any open circuit.
      if (this.circuitOpen) {
        this.closeCircuit(this.now() - this.circuitOpenedAt);
      }
      this.consecutiveErrors = 0;

      this.trackEventImpl("fetch_orchestrator:hit", {
        caller: req.caller,
        priority: req.priority,
      });

      // Resolve all awaiters with the same state.
      this.resolveAwaiters(state);
      return state;
    } catch (_err) {
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && !this.circuitOpen) {
        this.circuitOpen = true;
        this.circuitOpenedAt = this.now();
        this.trackEventImpl("fetch_orchestrator:circuit_open", {
          caller: req.caller,
        });
      }
      // Awaiters get null on failure — they can retry via their own path.
      this.resolveAwaiters(null);
      return null;
    } finally {
      this.inFlight = null;
      this.inFlightKey = null;
    }
  }

  private resolveAwaiters(state: SessionStateEnvelope | null): void {
    const pending = this.awaiters.splice(0);
    for (const a of pending) {
      try {
        a.resolve(state);
      } catch {
        /* resolver should never throw; defensive no-op */
      }
    }
  }

  private closeCircuit(durationMs: number): void {
    this.circuitOpen = false;
    this.consecutiveErrors = 0;
    this.trackEventImpl("fetch_orchestrator:circuit_close", {
      duration_ms: durationMs,
    });
  }

  private emitDropped(req: FetchRequest, reason: DropReason): void {
    this.trackEventImpl("fetch_orchestrator:dropped", {
      caller: req.caller,
      reason,
    });
  }

  /**
   * Test-only helper — resets all internal state. NEVER call from production code.
   * Exposed so tests can isolate each case without carrying over throttle/circuit.
   */
  __resetForTests(): void {
    this.lastFetchAt = 0;
    this.inFlight = null;
    this.inFlightKey = null;
    this.awaiters = [];
    this.queuedKeys.clear();
    this.consecutiveErrors = 0;
    this.circuitOpen = false;
    this.circuitOpenedAt = 0;
  }
}

/**
 * Singleton consumed by PlayerJoinClient. Do not instantiate another one in
 * app code — the whole point is that there is exactly ONE throttle window
 * and ONE circuit breaker shared across every caller.
 */
export const fetchOrchestrator = new FetchOrchestrator();
