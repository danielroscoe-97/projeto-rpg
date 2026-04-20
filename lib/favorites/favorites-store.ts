"use client";

/**
 * S5.2 Beta 4 P0 — Shared-state Zustand store for favorites.
 *
 * Replaces the per-instance `useFavorites` hook fetch + auth + listener
 * pattern that caused a rate-limit storm (1 GET per `<FavoriteStar>` × 150
 * stars concurrent = 150 hits against a 30/min limit).
 *
 * Shape of the solution:
 *   - ONE `supabase.auth.getUser()` resolution cached module-scope.
 *   - ONE `fetch(/api/favorites?kind=X)` per kind per app lifecycle.
 *   - ONE pair of `window.focus` + `document.visibilitychange` listeners
 *     for ALL stars (debounced 500ms).
 *   - ONE `local-store` subscription (guest/anon) covering the 3 kinds.
 *
 * Consumers continue to use `useFavorites(kind)` — this module is behind
 * the `useFavoritesV2` path that `use-favorites.ts` routes to when the
 * `ff_favorites_v2_shared_state` flag is ON. API surface is identical,
 * so call-sites (`FavoriteStar`, `FavoritesTab`, `PlayerCompendiumBrowser`)
 * need zero changes.
 *
 * Parity matrix:
 *   Guest           — localStorage via local-store.ts (singleton listener)
 *   Anon (/join)    — same as Guest
 *   Auth (/invite)  — /api/favorites + cache (single listener, single fetch/kind)
 */

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import {
  addFavorite as localAdd,
  removeFavorite as localRemove,
  isFavorite as localIs,
  getFavorites as localGet,
  subscribe as localSubscribe,
  MAX_PER_KIND,
  type Favorite,
  type FavoriteKind,
} from "@/lib/favorites/local-store";

export type { Favorite, FavoriteKind } from "@/lib/favorites/local-store";
export { MAX_PER_KIND } from "@/lib/favorites/local-store";

type ApiFavorite = { slug: string; kind: FavoriteKind; favorited_at: string };

type AuthState = { resolved: boolean; isAuth: boolean };

type KindState = {
  /** O(1) lookup set — mirrors `favorites` array. */
  slugs: Set<string>;
  /** Full rows, newest-first (same contract as the legacy hook). */
  favorites: Favorite[];
  /** True while an in-flight fetch is running for this kind. */
  loading: boolean;
  /** Set to true when a POST returns 409 `limit_reached`. UI clears via `clearLimitReached`. */
  limitReached: boolean;
  /** Has `ensureHydrated(kind)` resolved once? Prevents duplicate GETs. */
  hydrated: boolean;
};

type FavoritesState = {
  auth: AuthState;
  byKind: Record<FavoriteKind, KindState>;
  /** Idempotent — first call triggers load; subsequent calls are no-ops. */
  ensureHydrated: (kind: FavoriteKind) => Promise<void>;
  /** Forces a refetch (bypasses the `hydrated` guard). */
  reload: (kind: FavoriteKind) => Promise<void>;
  add: (kind: FavoriteKind, slug: string) => Promise<boolean>;
  remove: (kind: FavoriteKind, slug: string) => Promise<void>;
  isFavorite: (kind: FavoriteKind, slug: string) => boolean;
  clearLimitReached: (kind: FavoriteKind) => void;
  /** Test-only — wipes auth cache, listener flags, and all kind state. */
  __resetForTests: () => void;
};

const KINDS: FavoriteKind[] = ["monster", "item", "condition"];

function emptyKindState(initialFavorites: Favorite[] = []): KindState {
  return {
    slugs: new Set(initialFavorites.map((f) => f.slug)),
    favorites: initialFavorites,
    loading: false,
    limitReached: false,
    hydrated: false,
  };
}

function initialByKind(): Record<FavoriteKind, KindState> {
  return {
    monster: emptyKindState(localGet("monster")),
    item: emptyKindState(localGet("item")),
    condition: emptyKindState(localGet("condition")),
  };
}

