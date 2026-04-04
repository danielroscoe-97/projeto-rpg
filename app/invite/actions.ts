"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

interface AcceptInviteData {
  inviteId: string;
  campaignId: string;
  token: string;
  // New character path
  name?: string;
  maxHp?: number;
  currentHp?: number;
  ac?: number;
  spellSaveDc?: number | null;
  // Existing standalone character path
  existingCharacterId?: string;
  // Claim DM-created campaign character path
  claimCharacterId?: string;
}

/**
 * Server action: validates invite + creates OR links player_character using service role.
 * Two paths:
 *   - existingCharacterId provided → link the existing standalone character to this campaign
 *   - otherwise → create a new character for this campaign
 */
export async function acceptInviteAction(data: AcceptInviteData) {
  const supabase = await createClient();

  // Require authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify invite is still valid for this token
  const { data: invite } = await supabase
    .from("campaign_invites")
    .select("id, campaign_id, status, expires_at, invited_by")
    .eq("id", data.inviteId)
    .eq("token", data.token)
    .single();

  if (!invite) throw new Error("Invite not found");
  if (invite.status !== "pending") throw new Error("Invite already used");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

  // Service client bypasses RLS — safe here because we've validated the invite above
  const service = createServiceClient();

  // Add to campaign_members (idempotent)
  const { error: memberError } = await service
    .from("campaign_members")
    .insert({ campaign_id: invite.campaign_id, user_id: user.id, role: "player", invited_by: invite.invited_by })
    .select()
    .maybeSingle();

  if (memberError && memberError.code !== "23505") throw new Error("Erro ao ingressar na campanha");

  if (data.claimCharacterId) {
    // Claim a DM-created campaign character (set user_id atomically, only if still unclaimed)
    const { data: claimed, error } = await service
      .from("player_characters")
      .update({ user_id: user.id })
      .eq("id", data.claimCharacterId)
      .eq("campaign_id", invite.campaign_id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (error) throw new Error("Erro ao clamar personagem");
    if (!claimed) throw new Error("Personagem já foi escolhido por outro jogador");
  } else if (data.existingCharacterId) {
    // Link existing standalone character to this campaign
    const { error } = await service
      .from("player_characters")
      .update({ campaign_id: invite.campaign_id })
      .eq("id", data.existingCharacterId)
      .eq("user_id", user.id)
      .is("campaign_id", null);

    if (error) throw new Error("Erro ao vincular personagem");
  } else {
    // Create new character for this campaign
    const { error: charError } = await service
      .from("player_characters")
      .insert({
        campaign_id: invite.campaign_id,
        name: data.name!.trim(),
        max_hp: data.maxHp ?? 10,
        current_hp: data.currentHp ?? 10,
        ac: data.ac ?? 10,
        spell_save_dc: data.spellSaveDc ?? null,
        user_id: user.id,
      });

    if (charError) throw charError;
  }

  const { error: inviteError } = await service
    .from("campaign_invites")
    .update({ status: "accepted" })
    .eq("id", data.inviteId);

  if (inviteError) throw inviteError;
}
