/**
 * POST /api/push/subscribe
 *
 * Saves a player's Web Push subscription to Supabase.
 * Called from the player view after the user grants notification permission.
 *
 * Body: {
 *   sessionId: string,
 *   playerName: string,
 *   subscription: { endpoint, keys: { p256dh, auth } }
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, playerName, subscription } = body as {
      sessionId: string;
      playerName: string;
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    };

    if (!sessionId || !playerName || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify session exists, is active, and player has an active token in it
    const { data: token } = await supabase
      .from("session_tokens")
      .select("id")
      .eq("session_id", sessionId)
      .eq("player_name", playerName)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!token) {
      return NextResponse.json({ error: "Invalid session or player" }, { status: 403 });
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;

    // Upsert: same endpoint in the same session → just update player_name/keys
    const { error } = await supabase
      .from("player_push_subscriptions")
      .upsert(
        {
          session_id: sessionId,
          player_name: playerName,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent,
        },
        { onConflict: "session_id,endpoint" }
      );

    if (error) {
      console.error("[push/subscribe] DB error:", error.message);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 *
 * Removes a player's push subscription (opt-out).
 * Body: { sessionId, endpoint }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, endpoint } = body as { sessionId: string; endpoint: string };

    if (!sessionId || !endpoint) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify subscription belongs to an active session before deleting
    const { data: sub } = await supabase
      .from("player_push_subscriptions")
      .select("id")
      .eq("session_id", sessionId)
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("player_push_subscriptions")
      .delete()
      .eq("session_id", sessionId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[push/subscribe] Delete error:", error.message);
      return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
