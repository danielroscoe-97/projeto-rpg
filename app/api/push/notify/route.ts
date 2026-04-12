/**
 * POST /api/push/notify
 *
 * Sends a Web Push notification to all subscriptions for a given player
 * in a session. Called by the DM's client after a turn advance.
 *
 * This endpoint is server-side only and uses the VAPID private key.
 *
 * Body: {
 *   sessionId: string,
 *   playerName: string,
 *   message?: string   // optional override (defaults to "É a sua vez!")
 * }
 *
 * Security: This endpoint is called server-side in turn advance flow.
 * The session must exist. No auth check here — rate limiting is
 * handled at Vercel edge level. Worst case: DM can spam their own players.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  sendPushNotification,
  PushSubscriptionExpiredError,
  type PushSubscriptionData,
} from "@/lib/push/vapid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, playerName, message } = body as {
      sessionId: string;
      playerName: string;
      message?: string;
    };

    if (!sessionId || !playerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify caller is authenticated and owns the session (DM only)
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service role to read subscriptions (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the caller is the DM (session owner)
    const { data: session } = await supabase
      .from("sessions")
      .select("owner_id")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (!session || session.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all push subscriptions for this player in this session
    const { data: subs, error } = await supabase
      .from("player_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("session_id", sessionId)
      .eq("player_name", playerName);

    if (error) {
      console.error("[push/notify] DB error:", error.message);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      // No subscriptions — not an error, just nothing to do
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // Resolve the player view URL (for notification tap-to-open)
    // session_tokens holds the public join token; grab the first active one for this session
    const { data: tokenData } = await supabase
      .from("session_tokens")
      .select("token")
      .eq("session_id", sessionId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pocketdm.com.br";
    const playerUrl = tokenData?.token
      ? `${baseUrl}/join/${tokenData.token}`
      : `${baseUrl}/app/dashboard`;

    const notificationPayload = {
      title: "Pocket DM",
      body: message ?? `É a sua vez, ${playerName}!`,
      url: playerUrl,
      sessionId,
    };

    let sent = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subs.map(async (sub: PushSubscriptionData & { id: string }) => {
        try {
          const ok = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            notificationPayload
          );
          if (ok) sent++;
        } catch (err) {
          if (err instanceof PushSubscriptionExpiredError) {
            expiredIds.push(sub.id);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase
        .from("player_push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[push/notify] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
