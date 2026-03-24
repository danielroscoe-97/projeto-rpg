export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CampaignManager } from "@/components/dashboard/CampaignManager";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Onboarding redirect — new DMs with no campaigns go through the wizard
  const { count } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (count === 0) redirect("/app/onboarding");

  // Fetch campaigns with player character count
  const { data: rawCampaigns } = await supabase
    .from("campaigns")
    .select("id, name, created_at, player_characters(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const campaigns = (rawCampaigns ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    created_at: c.created_at as string,
    player_count:
      (c.player_characters as { count: number }[])[0]?.count ?? 0,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-white/50 mt-1 text-sm">
          Manage your campaigns and player groups.
        </p>
      </div>
      <CampaignManager initialCampaigns={campaigns} userId={user.id} />
    </div>
  );
}
