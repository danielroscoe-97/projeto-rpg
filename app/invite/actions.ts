"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendInviteAcceptedEmail } from "@/lib/notifications/invite-accepted-email";
import { trackServerEvent } from "@/lib/analytics/track-server";

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
    .select("id, campaign_id, status, expires_at, invited_by, email")
    .eq("id", data.inviteId)
    .eq("token", data.token)
    .single();

  if (!invite) throw new Error("Invite not found");
  if (invite.status !== "pending") throw new Error("Invite already used");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

  // B1: Verify the authenticated user's email matches the invite (if invite has email)
  if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite was sent to a different email address");
  }

  // Service client bypasses RLS — safe here because we've validated the invite above
  const service = createServiceClient();

  // B2: Check max_players before adding member
  const { data: campaign } = await service
    .from("campaigns")
    .select("max_players")
    .eq("id", invite.campaign_id)
    .single();

  if (campaign?.max_players) {
    const { count } = await service
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", invite.campaign_id)
      .eq("status", "active");

    if (count != null && count >= campaign.max_players) {
      throw new Error("Campaign has reached maximum number of players");
    }
  }

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

    trackServerEvent("character:created", {
      userId: user.id,
      properties: {
        mode: "auth",
        source: "/invite",
        campaign_id: invite.campaign_id,
      },
    });
  }

  const { error: inviteError } = await service
    .from("campaign_invites")
    .update({ status: "accepted" })
    .eq("id", data.inviteId);

  if (inviteError) throw inviteError;

  // Notify DM via email (fail-open)
  try {
    const { data: campaign } = await service
      .from("campaigns")
      .select("name, owner_id")
      .eq("id", invite.campaign_id)
      .single();

    const { data: dmUser } = await service
      .from("users")
      .select("display_name, email")
      .eq("id", campaign?.owner_id ?? invite.invited_by)
      .single();

    const { data: playerUser } = await service
      .from("users")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    const playerDisplayName = data.existingCharacterId
      ? (playerUser?.display_name ?? playerUser?.email ?? "Jogador")
      : (data.name ?? playerUser?.display_name ?? "Jogador");

    const { count: memberCount } = await service
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", invite.campaign_id)
      .eq("status", "active");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pocketdm.com.br";

    if (dmUser) {
      const sent = await sendInviteAcceptedEmail({
        dmEmail: dmUser.email,
        dmName: dmUser.display_name ?? dmUser.email,
        playerDisplayName,
        campaignName: campaign?.name ?? "Campanha",
        campaignUrl: `${siteUrl}/app/campaigns/${invite.campaign_id}`,
        memberCount: memberCount ?? 1,
      });

      if (sent) {
        trackServerEvent("email:invite_accepted_sent", {
          userId: campaign?.owner_id ?? invite.invited_by,
          properties: { campaign_id: invite.campaign_id },
        });
      }
    }
  } catch {
    // Notification failure must not block invite acceptance
  }
}
