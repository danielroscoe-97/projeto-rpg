"use server";

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

/**
 * Result contract intentionally returns a plain object instead of calling
 * `redirect()` from inside the action. A `redirect()` throw inside a server
 * action forces Next.js 15 / React 19.3-canary to re-render the CURRENT
 * path (`/join-campaign/[code]`) as part of the action response before the
 * redirect is committed. That re-render runs page.tsx again with the user
 * now being a member — hitting `if (existing) redirect('/app/dashboard')`
 * on line 78, which throws a second NEXT_REDIRECT inside the re-render
 * stream and the framework fails to convert it into a clean redirect
 * response (Sentry logs it as "An error occurred in the Server Components
 * render"). The action response degrades to a 500 even though every DB
 * write has already succeeded.
 *
 * Returning a plain object instead lets the client navigate via
 * `router.push("/app/dashboard")` after the action promise resolves, so
 * Next.js never re-renders the invite path at all. page.tsx's own
 * `if (existing) redirect(...)` guard is preserved for users who hit the
 * invite URL directly after becoming a member through some other path —
 * that flow is a fresh GET render and was never affected by this bug.
 */
export interface AcceptJoinCodeResult {
  redirectTo: string;
}

export async function acceptJoinCodeAction(data: JoinCampaignData): Promise<AcceptJoinCodeResult> {
  // Temporary trace logging — Bug #1 (2026-04-21) reproduces in prod with no
  // client-visible error detail. Remove these logs once the failing step is
  // identified and the underlying cause is actually fixed.
  const trace = (step: string, extra?: Record<string, unknown>) => {
    console.log(`[acceptJoinCodeAction] ${step}`, extra ?? "");
  };

  try {
    trace("enter", { code: data.code, hasExistingCharacterId: !!data.existingCharacterId });

    // P11: validate join_code format before any DB call
    if (!JOIN_CODE_RE.test(data.code)) {
      trace("reject: invalid code format");
      throw new Error("Código inválido");
    }

    const supabase = await createClient();
    trace("createClient: ok");

    // Require authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      trace("reject: no user");
      throw new Error("Unauthorized");
    }
    trace("getUser: ok", { userId: user.id });

    // Use service client to bypass RLS for join_code lookup
    const service = createServiceClient();
    trace("createServiceClient: ok");

    // Validate join code
    const { data: campaign, error: campaignErr } = await service
      .from("campaigns")
      .select("id, name, owner_id, join_code_active, max_players")
      .eq("join_code", data.code)
      .eq("join_code_active", true)
      .eq("is_archived", false)
      .maybeSingle();

    if (campaignErr) trace("campaignErr", { msg: campaignErr.message, code: campaignErr.code });
    if (!campaign) {
      trace("reject: no campaign");
      throw new Error("Código inválido ou link desativado");
    }
    trace("campaign: ok", { campaignId: campaign.id });

    // Check max_players limit (null = unlimited)
    if (campaign.max_players !== null) {
      const { count, error: countErr } = await service
        .from("campaign_members")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "active");

      if (countErr) trace("countErr", { msg: countErr.message, code: countErr.code });
      trace("max_players check", { count, max: campaign.max_players });

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

    if (memberError) trace("memberError", { msg: memberError.message, code: memberError.code, details: memberError.details, hint: memberError.hint });

    // P4: already a member → skip char link/create and go straight to dashboard
    // (idempotent path — prevents duplicate character creation on retry)
    if (memberError?.code === "23505") {
      trace("already a member, short-circuit");
      return { redirectTo: "/app/dashboard" };
    }
    if (memberError) throw new Error("Erro ao ingressar na campanha");
    trace("campaign_members insert: ok");

    if (data.existingCharacterId) {
      // Link existing standalone character to this campaign
      const { error } = await service
        .from("player_characters")
        .update({ campaign_id: campaign.id })
        .eq("id", data.existingCharacterId)
        .eq("user_id", user.id)
        .is("campaign_id", null);

      if (error) {
        trace("linkCharError", { msg: error.message, code: error.code });
        throw new Error("Erro ao vincular personagem");
      }
      trace("link existing character: ok");
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

      if (charError) {
        trace("createCharError", { msg: charError.message, code: charError.code });
        // P8: sanitize Supabase error before surfacing to client
        throw new Error("Erro ao criar personagem");
      }
      trace("create new character: ok");
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

    trace("complete: returning redirectTo");
    return { redirectTo: "/app/dashboard" };
  } catch (err) {
    console.error("[acceptJoinCodeAction] threw", {
      name: (err as Error)?.name,
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    throw err;
  }
}
