import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the retroactive feedback URL for a session, usable from the DM recap
 * to share with players (e.g. via WhatsApp).
 *
 * Responds with { url, token } where `url` is the absolute `/feedback/<token>`
 * path on the current origin. Picks the most recent active session_token for
 * the session. DM (session owner) only.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function getHandler(
  request,
  { params },
) {
  const { id: sessionId } = await params;

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // Verify this user owns the session (DM)
  const { data: session, error: sessionErr } = await service
    .from("sessions")
    .select("id, owner_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  if (session.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Pick the most recent active token on the session
  const { data: tokenRow } = await service
    .from("session_tokens")
    .select("token, created_at")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow?.token) {
    return NextResponse.json({ error: "no_active_token" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const url = `${origin}/feedback/${tokenRow.token}`;

  return NextResponse.json({ url, token: tokenRow.token });
};

export const GET = withRateLimit(handler, {
  max: 30,
  window: "1 m",
  prefix: "session-feedback-link",
});
