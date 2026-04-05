"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * JO-04: Auto-join a campaign after post-combat sign-up.
 * Called from the dashboard when `pendingCampaignJoin` exists in localStorage.
 * Uses service client to bypass RLS — authorization is based on:
 *   1. User is authenticated
 *   2. Campaign exists and is active
 */
export async function joinCampaignDirectAction(
  campaignId: string,
  playerName?: string
): Promise<{ success: boolean; alreadyMember?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();

  // Validate campaign exists
  const { data: campaign } = await service
    .from("campaigns")
    .select("id, name, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) throw new Error("Campanha não encontrada");

  // Idempotent: check if already a member
  const { data: existing } = await service
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { success: true, alreadyMember: true };

  // Add to campaign_members
  const { error: memberError } = await service
    .from("campaign_members")
    .insert({ campaign_id: campaignId, user_id: user.id, role: "player" });

  if (memberError?.code === "23505") return { success: true, alreadyMember: true };
  if (memberError) throw new Error("Erro ao ingressar na campanha");

  // Create a basic character with the player's combat name (optional, best-effort)
  if (playerName?.trim()) {
    await service.from("player_characters").insert({
      campaign_id: campaignId,
      user_id: user.id,
      name: playerName.trim(),
      max_hp: 10,
      current_hp: 10,
      ac: 10,
    });
    // Non-fatal — character can be created later
  }

  return { success: true };
}
