import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import type { OnboardingSource } from "@/lib/types/database";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Safety: if user already has campaigns (as DM or player), skip onboarding
  const [{ count: dmCount, error: dmErr }, { count: playerCount, error: playerErr }] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("campaign_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
  ]);

  if ((!dmErr && dmCount !== null && dmCount > 0) || (!playerErr && playerCount !== null && playerCount > 0)) {
    redirect("/app/dashboard");
  }

  // Fetch onboarding source for contextual welcome
  const { data: onboardingData } = await supabase
    .from("user_onboarding")
    .select("source, wizard_step")
    .eq("user_id", user.id)
    .maybeSingle();

  const source: OnboardingSource = (onboardingData?.source as OnboardingSource) ?? "fresh";
  const savedStep = onboardingData?.wizard_step ?? null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <OnboardingWizard userId={user.id} source={source} savedStep={savedStep} />
    </div>
  );
}
