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

  // Fetch onboarding source + user role (needed to enforce role step for legacy users)
  const [{ data: onboardingData }, { data: userData }] = await Promise.all([
    supabase
      .from("user_onboarding")
      .select("source, wizard_step")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  // Safety: ensure users row exists for legacy accounts created before the trigger
  if (!userData) {
    await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "User",
        is_admin: false,
      },
      { onConflict: "id" }
    );
  }

  const source: OnboardingSource = (onboardingData?.source as OnboardingSource) ?? "fresh";
  const savedStep = onboardingData?.wizard_step ?? null;
  const userRole = (userData?.role as string | null) ?? null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <OnboardingWizard userId={user.id} source={source} savedStep={savedStep} userRole={userRole} />
    </div>
  );
}
