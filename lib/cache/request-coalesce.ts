/**
 * In-memory request coalescing with per-key TTL.
 *
 * Purpose: reduce pool pressure on hot polling routes (primarily
 * `/api/combat/[id]/state`) identified as Causa #2 in the
 * `docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md`. Each request
 * on that route fires 5 parallel queries via `Promise.all`; 4 of the 5 touch
 * data that mutates orders-of-magnitude slower than the 2s polling cadence.
 *
 * Scope: single Node.js process. Vercel runs multiple serverless instances,
 * so each instance has its own cache. That's fine — the goal is pressure
 * reduction, not strict consistency. Expiration is per-key, not global.
 *
 * Safety properties:
 *   - Single-flight-LITE: two concurrent misses may double-fire the producer.
 *     Acceptable trade-off — the second miss just rewrites an identical value.
 *   - Bounded growth: ≤1000 entries; on overflow we sweep expired entries.
 *   - Manual invalidation: `invalidate(key)` / `invalidatePrefix(prefix)` for
 *     the "bust signal" contract (Dani decision 1c, 2026-04-24 — 15s token
 *     TTL with explicit invalidation when/if a revocation flow is added).
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 1000;

export async function coalesce<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await producer();
  store.set(key, { value, expiresAt: now + ttlMs });
  maybeSweep(now);
  return value;
}

/**
 * Invalidate a specific key. Call this when you mutate the underlying data
 * in a way that must be visible immediately — e.g. a DM revokes a player
 * token (`session_tokens.is_active = false`) and the player must lose access
 * within <polling-interval> rather than up to TTL seconds later.
 *
 * No-op if the key isn't cached.
 */
export function invalidate(key: string): void {
  store.delete(key);
}

/**
 * Invalidate all keys that start with `prefix`. Useful for batch busts like
 * "all cached rows for sessionId X" without tracking per-user keys.
 */
export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/**
 * Test helper — wipe the cache between test cases. Not exported for
 * production use.
 */
export function __resetForTests(): void {
  store.clear();
}

function maybeSweep(now: number): void {
  if (store.size <= MAX_ENTRIES) return;
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k);
  }
}
