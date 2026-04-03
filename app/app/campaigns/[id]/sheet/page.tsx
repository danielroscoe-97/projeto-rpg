import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCampaignMembership } from "@/lib/supabase/campaign-membership";
import { PlayerHqShell } from "@/components/player-hq/PlayerHqShell";

export const metadata: Metadata = {
  title: "Player HQ | Pocket DM",
};

export default async function PlayerHqSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [membership, { data: campaign }] = await Promise.all([
    getCampaignMembership(id, user.id),
    supabase.from("campaigns").select("id, name").eq("id", id).single(),
  ]);

  if (!campaign) redirect("/app/dashboard");
  if (!membership || membership.role !== "player") redirect(`/app/campaigns/${id}`);

  // Get the player's character
  const { data: character } = await supabase
    .from("player_characters")
    .select("id")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!character) redirect(`/app/campaigns/${id}`);

  return (
    <PlayerHqShell
      characterId={character.id}
      campaignId={id}
      campaignName={campaign.name}
    />
  );
}
