"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendInviteAcceptedEmail } from "@/lib/notifications/invite-accepted-email";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { JOIN_CODE_RE } from "@/lib/validation/join-code";
import { withActionInstrumentation } from "@/lib/errors/with-action-instrumentation";

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

/**
 * Result contract intentionally returns a plain object instead of calling
 * `redirect()` from inside the action. A `redirect()` throw inside a server
 * action forces Next.js 15 / React 19.3-canary to re-render the CURRENT
 * path (`/join-campaign/[code]`) as part of the action response before the
 * redirect is committed. That re-render runs page.tsx again with the user
 * now being a member — hitting `if (existing) redirect('/app/dashboard')`
 * which throws a second NEXT_REDIRECT inside the re-render stream and the
 * framework fails to convert it into a clean redirect response. The action
 * response degrades to a 500 even though every DB write has already
 * succeeded. Returning a plain object here lets the client navigate via
 * `router.push(result.redirectTo)` after the action promise resolves.
 */
export interface AcceptJoinCodeResult {
  redirectTo: string;
}

export const acceptJoinCodeAction = withActionInstrumentation(
  "acceptJoinCodeAction",
  async (data: JoinCampaignData): Promise<AcceptJoinCodeResult> => {
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
    return { redirectTo: "/app/dashboard" };
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

  return { redirectTo: "/app/dashboard" };
  },
);
