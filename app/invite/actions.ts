"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

interface AcceptInviteData {
  inviteId: string;
  campaignId: string;
  token: string;
  name: string;
  maxHp: number;
  currentHp: number;
  ac: number;
  spellSaveDc: number | null;
}

/**
 * Server action: validates invite + creates player_character using service role
 * (bypasses RLS because player_characters insert is restricted to campaign owner).
 */
export async function acceptInviteAction(data: AcceptInviteData) {
  const supabase = await createClient();

  // Require authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify invite is still valid for this token
  const { data: invite } = await supabase
    .from("campaign_invites")
    .select("id, campaign_id, status, expires_at")
    .eq("id", data.inviteId)
    .eq("token", data.token)
    .single();

  if (!invite) throw new Error("Invite not found");
  if (invite.status !== "pending") throw new Error("Invite already used");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

  // Service client bypasses RLS — safe here because we've validated the invite above
  const service = createServiceClient();

  const { error: charError } = await service
    .from("player_characters")
    .insert({
      campaign_id: data.campaignId,
      name: data.name,
      max_hp: data.maxHp,
      current_hp: data.currentHp,
      ac: data.ac,
      spell_save_dc: data.spellSaveDc,
    });

  if (charError) throw charError;

  const { error: inviteError } = await service
    .from("campaign_invites")
    .update({ status: "accepted" })
    .eq("id", data.inviteId);

  if (inviteError) throw inviteError;
}