function toLocalShape(row: ApiFavorite): Favorite {
  return {
    kind: row.kind,
    slug: row.slug,
    favorited_at: new Date(row.favorited_at).getTime(),
  };
}

// ---- Module-scoped caches (outside the Zustand store) ------------------

/** Cached auth probe promise — resolved exactly once per app lifecycle. */
let _authPromise: Promise<AuthState> | null = null;
/** Cached in-flight per-kind fetches — dedupes concurrent `ensureHydrated` calls. */
const _fetchInFlight: Partial<Record<FavoriteKind, Promise<void>>> = {};
/** Module-scoped flag — global focus/visibilitychange listener registered once. */
let _globalListenerRegistered = false;
/** Module-scoped flag — local-store subscription registered once. */
let _localStoreSubscribed = false;
/** Unsubscribe functions (cleared by `__resetForTests`). */
let _unsubGlobalFocus: (() => void) | null = null;
let _unsubLocalStore: (() => void) | null = null;

function resolveAuthOnce(): Promise<AuthState> {
  if (_authPromise) return _authPromise;
  _authPromise = (async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const isAuth = !!u && !u.is_anonymous;
      return { resolved: true, isAuth };
    } catch {
      return { resolved: true, isAuth: false };
    }
  })();
  return _authPromise;
}

/**
 * Debounce helper — module-scoped so the one-and-only focus listener
 * batches bursts from tab switching.
 */
function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => {
      handle = null;
      fn(...args);
    }, ms);
  }) as T;
}

/**
 * Register ONE pair of focus + visibilitychange listeners that refresh all
 * hydrated auth-backed kinds. Idempotent via `_globalListenerRegistered`.
 */
function registerGlobalFocusListener(): void {
  if (_globalListenerRegistered) return;
  if (typeof window === "undefined") return;
  _globalListenerRegistered = true;

  const refresh = debounce(() => {
    const state = useFavoritesStore.getState();
    if (!state.auth.isAuth) return;
    for (const k of KINDS) {
      if (state.byKind[k].hydrated) {
        void state.reload(k);
      }
    }
  }, 500);

  const handler = () => {
    if (document.visibilityState === "visible") refresh();
  };
  window.addEventListener("focus", handler);
  document.addEventListener("visibilitychange", handler);
  _unsubGlobalFocus = () => {
    window.removeEventListener("focus", handler);
    document.removeEventListener("visibilitychange", handler);
  };
}

/**
 * Guest/anon mode subscribes ONCE to the local-store and invalidates
 * all three kinds when anything changes. Idempotent.
 */
function subscribeToLocalStore(): void {
  if (_localStoreSubscribed) return;
  _localStoreSubscribed = true;
  _unsubLocalStore = localSubscribe(() => {
    // Guest/anon: hydrate each kind directly from local-store.
    useFavoritesStore.setState((prev) => {
      const next: Record<FavoriteKind, KindState> = { ...prev.byKind };
      for (const k of KINDS) {
        const favs = localGet(k);
        next[k] = {
          ...prev.byKind[k],
          favorites: favs,
          slugs: new Set(favs.map((f) => f.slug)),
        };
      }
      return { byKind: next };
    });
  });
}

function patchKind(
  state: FavoritesState,
  kind: FavoriteKind,
  patch: Partial<KindState>,
): Pick<FavoritesState, "byKind"> {
  return {
    byKind: {
      ...state.byKind,
      [kind]: { ...state.byKind[kind], ...patch },
    },
  };
}

