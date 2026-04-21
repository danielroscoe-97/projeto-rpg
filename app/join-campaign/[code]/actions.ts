"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendInviteAcceptedEmail } from "@/lib/notifications/invite-accepted-email";
import { trackServerEvent } from "@/lib/analytics/track-server";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pocketdm.com.br";

interface JoinCampaignData {
  code: string;
  // New character path
  name?: string;
  maxHp?: number | null;
  currentHp?: number | null;
  ac?: number | null;
  spellSaveDc?: number | null;
  // Existing character path
  existingCharacterId?: string;
}

const JOIN_CODE_RE = /^[A-Z2-9]{8}$/;

export async function acceptJoinCodeAction(data: JoinCampaignData): Promise<void> {
  // P11: validate join_code format before any DB call
  if (!JOIN_CODE_RE.test(data.code)) throw new Error("Código inválido");

  const supabase = await createClient();

  // Require authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Use service client to bypass RLS for join_code lookup
  const service = createServiceClient();

  // Validate join code
  const { data: campaign } = await service
    .from("campaigns")
    .select("id, name, owner_id, join_code_active, max_players")
    .eq("join_code", data.code)
    .eq("join_code_active", true)
    .eq("is_archived", false)
    .maybeSingle();

  if (!campaign) throw new Error("Código inválido ou link desativado");

  // Check max_players limit (null = unlimited)
  if (campaign.max_players !== null) {
    const { count } = await service
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "active");

    if ((count ?? 0) >= campaign.max_players) {
      throw new Error("Campanha cheia");
    }
  }

  // Add to campaign_members (idempotent)
  const { error: memberError } = await service
    .from("campaign_members")
    .insert({ campaign_id: campaign.id, user_id: user.id, role: "player" })
    .select()
    .maybeSingle();

  // P4: already a member → skip char link/create and go straight to dashboard
  // (idempotent path — prevents duplicate character creation on retry)
  if (memberError?.code === "23505") {
    redirect("/app/dashboard");
  }
  if (memberError) throw new Error("Erro ao ingressar na campanha");

  if (data.existingCharacterId) {
    // Link existing standalone character to this campaign
    const { error } = await service
      .from("player_characters")
      .update({ campaign_id: campaign.id })
      .eq("id", data.existingCharacterId)
      .eq("user_id", user.id)
      .is("campaign_id", null);

    if (error) throw new Error("Erro ao vincular personagem");
  } else {
    // Create new character for this campaign
    const { error: charError } = await service
      .from("player_characters")
      .insert({
        campaign_id: campaign.id,
        user_id: user.id,
        name: data.name!.trim(),
        max_hp: data.maxHp ?? 10,
        current_hp: data.currentHp ?? 10,
        ac: data.ac ?? 10,
        spell_save_dc: data.spellSaveDc,
      });

    // P8: sanitize Supabase error before surfacing to client
    if (charError) throw new Error("Erro ao criar personagem");
  }

  // Notify DM via email (fail-open)
  try {
    const { data: dmUser } = await service
      .from("users")
      .select("display_name, email")
      .eq("id", campaign.owner_id)
      .single();

    const { data: playerUser } = await service
      .from("users")
      .select("display_name, email")
      .eq("id", user.id)
      .single();

    const playerDisplayName = data.existingCharacterId
      ? (playerUser?.display_name ?? playerUser?.email ?? "Jogador")
      : data.name!;

    const { count: memberCount } = await service
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "active");

    if (dmUser) {
      const sent = await sendInviteAcceptedEmail({
        dmEmail: dmUser.email,
        dmName: dmUser.display_name ?? dmUser.email,
        playerDisplayName,
        campaignName: campaign.name,
        campaignUrl: `${APP_URL}/app/campaigns/${campaign.id}`,
        memberCount: memberCount ?? 1,
      });

      if (sent) {
        trackServerEvent("email:invite_accepted_sent", {
          userId: campaign.owner_id,
          properties: { campaign_id: campaign.id },
        });
      }
    }
  } catch {
    // Notification failure must not block the join
  }

  // Server-side redirect AFTER all DB writes + notifications complete.
  //
  // Prior to 2026-04-21 this action returned void and both (a) the page.tsx
  // RSC post-action re-render and (b) the client-side router.push("/app/dashboard")
  // raced to navigate. The page.tsx re-render path hits `if (existing) redirect(...)`
  // which would throw NEXT_REDIRECT during a React 19.3 canary / Next.js 15 RSC
  // re-render cycle that the framework failed to convert cleanly — producing a
  // 500 response ("An error occurred in the Server Components render") even
  // though the DB writes had already succeeded. The user ended up as a member
  // but without a linked character, and the UI showed an invite-failed toast.
  //
  // Redirecting from inside the action sidesteps the re-render: the action
  // response is a redirect directive, so Next.js never re-evaluates page.tsx.
  // Client-side router.push becomes unnecessary and was removed.
  redirect("/app/dashboard");
}
