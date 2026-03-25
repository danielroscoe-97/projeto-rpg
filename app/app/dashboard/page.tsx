export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { SavedEncounters } from "@/components/dashboard/SavedEncounters";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Onboarding redirect — new DMs with no campaigns go through the wizard
  const { count, error: countErr } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (!countErr && count === 0) redirect("/app/onboarding");

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

  // Fetch active/saved encounters for resume (Story 3-10)
  const { data: rawEncounters } = await supabase
    .from("encounters")
    .select("id, name, round_number, is_active, updated_at, session_id, sessions!inner(id, name, owner_id)")
    .eq("sessions.owner_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(10);

  const savedEncounters: SavedEncounterRow[] = (rawEncounters ?? []).map((e) => ({
    session_id: e.session_id as string,
    encounter_name: (e.name ?? "Encounter") as string,
    session_name: ((e.sessions as unknown as Record<string, unknown>)?.name ?? "Session") as string,
    round_number: (e.round_number ?? 1) as number,
    is_active: (e.is_active ?? false) as boolean,
    updated_at: (e.updated_at ?? "") as string,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your campaigns and player groups.
        </p>
      </div>
      <SavedEncounters encounters={savedEncounters} />
      <CampaignManager initialCampaigns={campaigns} userId={user.id} />
    </div>
  );
}
