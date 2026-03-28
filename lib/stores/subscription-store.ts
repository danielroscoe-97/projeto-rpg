"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { Plan, Subscription, SubscriptionStatus } from "@/lib/types/subscription";

interface SubscriptionState {
  plan: Plan;
  status: SubscriptionStatus | null;
  subscription: Subscription | null;
  loading: boolean;
  initialized: boolean;

  /** Session DM plan (Mesa model) — set when player is in a Pro DM's session */
  sessionDmPlan: Plan | null;

  /** Effective plan: max of individual plan and session DM plan */
  effectivePlan: () => Plan;

  /** Load subscription from Supabase for current user */
  loadSubscription: () => Promise<void>;

  /** Set session DM plan for Mesa model */
  setSessionDmPlan: (plan: Plan | null) => void;

  /** Reset store (on logout) */
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: "free",
  status: null,
  subscription: null,
  loading: false,
  initialized: false,
  sessionDmPlan: null,

  effectivePlan: () => {
    const { plan, sessionDmPlan } = get();
    // Mesa model: if session DM is pro/mesa, player inherits pro
    if (sessionDmPlan === "pro" || sessionDmPlan === "mesa") return "pro";
    return plan;
  },

  loadSubscription: async () => {
    const { initialized, loading } = get();
    if (initialized || loading) return;

    set({ loading: true });

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ plan: "free", status: null, subscription: null, loading: false, initialized: true });
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        set({ plan: "free", status: null, subscription: null, loading: false, initialized: true });
        return;
      }

      const sub = data as Subscription;
      let effectivePlan: Plan = "free";

      if (sub.status === "active") {
        effectivePlan = sub.plan;
      } else if (sub.status === "trialing" && sub.trial_ends_at) {
        const trialEnd = new Date(sub.trial_ends_at);
        effectivePlan = trialEnd > new Date() ? sub.plan : "free";
      }

      set({
        plan: effectivePlan,
        status: sub.status,
        subscription: sub,
        loading: false,
        initialized: true,
      });
    } catch {
      set({ plan: "free", loading: false, initialized: true });
    }
  },

  setSessionDmPlan: (plan) => set({ sessionDmPlan: plan }),

  reset: () =>
    set({
      plan: "free",
      status: null,
      subscription: null,
      loading: false,
      initialized: false,
      sessionDmPlan: null,
    }),
}));
