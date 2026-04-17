"use client";

/**
 * S5.2 — Unified favorites hook.
 *
 * Routes to the correct backing store based on auth mode:
 *   - Auth (not-anon) user → Supabase via /api/favorites
 *   - Guest / anon         → localStorage (lib/favorites/local-store.ts)
 *
 * The API surface is identical across modes so the UI never branches.
 *
 * Parity matrix (CLAUDE.md — Combat Parity Rule):
 *   Guest           ✅  localStorage
 *   Anon (/join)    ✅  localStorage
 *   Auth (/invite)  ✅  Supabase API (with localStorage fallback if offline)
 */

import { useCallback, useEffect, useRef, useState } from "react";
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

type AuthState = {
  /** true once the auth probe has resolved at least once */
  resolved: boolean;
  /** true when signed in and NOT anonymous */
  isAuth: boolean;
};

type ApiFavorite = { slug: string; kind: FavoriteKind; favorited_at: string };

function toLocalShape(row: ApiFavorite): Favorite {
  return {
    kind: row.kind,
    slug: row.slug,
    favorited_at: new Date(row.favorited_at).getTime(),
  };
}

/**
 * Main hook. Call it scoped to a single kind:
 *
 * ```tsx
 * const { favorites, add, remove, isFavorite, loading, limitReached } =
 *   useFavorites("monster");
 * ```
 */
export function useFavorites(kind: FavoriteKind) {
  const [auth, setAuth] = useState<AuthState>({ resolved: false, isAuth: false });
  const [favorites, setFavorites] = useState<Favorite[]>(() => localGet(kind));
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Resolve auth mode once on mount ------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        const u = data.user;
        const isAuth = !!u && !u.is_anonymous;
        setAuth({ resolved: true, isAuth });
      } catch {
        if (!cancelled) setAuth({ resolved: true, isAuth: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load favorites (mode-dependent) ------------------------------
  const reload = useCallback(async () => {
    if (!auth.resolved) return;
    if (!auth.isAuth) {
      setFavorites(localGet(kind));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/favorites?kind=${encodeURIComponent(kind)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { favorites: ApiFavorite[] };
      if (mountedRef.current) {
        setFavorites(json.favorites.map(toLocalShape));
      }
    } catch {
      // fallback: show local-store favorites so UI stays usable offline
      if (mountedRef.current) setFavorites(localGet(kind));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [auth.isAuth, auth.resolved, kind]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ---- Subscribe to local-store changes (guest/anon) ---------------
  useEffect(() => {
    if (auth.isAuth) return;
    const unsub = localSubscribe(() => {
      setFavorites(localGet(kind));
    });
    return unsub;
  }, [auth.isAuth, kind]);

  // ---- Mutations ---------------------------------------------------
  const add = useCallback(
    async (slug: string): Promise<boolean> => {
      // Local-first path
      if (!auth.isAuth) {
        const ok = localAdd(kind, slug);
        if (!ok) {
          setLimitReached(true);
          trackEvent("favorites:limit_reached", { kind });
          return false;
        }
        setFavorites(localGet(kind));
        trackEvent("favorites:added", { kind });
        return true;
      }

      // Auth path — optimistic, roll back on failure
      if (favorites.some((f) => f.slug === slug)) return true;
      if (favorites.length >= MAX_PER_KIND) {
        setLimitReached(true);
        trackEvent("favorites:limit_reached", { kind });
        return false;
      }
      const optimistic: Favorite = { kind, slug, favorited_at: Date.now() };
      setFavorites((prev) => [optimistic, ...prev]);
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, slug }),
        });
        if (res.status === 409) {
          setLimitReached(true);
          trackEvent("favorites:limit_reached", { kind });
          await reload();
          return false;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        trackEvent("favorites:added", { kind });
        return true;
      } catch {
        // rollback optimistic update
        setFavorites((prev) => prev.filter((f) => f.slug !== slug));
        return false;
      }
    },
    [auth.isAuth, favorites, kind, reload],
  );

  const remove = useCallback(
    async (slug: string): Promise<void> => {
      if (!auth.isAuth) {
        localRemove(kind, slug);
        setFavorites(localGet(kind));
        trackEvent("favorites:removed", { kind });
        return;
      }
      // Auth path — optimistic
      const prev = favorites;
      setFavorites((curr) => curr.filter((f) => f.slug !== slug));
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
        setFavorites(prev);
      }
    },
    [auth.isAuth, favorites, kind],
  );

  const isFavorite = useCallback(
    (slug: string): boolean => {
      if (!auth.isAuth) return localIs(kind, slug);
      return favorites.some((f) => f.slug === slug);
    },
    [auth.isAuth, favorites, kind],
  );

  const clearLimitReached = useCallback(() => setLimitReached(false), []);

  return {
    favorites,
    add,
    remove,
    isFavorite,
    loading,
    limitReached,
    clearLimitReached,
    max: MAX_PER_KIND,
  };
}
