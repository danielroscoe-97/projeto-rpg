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

/**
 * Which `/api/session/[id]/*` endpoint to hit. Default "state" preserves the
 * original S3.5 shipping behavior. Added in C2 (Fetch Orchestrator Audit) so
 * the dm-presence / latest-recap loops can share a single circuit breaker,
 * throttle window, and coverage telemetry pool with the main /state fetcher.
 */
export type FetchPath = "state" | "dm-presence" | "latest-recap";

export interface FetchRequest {
  encounterId: string;
  priority: FetchPriority;
  /** Stable caller name — used for dedup and telemetry. */
  caller: string;
  /**
   * Optional query params appended to the URL (e.g. `?token_id=…` for the
   * visibility-change anti-split-brain check). Participates in the dedup /
   * coalescing key so two callers with different params aren't merged into
   * a single awaiter group (they'd get the wrong response otherwise).
   */
  queryParams?: Record<string, string>;
  /** Endpoint path segment under `/api/session/[id]/`. Defaults to "state". */
  path?: FetchPath;
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
  /**
   * Disable the BroadcastChannel-based multi-tab detector. Defaults to `false`
   * in browser contexts, `true` in tests/SSR. When disabled, the orchestrator
   * never emits `fetch_orchestrator:multi_tab_detected`. No behavior change
   * beyond the telemetry event — this detector is pure observation, not
   * coordination (cross-tab coordination is Fase 4 / beta 5 follow-up).
   */
  disableMultiTabDetector?: boolean;
  /**
   * Channel constructor — defaults to the global BroadcastChannel. Override
   * for tests (jsdom lacks BroadcastChannel in some setups).
   */
  broadcastChannelImpl?: typeof BroadcastChannel;
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
 * BroadcastChannel name shared by every orchestrator instance in the same
 * origin. Used purely for telemetry (multi-tab detection) — this is NOT a
 * coordination channel. Coordinating a single orchestrator across tabs is
 * Fase 4 in docs/spec-fetch-orchestrator-audit.md.
 */
const MULTI_TAB_CHANNEL_NAME = "fetch-orchestrator";

/** Cool-down between repeated `multi_tab_detected` emissions from one tab. */
const MULTI_TAB_TELEMETRY_COOLDOWN_MS = 60_000;

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

  /** Unique per-instance id used to distinguish tabs on the broadcast channel. */
  private readonly instanceId: string;
  /** BroadcastChannel used to detect other orchestrator instances (i.e. other tabs). */
  private multiTabChannel: BroadcastChannel | null = null;
  /** When we last emitted `multi_tab_detected` — rate-limits noisy telemetry. */
  private lastMultiTabEmitAt = 0;

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

