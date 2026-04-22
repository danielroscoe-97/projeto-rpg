import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";
import { SITE_URL } from "@/lib/seo/site-url";
import type {
  RealtimeCombatInvite,
  RealtimeUserInvite,
} from "@/lib/types/realtime";

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

    // Broadcast fan-out INCLUDES the DM's own user-invites channel so the DM's
    // own banner (e.g. in a secondary tab still on the campaign page) updates
    // in real time. Toast is filtered out client-side via `dm_user_id === userId`.
    // Note: this is decoupled from `playerUserIds` which gates player_notifications
    // inserts — the DM does not want a durable notification row for their own
    // action.
    const broadcastUserIds = members.map((m) => m.user_id);

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

    // 8. Broadcast — dual path during P2 grace period (docs/prompt-p2-channel-consolidation.md).
    //   PRIMARY (new):  user-invites:{playerUserId} — one broadcast per player.
    //                   Client subscribes to a single user-scoped channel instead
    //                   of N campaign-scoped channels, collapsing tenant channel
    //                   count (Free tier 200-channel cap root cause).
    //   LEGACY (grace): campaign:{campaignId}:invites — single broadcast, fan-out.
    //                   Kept alive for ~7 days so tabs still running pre-P2 code
    //                   keep receiving invites. Scheduled for removal post-rollout.
    const payload: RealtimeUserInvite = {
      type: "user:combat_invite",
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

    // 8a. PRIMARY — per-user fan-out via fire-and-forget send (no subscribe).
    //     Mirrors lib/supabase/player-identity.ts:broadcastIdentityUpgraded.
    //     channel.send() without subscribe falls back to POST /realtime/v1/api/broadcast
    //     internally (supabase-js), so no server-side channel subscription is held.
    //     Parallel Promise.allSettled — one player's network blip must not
    //     starve siblings.
    const userBroadcastResults = await Promise.allSettled(
      broadcastUserIds.map(async (uid) => {
        const ch = supabaseAdmin.channel(`user-invites:${uid}`);
        try {
          await ch.send({
            type: "broadcast",
            event: "user:combat_invite",
            payload,
          });
        } finally {
          await supabaseAdmin.removeChannel(ch).catch(() => {});
        }
      }),
    );

    const userBroadcastFailures = userBroadcastResults.filter(
      (r) => r.status === "rejected",
    );
    if (userBroadcastFailures.length > 0) {
      captureError(
        new Error(
          `user-invites broadcast: ${userBroadcastFailures.length}/${broadcastUserIds.length} failed`,
        ),
        {
          component: "CombatInviteDispatch",
          action: "broadcast_user_scoped",
          category: "realtime",
          sessionId,
        },
      );
    }

    // 8b. LEGACY — campaign-scoped broadcast (grace period).
    //     Using the unchanged subscribe-then-send pattern for minimum risk to
    //     clients still running pre-P2 bundle. This entire block (legacyChannel
    //     + try/finally) is scheduled for removal ~7d post-deploy once old tabs
    //     have refreshed.
    const { type: _ignored, ...legacyBase } = payload;
    const legacyPayload: RealtimeCombatInvite = {
      ...legacyBase,
      type: "campaign:combat_invite",
    };
    const legacyChannelName = `campaign:${campaignId}:invites`;
    const legacyChannel = supabaseAdmin.channel(legacyChannelName);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Channel subscribe timeout (5s)"));
        }, 5000);

        legacyChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            legacyChannel
              .send({
                type: "broadcast",
                event: "campaign:combat_invite",
                payload: legacyPayload,
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
      captureError(err, {
        component: "CombatInviteDispatch",
        action: "broadcast_legacy_campaign_scoped",
        category: "realtime",
        sessionId,
      });
    } finally {
      supabaseAdmin.removeChannel(legacyChannel);
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
