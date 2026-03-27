import { createClient } from "@/lib/supabase/server";
import type { FeatureFlagKey, Plan } from "@/lib/types/subscription";
import { planMeetsRequirement } from "@/lib/types/subscription";

/**
 * Server-side feature flag check. Direct DB query, no cache.
 * For use in API routes and server components.
 * Resolves ≤500ms (NFR29).
 *
 * @returns true if user can access the feature
 */
export async function checkFeatureFlag(
  flagKey: FeatureFlagKey,
  userPlan: Plan
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled, plan_required")
    .eq("key", flagKey)
    .single();

  if (error || !data) return false;
  if (!data.enabled) return false;
  if (data.plan_required === "free") return true;

  return planMeetsRequirement(userPlan, data.plan_required as Plan);
}

/**
 * Get user's current plan from subscriptions table.
 * Server-side only.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, trial_ends_at")
    .eq("user_id", userId)
    .single();

  if (!data) return "free";

  // Active or trialing (within trial period) → return plan
  if (data.status === "active") return data.plan as Plan;
  if (data.status === "trialing") {
    const trialEnd = new Date(data.trial_ends_at!);
    if (trialEnd > new Date()) return data.plan as Plan;
    return "free"; // Trial expired
  }

  return "free";
}
