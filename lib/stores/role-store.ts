"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "player" | "dm" | "both";

/** Which view is currently active — for users with role "both" */
export type ActiveView = "dm" | "player";

interface RoleState {
  /** Persisted role from DB (player | dm | both) */
  role: UserRole;
  /** Currently active view — only meaningful when role is "both" */
  activeView: ActiveView;
  loading: boolean;
  initialized: boolean;

  /** Load role from Supabase users table */
  loadRole: () => Promise<void>;

  /** Toggle between dm/player view (only for "both" users) */
  toggleView: () => void;

  /** Set active view explicitly */
  setActiveView: (view: ActiveView) => void;

  /** Update role in DB and local state */
  updateRole: (role: UserRole) => Promise<void>;

  /** Reset store (on logout) */
  reset: () => void;
}

function deriveActiveView(role: UserRole): ActiveView {
  if (role === "player") return "player";
  // dm and both default to dm view
  return "dm";
}

export const useRoleStore = create<RoleState>((set, get) => ({
  role: "both",
  activeView: "dm",
  loading: false,
  initialized: false,

  loadRole: async () => {
    const { initialized, loading } = get();
    if (initialized || loading) return;

    set({ loading: true });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ role: "both", activeView: "dm", loading: false, initialized: true });
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (data?.role as UserRole) ?? "both";

      // Restore saved view preference from localStorage if available
      let activeView = deriveActiveView(role);
      if (role === "both" && typeof window !== "undefined") {
        const saved = localStorage.getItem("pocketdm:activeView");
        if (saved === "dm" || saved === "player") {
          activeView = saved;
        }
      }

      set({ role, activeView, loading: false, initialized: true });
    } catch {
      set({ role: "both", activeView: "dm", loading: false, initialized: true });
    }
  },

  toggleView: () => {
    const { role, activeView } = get();
    if (role !== "both") return;
    const next: ActiveView = activeView === "dm" ? "player" : "dm";
    if (typeof window !== "undefined") {
      localStorage.setItem("pocketdm:activeView", next);
    }
    set({ activeView: next });
  },

  setActiveView: (view) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pocketdm:activeView", view);
    }
    set({ activeView: view });
  },

  updateRole: async (newRole) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", user.id);
      if (error) throw error;

      set({ role: newRole, activeView: deriveActiveView(newRole) });
    } catch {
      // Silently fail — caller can handle with toast
      throw new Error("Failed to update role");
    }
  },

  reset: () =>
    set({
      role: "both",
      activeView: "dm",
      loading: false,
      initialized: false,
    }),
}));
