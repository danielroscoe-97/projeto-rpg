import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";
import { SITE_URL } from "@/lib/seo/site-url";
import type { RealtimeCombatInvite } from "@/lib/types/realtime";

/**
 * Wave 5 (F19) — Auto-invite pro Combate.
 *
 * DM inicia combate (client) -> CombatSessionClient chama dispatchCombatInvite
 * -> POST aqui. Server valida posse, gera/reusa session_token, broadcast no canal
 * `campaign:{campaignId}:invites`, persiste notificações durables em
 * `player_notifications` (fallback offline).
 *
 * Combat Parity: Auth-only (guest/anon não disparam — sem access token aqui).
 *
 * POST /api/combat/invite/dispatch
 * Body: { sessionId: string, encounterId: string }
 */

interface DispatchBody {
  sessionId: string;
  encounterId: string;
}

/** Cryptographically random session token (mirror of client helper). */
function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<DispatchBody>;
    const sessionId = body.sessionId;
    const encounterId = body.encounterId;

    if (!sessionId || !encounterId) {
      return NextResponse.json(
        { error: "sessionId and encounterId are required" },
        { status: 400 },
      );
    }

    // 1. Auth — must be the DM (session owner)
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "X-Auth-Reason": "token_expired" } },
      );
    }

    // 2. Load session + verify ownership + pull campaign_id
    const { data: session, error: sessionError } = await supabaseAuth
      .from("sessions")
      .select("owner_id, campaign_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Not the session owner" },
        { status: 403 },
      );
    }

    // 3. Quick Combat short-circuit — no campaign => no invite.
    if (!session.campaign_id) {
      return new NextResponse(null, { status: 204 });
    }
    const campaignId = session.campaign_id as string;

    // 4. Rate-limit — spec §3.5e: 3 dispatches / 5 min per session_id
    const { limited } = await checkRateLimit(
      `combat-invite:${sessionId}`,
      3,
      "5 m",
    );
    if (limited) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    // 5. Get or create session token (server-side variant — no window.location).
    // Reuse existing active token to avoid unbounded accumulation.
    const { data: existingToken } = await supabaseAuth
      .from("session_tokens")
      .select("token")
      .eq("session_id", sessionId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    let joinToken: string;
    if (existingToken?.token) {
      joinToken = existingToken.token as string;
    } else {
      joinToken = generateToken();
      const { error: tokenInsertError } = await supabaseAuth
        .from("session_tokens")
        .insert({
          session_id: sessionId,
          token: joinToken,
          is_active: true,
        });
      if (tokenInsertError) {
        captureError(tokenInsertError, {
          component: "CombatInviteDispatch",
          action: "create_session_token",
          category: "network",
          sessionId,
        });
        return NextResponse.json(
          { error: "Failed to create session token" },
          { status: 500 },
        );
      }
    }

    const joinUrl = `${SITE_URL}/join/${joinToken}`;

    // 6. Resolve denormalized display names (one round-trip each, in parallel).
    const [campaignRes, dmRes, encounterRes, membersRes] = await Promise.all([
      supabaseAuth
        .from("campaigns")
        .select("name")
        .eq("id", campaignId)
        .maybeSingle(),
      supabaseAuth
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAuth
        .from("encounters")
        .select("name")
        .eq("id", encounterId)
        .maybeSingle(),
      // Active player members only (excl. DM later). See spec §3.4.
      supabaseAuth
        .from("campaign_members")
        .select("user_id, role, status")
        .eq("campaign_id", campaignId)
        .eq("status", "active"),
    ]);

    const campaignName = (campaignRes.data?.name as string | undefined) ?? "";
    const dmDisplayName =
      (dmRes.data?.display_name as string | null | undefined) ?? null;
    const encounterName =
      (encounterRes.data?.name as string | null | undefined) ?? null;

    type MemberRow = { user_id: string; role: string | null; status: string | null };
    const members = (membersRes.data ?? []) as MemberRow[];
    const playerUserIds = members
      .filter((m) => m.user_id !== user.id) // DM must not self-notify
      .map((m) => m.user_id);

    const startedAt = new Date().toISOString();

    // 7. Persist first (durable fallback §3.3). Broadcast after (best-effort).
    //    Service-role client bypasses RLS — dispatch is already auth-gated above.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (playerUserIds.length > 0) {
      const rows = playerUserIds.map((uid) => ({
        user_id: uid,
        campaign_id: campaignId,
        type: "combat_invite",
        title: "combat_invite",
        message: `${dmDisplayName ?? "DM"} - ${
          encounterName ?? campaignName
        }`,
        meta: {
          session_id: sessionId,
          encounter_id: encounterId,
          join_token: joinToken,
          join_url: joinUrl,
          campaign_id: campaignId,
          campaign_name: campaignName,
          dm_display_name: dmDisplayName,
          encounter_name: encounterName,
        },
      }));

      const { error: insertError } = await supabaseAdmin
        .from("player_notifications")
        .insert(rows);

      if (insertError) {
        captureError(insertError, {
          component: "CombatInviteDispatch",
          action: "insert_notifications",
          category: "network",
          sessionId,
        });
        // Non-fatal: broadcast still attempted below.
      }
    }

    // 8. Broadcast on the NEW `campaign:{id}:invites` channel (not session:).
    const payload: RealtimeCombatInvite = {
      type: "campaign:combat_invite",
      campaign_id: campaignId,
      campaign_name: campaignName,
      session_id: sessionId,
      encounter_id: encounterId,
      join_token: joinToken,
      join_url: joinUrl,
      dm_user_id: user.id,
      dm_display_name: dmDisplayName,
      encounter_name: encounterName,
      started_at: startedAt,
    };

    const channelName = `campaign:${campaignId}:invites`;
    const channel = supabaseAdmin.channel(channelName);

    try {
      await new Promise<void>((resolve, reject) => {
        // Hard 5s timeout — don't let channel subscribe hang the function.
        const timeout = setTimeout(() => {
          reject(new Error("Channel subscribe timeout (5s)"));
        }, 5000);

        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel
              .send({
                type: "broadcast",
                event: "campaign:combat_invite",
                payload,
              })
              .then(() => {
                clearTimeout(timeout);
                resolve();
              })
              .catch((err) => {
                clearTimeout(timeout);
                reject(err);
              });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timeout);
            reject(new Error(`Channel ${status}`));
          }
        });
      });
    } catch (err) {
      // Broadcast failure is non-fatal: player_notifications insert already
      // ran. Capture so we see the blast radius in logs.
      captureError(err, {
        component: "CombatInviteDispatch",
        action: "broadcast",
        category: "realtime",
        sessionId,
      });
    } finally {
      supabaseAdmin.removeChannel(channel);
    }

    return NextResponse.json({
      ok: true,
      notified: playerUserIds.length,
      join_token: joinToken,
    });
  } catch (err) {
    captureError(err, {
      component: "CombatInviteDispatch",
      action: "dispatch",
      category: "network",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
