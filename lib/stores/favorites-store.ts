"use client";

import { create } from "zustand";

const LS_KEY = "audio_favorites";
const MAX_GUEST_FAVORITES = 6;
const MAX_AUTH_FAVORITES = 12;

export interface FavoriteEntry {
  preset_id: string;
  source: "preset" | "custom";
}

interface FavoritesState {
  /** Ordered list of favorite preset ids */
  favorites: FavoriteEntry[];
  /** Whether the store has been hydrated (from localStorage or API) */
  hydrated: boolean;
  /** Whether user is authenticated (determines storage backend) */
  isAuth: boolean;

  hydrate: (isAuth: boolean) => Promise<void>;
  addFavorite: (preset_id: string, source?: "preset" | "custom") => Promise<boolean>;
  removeFavorite: (preset_id: string) => Promise<void>;
  isFavorite: (preset_id: string) => boolean;
  getMaxSlots: () => number;
}

function loadFromLocalStorage(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: unknown): e is FavoriteEntry =>
        typeof e === "object" && e !== null &&
        "preset_id" in e && typeof (e as FavoriteEntry).preset_id === "string"
    );
  } catch {
    return [];
  }
}

function saveToLocalStorage(favorites: FavoriteEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(favorites));
  } catch { /* quota exceeded — silent */ }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  hydrated: false,
  isAuth: false,

  hydrate: async (isAuth) => {
    if (get().hydrated) return;

    if (!isAuth) {
      // Guest / anon — localStorage only
      const local = loadFromLocalStorage();
      set({ favorites: local, hydrated: true, isAuth: false });
      return;
    }

    // Authenticated — fetch from API, fall back to localStorage
    try {
      const res = await fetch("/api/audio-favorites");
      if (res.ok) {
        const { data } = await res.json() as {
          data: Array<{ preset_id: string; source: "preset" | "custom" }>;
        };
        const entries: FavoriteEntry[] = data.map((d) => ({
          preset_id: d.preset_id,
          source: d.source,
        }));
        set({ favorites: entries, hydrated: true, isAuth: true });
        // Also persist locally as cache
        saveToLocalStorage(entries);
        return;
      }
    } catch { /* network error — fall back */ }

    // Fallback to localStorage
    const local = loadFromLocalStorage();
    set({ favorites: local, hydrated: true, isAuth: true });
  },

  addFavorite: async (preset_id, source = "preset") => {
    const { favorites, isAuth } = get();
    const max = isAuth ? MAX_AUTH_FAVORITES : MAX_GUEST_FAVORITES;

    if (favorites.length >= max) return false;
    if (favorites.some((f) => f.preset_id === preset_id)) return false;

    const entry: FavoriteEntry = { preset_id, source };
    const updated = [...favorites, entry];

    set({ favorites: updated });
    saveToLocalStorage(updated);

    if (isAuth) {
      fetch("/api/audio-favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id, source }),
      }).catch(() => { /* best-effort sync */ });
    }

    return true;
  },

  removeFavorite: async (preset_id) => {
    const { favorites, isAuth } = get();
    const entry = favorites.find((f) => f.preset_id === preset_id);
    const updated = favorites.filter((f) => f.preset_id !== preset_id);

    set({ favorites: updated });
    saveToLocalStorage(updated);

    if (isAuth && entry) {
      fetch(`/api/audio-favorites?preset_id=${encodeURIComponent(preset_id)}&source=${entry.source}`, {
        method: "DELETE",
      }).catch(() => { /* best-effort sync */ });
    }
  },

  isFavorite: (preset_id) => {
    return get().favorites.some((f) => f.preset_id === preset_id);
  },

  getMaxSlots: () => {
    return get().isAuth ? MAX_AUTH_FAVORITES : MAX_GUEST_FAVORITES;
  },
}));
