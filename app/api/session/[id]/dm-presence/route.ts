import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lightweight DM presence endpoint — returns only dm_last_seen_at.
 * Players poll this every 30s instead of the full /state endpoint.
 * ~5x cheaper than /state (1 query vs 5 queries).
 */
const handler: Parameters<typeof withRateLimit>[0] = async function (
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: sessionId } = await params;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Verify player has an active token for this session (parallel with session fetch)
  const [tokenResult, sessionResult] = await Promise.all([
    serviceClient
      .from("session_tokens")
      .select("id")
      .eq("session_id", sessionId)
      .eq("anon_user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from("sessions")
      .select("dm_last_seen_at")
      .eq("id", sessionId)
      .single(),
  ]);

  if (!tokenResult.data) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!sessionResult.data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ dm_last_seen_at: sessionResult.data.dm_last_seen_at });
};

export const GET = withRateLimit(handler, { max: 120, window: "1 m" });
