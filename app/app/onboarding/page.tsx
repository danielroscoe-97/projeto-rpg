import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Safety: if user already has campaigns, skip onboarding
  const { count, error: countErr } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (!countErr && count !== null && count > 0) {
    redirect("/app/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <OnboardingWizard userId={user.id} />
    </div>
  );
}
