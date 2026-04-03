import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * DM heartbeat endpoint — used by sendBeacon on pagehide to clear dm_last_seen_at.
 * Also supports regular heartbeat updates (though those go directly via Supabase client).
 *
 * Auth: requires dm_user_id in body — verified against session.owner_id.
 * sendBeacon can't send auth headers, so we use body-based verification.
 * Rate-limited: 4 requests/30s per IP.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await req.json();

    // Validate required field
    const dmUserId = body?.dm_user_id;
    if (!dmUserId || typeof dmUserId !== "string") {
      return new NextResponse(null, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify caller is the DM (session owner) — prevents spoofing
    const { data: session } = await supabase
      .from("sessions")
      .select("owner_id")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (!session || session.owner_id !== dmUserId) {
      return new NextResponse(null, { status: 403 });
    }

    if (body?.offline) {
      // DM is going offline — clear dm_last_seen_at
      await supabase
        .from("sessions")
        .update({ dm_last_seen_at: null })
        .eq("id", sessionId)
        .eq("owner_id", dmUserId);
    } else {
      // Regular heartbeat update
      await supabase
        .from("sessions")
        .update({ dm_last_seen_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("owner_id", dmUserId);
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    // sendBeacon doesn't read the response — no value in detailed errors
    return new NextResponse(null, { status: 204 });
  }
};

export const POST = withRateLimit(handler, { max: 4, window: "30 s" });
