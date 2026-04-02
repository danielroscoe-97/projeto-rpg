import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Fire-and-forget endpoint for sendBeacon on page unload.
 * Sets last_seen_at = null to mark player as explicitly offline.
 * Idempotent: repeated calls on the same row are harmless.
 * Rate-limited: 2 requests/30s per IP (one disconnect + one possible retry).
 */
const handler: Parameters<typeof withRateLimit>[0] = async function (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id: sessionId } = await params;
    const { token_id } = await req.json();

    if (!token_id || typeof token_id !== "string") {
      return new NextResponse(null, { status: 400 });
    }

    const supabase = createServiceClient();

    await supabase
      .from("session_tokens")
      .update({ last_seen_at: null })
      .eq("id", token_id)
      .eq("session_id", sessionId)
      .eq("is_active", true);

    return new NextResponse(null, { status: 204 });
  } catch {
    // sendBeacon doesn't read the response — no value in detailed errors
    return new NextResponse(null, { status: 204 });
  }
};

export const POST = withRateLimit(handler, { max: 2, window: "30 s" });