    // Instance id — short random suffix is plenty for tab-count disambiguation.
    // Math.random collision odds across a few tabs/session is negligible.
    this.instanceId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);

    // Multi-tab detector — opt-out for tests / SSR. Defaults to ON in the browser.
    const shouldEnableDetector =
      !config.disableMultiTabDetector &&
      (config.broadcastChannelImpl !== undefined ||
        typeof BroadcastChannel !== "undefined");
    if (shouldEnableDetector) {
      try {
        const BC = config.broadcastChannelImpl ?? BroadcastChannel;
        this.multiTabChannel = new BC(MULTI_TAB_CHANNEL_NAME);
        this.multiTabChannel.onmessage = (ev: MessageEvent) => {
          this.handleMultiTabMessage(ev.data);
        };
        // Announce ourselves so any already-open tab counts us.
        this.multiTabChannel.postMessage({
          type: "hello",
          instanceId: this.instanceId,
        });
      } catch {
        // BroadcastChannel construction can throw in exotic environments
        // (iframes with null origin, COOP boundaries). Silently degrade —
        // we lose the telemetry signal but the orchestrator still works.
        this.multiTabChannel = null;
      }
    }
  }

  /**
   * Handle a message from another orchestrator instance (i.e. another tab).
   * Emits `fetch_orchestrator:multi_tab_detected` — rate-limited to once per
   * minute per tab — to surface the G3 vector documented in the spec (N tabs
   * = N orchestrators = multiplied rate-limit spend).
   */
  private handleMultiTabMessage(msg: unknown): void {
    if (!msg || typeof msg !== "object") return;
    const typed = msg as { type?: string; instanceId?: string };
    if (typed.type !== "hello") return;
    if (!typed.instanceId || typed.instanceId === this.instanceId) return;

    const nowMs = this.now();
    if (nowMs - this.lastMultiTabEmitAt < MULTI_TAB_TELEMETRY_COOLDOWN_MS) return;
    this.lastMultiTabEmitAt = nowMs;

    this.trackEventImpl("fetch_orchestrator:multi_tab_detected", {
      instance_id: this.instanceId,
      peer_instance_id: typed.instanceId,
    });
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
    // Compose the cache key used by throttle/coalescing. Two requests with the
    // same encounterId but different queryParams (e.g. one with `?token_id=X`,
    // one without) MUST NOT share an awaiter group — the response body differs.
    // Path also segments the pool so `/state` and `/dm-presence` don't coalesce.
    const cacheKey = this.buildCacheKey(req);

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
      // cache key — that's the only case where we can coalesce below. If an
      // in-flight exists for a different key, coalescing won't apply and
      // falling through would start a parallel fetch, violating the throttle
      // window. In that case, drop as throttled.
      const canCoalesce =
        this.inFlight !== null && this.inFlightKey === cacheKey;
      if (since < minInterval && !canCoalesce) {
        this.emitDropped(req, "throttle");
        return null;
      }
    }

    // --- Dedup: same caller + cache key already pending? -----------------
    const dedupKey = `${req.caller}::${cacheKey}`;
    if (this.queuedKeys.has(dedupKey)) {
      this.emitDropped(req, "dedup");
      return null;
    }

    // --- In-flight coalescing --------------------------------------------
    // If a fetch is already on the wire for the same cache key (encounterId
    // + path + queryParams), attach to it. Different keys cannot coalesce
    // because their response bodies differ.
    if (this.inFlight && this.inFlightKey === cacheKey) {
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
    this.inFlightKey = cacheKey;
    return promise;
  }

  /**
   * Cache key used for throttle / dedup / coalescing. Includes encounterId,
   * path, and the sorted queryParams so semantically-identical requests share
   * an awaiter group while semantically-different ones don't.
   */
  private buildCacheKey(req: FetchRequest): string {
    const path = req.path ?? "state";
    const params = req.queryParams;
    if (!params || Object.keys(params).length === 0) {
      return `${req.encounterId}::${path}`;
    }
    // Sort keys so `{a:1,b:2}` and `{b:2,a:1}` produce the same key.
    const sortedEntries = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    return `${req.encounterId}::${path}::${sortedEntries}`;
  }

  private buildUrl(req: FetchRequest): string {
    const path = req.path ?? "state";
    const base = `/api/session/${req.encounterId}/${path}`;
    const params = req.queryParams;
    if (!params || Object.keys(params).length === 0) return base;
    const qs = new URLSearchParams(params).toString();
    return qs.length > 0 ? `${base}?${qs}` : base;
  }

  private async executeFetch(req: FetchRequest): Promise<SessionStateEnvelope | null> {
    this.lastFetchAt = this.now();

    try {
      const url = this.buildUrl(req);
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
      // /state wraps its payload in `{data: ...}`; /dm-presence and
      // /latest-recap return the payload directly. Normalize both shapes.
      const body = (await res.json()) as
        | { data?: SessionStateEnvelope | null }
        | SessionStateEnvelope
        | null;
      const wrapped =
        body && typeof body === "object" && "data" in body
          ? (body as { data?: SessionStateEnvelope | null }).data ?? null
          : (body as SessionStateEnvelope | null);
      const state = wrapped ?? null;

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
