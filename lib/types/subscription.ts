// Subscription & feature flag types (Epic 5)

export type Plan = "free" | "pro" | "mesa";
export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due";

export interface Subscription {
  id: string;
  user_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  plan_required: Plan;
  description: string | null;
  updated_at: string;
}

export type FeatureFlagKey =
  | "persistent_campaigns"
  | "saved_presets"
  | "export_data"
  | "homebrew"
  | "session_analytics"
  | "cr_calculator"
  | "file_sharing"
  | "email_invites"
  | "show_non_srd_content"
  | "extended_compendium";

/** Whether a plan meets the required plan level */
export function planMeetsRequirement(userPlan: Plan, required: Plan): boolean {
  if (required === "free") return true;
  if (required === "pro") return userPlan === "pro" || userPlan === "mesa";
  if (required === "mesa") return userPlan === "mesa";
  return false;
}