async function fetchKind(kind: FavoriteKind): Promise<Favorite[] | null> {
  try {
    const res = await fetch(`/api/favorites?kind=${encodeURIComponent(kind)}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { favorites: ApiFavorite[] };
    return json.favorites.map(toLocalShape);
  } catch {
    return null;
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  auth: { resolved: false, isAuth: false },
  byKind: initialByKind(),

  ensureHydrated: async (kind: FavoriteKind) => {
    // Dedupe concurrent ensureHydrated calls for the same kind.
    const inFlight = _fetchInFlight[kind];
    if (inFlight) return inFlight;

    if (get().byKind[kind].hydrated) return;

    const p = (async () => {
      const auth = await resolveAuthOnce();
      // Commit auth state once (idempotent — identical value on later calls).
      if (!get().auth.resolved) {
        set({ auth });
      }

      if (!auth.isAuth) {
        // Guest / anon path: hydrate from local-store, subscribe once.
        subscribeToLocalStore();
        const favs = localGet(kind);
        set((state) =>
          patchKind(state, kind, {
            favorites: favs,
            slugs: new Set(favs.map((f) => f.slug)),
            hydrated: true,
            loading: false,
          }),
        );
        return;
      }

      // Auth path — single GET per kind lifecycle, register global listener.
      registerGlobalFocusListener();
      set((state) => patchKind(state, kind, { loading: true }));
      const favs = await fetchKind(kind);
      if (favs !== null) {
        set((state) =>
          patchKind(state, kind, {
            favorites: favs,
            slugs: new Set(favs.map((f) => f.slug)),
            loading: false,
            hydrated: true,
          }),
        );
      } else {
        // Network failure — fall back to local-store cache, still mark hydrated
        // so we don't storm on retries; next `reload()` or focus event will retry.
        const fallback = localGet(kind);
        set((state) =>
          patchKind(state, kind, {
            favorites: fallback,
            slugs: new Set(fallback.map((f) => f.slug)),
            loading: false,
            hydrated: true,
          }),
        );
      }
    })();

    _fetchInFlight[kind] = p;
    try {
      await p;
    } finally {
      delete _fetchInFlight[kind];
    }
  },

  reload: async (kind: FavoriteKind) => {
    const auth = await resolveAuthOnce();
    if (!auth.isAuth) {
      const favs = localGet(kind);
      set((state) =>
        patchKind(state, kind, {
          favorites: favs,
          slugs: new Set(favs.map((f) => f.slug)),
        }),
      );
      return;
    }
    // Coalesce overlapping reloads.
    const inFlight = _fetchInFlight[kind];
    if (inFlight) return inFlight;

    const p = (async () => {
      set((state) => patchKind(state, kind, { loading: true }));
      const favs = await fetchKind(kind);
      if (favs !== null) {
        set((state) =>
          patchKind(state, kind, {
            favorites: favs,
            slugs: new Set(favs.map((f) => f.slug)),
            loading: false,
            hydrated: true,
          }),
        );
      } else {
        set((state) => patchKind(state, kind, { loading: false }));
      }
    })();
    _fetchInFlight[kind] = p;
    try {
      await p;
    } finally {
      delete _fetchInFlight[kind];
    }
  },

  add: async (kind: FavoriteKind, slug: string): Promise<boolean> => {
    const { auth, byKind } = get();
    const k = byKind[kind];

    // Guest / anon — local-store is the source of truth.
    if (!auth.isAuth) {
      const ok = localAdd(kind, slug);
      if (!ok) {
        set((state) => patchKind(state, kind, { limitReached: true }));
        trackEvent("favorites:limit_reached", { kind });
        return false;
      }
      // local-store subscription will notify us; also patch synchronously for
      // consumers that read right after `add` without waiting for a re-render.
      const favs = localGet(kind);
      set((state) =>
        patchKind(state, kind, {
          favorites: favs,
          slugs: new Set(favs.map((f) => f.slug)),
        }),
      );
      trackEvent("favorites:added", { kind });
      return true;
    }

    // Auth — optimistic, roll back on failure.
    if (k.slugs.has(slug)) return true;
    if (k.favorites.length >= MAX_PER_KIND) {
      set((state) => patchKind(state, kind, { limitReached: true }));
      trackEvent("favorites:limit_reached", { kind });
      return false;
    }

    const optimistic: Favorite = { kind, slug, favorited_at: Date.now() };
    const optimisticSlugs = new Set(k.slugs);
    optimisticSlugs.add(slug);
    set((state) =>
      patchKind(state, kind, {
        favorites: [optimistic, ...state.byKind[kind].favorites],
        slugs: optimisticSlugs,
      }),
    );

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, slug }),
      });

      if (res.status === 409) {
        // already_favorite vs limit_reached
        try {
          const body = await res.json();
          if (body?.error === "already_favorite") {
            trackEvent("favorites:added", { kind });
            await get().reload(kind);
            return true;
          }
        } catch {
          /* malformed body — fall through to limit_reached */
        }
        // Rollback optimistic and mark limit.
        set((state) => {
          const curr = state.byKind[kind];
          const nextSlugs = new Set(curr.slugs);
          nextSlugs.delete(slug);
          return patchKind(state, kind, {
            favorites: curr.favorites.filter((f) => f.slug !== slug),
            slugs: nextSlugs,
            limitReached: true,
          });
        });
        trackEvent("favorites:limit_reached", { kind });
        await get().reload(kind);
        return false;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Replace optimistic with the server row so favorited_at is canonical.
      try {
        const body = await res.json();
        const serverRow = body?.favorite ?? null;
        if (serverRow && typeof serverRow === "object") {
          const parsed: Favorite = {
            kind,
            slug,
            favorited_at:
              typeof serverRow.favorited_at === "string"
                ? Date.parse(serverRow.favorited_at)
                : Date.now(),
          };
          set((state) => {
            const curr = state.byKind[kind];
            return patchKind(state, kind, {
              favorites: [parsed, ...curr.favorites.filter((f) => f.slug !== slug)],
            });
          });
        }
      } catch {
        /* optimistic stays — next reload() corrects */
      }
      trackEvent("favorites:added", { kind });
      return true;
    } catch {
      // Rollback optimistic.
      set((state) => {
        const curr = state.byKind[kind];
        const nextSlugs = new Set(curr.slugs);
        nextSlugs.delete(slug);
        return patchKind(state, kind, {
          favorites: curr.favorites.filter((f) => f.slug !== slug),
          slugs: nextSlugs,
        });
      });
      return false;
    }
  },

  remove: async (kind: FavoriteKind, slug: string): Promise<void> => {
    const { auth, byKind } = get();

    if (!auth.isAuth) {
      localRemove(kind, slug);
      const favs = localGet(kind);
      set((state) =>
        patchKind(state, kind, {
          favorites: favs,
          slugs: new Set(favs.map((f) => f.slug)),
        }),
      );
      trackEvent("favorites:removed", { kind });
      return;
    }

    const prev = byKind[kind].favorites;
    const prevSlugs = byKind[kind].slugs;
    // Optimistic remove.
    set((state) => {
      const curr = state.byKind[kind];
      const nextSlugs = new Set(curr.slugs);
      nextSlugs.delete(slug);
      return patchKind(state, kind, {
        favorites: curr.favorites.filter((f) => f.slug !== slug),
        slugs: nextSlugs,
      });
    });

    try {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, slug }),
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      trackEvent("favorites:removed", { kind });
    } catch {
      // Rollback.
      set((state) =>
        patchKind(state, kind, {
          favorites: prev,
          slugs: prevSlugs,
        }),
      );
    }
  },

  isFavorite: (kind: FavoriteKind, slug: string): boolean => {
    const { auth, byKind } = get();
    if (!auth.isAuth) return localIs(kind, slug);
    return byKind[kind].slugs.has(slug);
  },

  clearLimitReached: (kind: FavoriteKind) => {
    set((state) => patchKind(state, kind, { limitReached: false }));
  },

  __resetForTests: () => {
    _authPromise = null;
    for (const k of KINDS) {
      delete _fetchInFlight[k];
    }
    if (_unsubGlobalFocus) {
      try {
        _unsubGlobalFocus();
      } catch {
        /* ignore */
      }
    }
    _unsubGlobalFocus = null;
    _globalListenerRegistered = false;
    if (_unsubLocalStore) {
      try {
        _unsubLocalStore();
      } catch {
        /* ignore */
      }
    }
    _unsubLocalStore = null;
    _localStoreSubscribed = false;
    set({
      auth: { resolved: false, isAuth: false },
      byKind: initialByKind(),
    });
  },
}));
