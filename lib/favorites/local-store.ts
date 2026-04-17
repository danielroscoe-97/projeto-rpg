/**
 * S5.2 — localStorage-backed favorites store for Guest + Anon users.
 *
 * Auth users use Supabase (/api/favorites). This store powers:
 *   - Guest: persisted via localStorage (key `pdm:favorites:v1`).
 *   - Anon:  same key (lost when browser is cleared, acceptable by spec).
 *
 * Cross-tab sync uses BroadcastChannel so a favorite added in tab A
 * appears in tab B without a reload. Falls back to `storage` event
 * when BroadcastChannel is unavailable (older Safari).
 *
 * Cap: 50 per kind (anti-abuse). `addFavorite` returns `false` when the
 * cap is hit so the UI can show `favorites.limit_reached`.
 */
export type FavoriteKind = "monster" | "item" | "condition";

export type Favorite = {
  kind: FavoriteKind;
  slug: string;
  /** epoch-ms */
  favorited_at: number;
};

export const FAVORITES_KEY = "pdm:favorites:v1";
export const BROADCAST_CHANNEL = "pdm:favorites:v1";
export const MAX_PER_KIND = 50;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Notify all in-process subscribers that the store changed. */
function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* swallow — one bad listener should not break others */
    }
  }
}

/** True if we're running in a browser with localStorage. */
function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/** Safely read and parse the favorites blob. Returns `[]` on any error. */
function readAll(): Favorite[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // defensive: drop malformed entries
    return parsed.filter(
      (f): f is Favorite =>
        !!f &&
        typeof f === "object" &&
        typeof (f as Favorite).slug === "string" &&
        typeof (f as Favorite).favorited_at === "number" &&
        ((f as Favorite).kind === "monster" ||
          (f as Favorite).kind === "item" ||
          (f as Favorite).kind === "condition"),
    );
  } catch {
    return [];
  }
}

/** Write and broadcast. Swallows quota/unavailable errors. */
function writeAll(favorites: Favorite[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    broadcast();
    notify();
  } catch {
    /* quota exceeded / storage disabled — silent */
  }
}

/** Best-effort cross-tab notification. */
function broadcast(): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL);
      ch.postMessage({ type: "favorites:changed", at: Date.now() });
      ch.close();
    }
  } catch {
    /* unavailable — storage event still fires for other tabs */
  }
}

/**
 * List favorites, optionally filtered by kind.
 * Sorted newest-first (by `favorited_at` desc) so UI lists feel fresh.
 */
export function getFavorites(kind?: FavoriteKind): Favorite[] {
  const all = readAll();
  const filtered = kind ? all.filter((f) => f.kind === kind) : all;
  return [...filtered].sort((a, b) => b.favorited_at - a.favorited_at);
}

/**
 * Add a favorite. Returns `true` on success, `false` if the per-kind cap
 * was hit (caller should surface `favorites.limit_reached`).
 *
 * Idempotent: re-favoriting an existing slug is a no-op and returns `true`.
 */
export function addFavorite(kind: FavoriteKind, slug: string): boolean {
  const all = readAll();
  if (all.some((f) => f.kind === kind && f.slug === slug)) {
    return true; // already favorited — treat as success for UX idempotency
  }
  const countForKind = all.filter((f) => f.kind === kind).length;
  if (countForKind >= MAX_PER_KIND) return false;
  all.push({ kind, slug, favorited_at: Date.now() });
  writeAll(all);
  return true;
}

/** Remove a favorite. No-op if not present. */
export function removeFavorite(kind: FavoriteKind, slug: string): void {
  const all = readAll();
  const next = all.filter((f) => !(f.kind === kind && f.slug === slug));
  if (next.length !== all.length) writeAll(next);
}

/** True if `slug` is favorited under `kind`. */
export function isFavorite(kind: FavoriteKind, slug: string): boolean {
  return readAll().some((f) => f.kind === kind && f.slug === slug);
}

/**
 * Subscribe to local-store changes (same tab + cross-tab).
 * Returns an unsubscribe function.
 *
 * Intended for `useSyncExternalStore`-style hooks. Safe to call on SSR
 * (returns a no-op unsubscribe).
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }

  // Cross-tab via BroadcastChannel
  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(BROADCAST_CHANNEL);
      channel.addEventListener("message", listener);
    }
  } catch {
    channel = null;
  }

  // Fallback: `storage` event (fires in *other* tabs only, which is fine —
  // local notify() already covers same-tab).
  const storageHandler = (e: StorageEvent) => {
    if (e.key === FAVORITES_KEY) listener();
  };
  window.addEventListener("storage", storageHandler);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", storageHandler);
    if (channel) {
      try {
        channel.removeEventListener("message", listener);
        channel.close();
      } catch {
        /* ignore */
      }
    }
  };
}

/** Test-only helper — clears the store and notifies subscribers. */
export function __resetForTests(): void {
  if (!hasStorage()) {
    listeners.clear();
    return;
  }
  try {
    window.localStorage.removeItem(FAVORITES_KEY);
  } catch {
    /* ignore */
  }
  notify();
}
