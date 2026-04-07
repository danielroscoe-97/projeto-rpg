import { createServiceClient, createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * DM heartbeat endpoint — used by sendBeacon on pagehide to clear dm_last_seen_at.
 * Also supports regular heartbeat updates (though those go directly via Supabase client).
 *
 * Auth: Two-layer verification:
 *   1. Cookie-based JWT auth (primary — sendBeacon includes cookies on same-origin)
 *   2. Body dm_user_id verified against session.owner_id (fallback)
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

    // Layer 1: Try cookie-based JWT auth (sendBeacon sends cookies on same-origin)
    let verifiedUserId: string | null = null;
    try {
      const supabaseAuth = await createServerClient();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) verifiedUserId = user.id;
    } catch {
      // Cookie auth failed — fall through to body-based check
    }

    const supabase = createServiceClient();

    // Verify caller is the DM (session owner)
    const { data: session } = await supabase
      .from("sessions")
      .select("owner_id")
      .eq("id", sessionId)
      .eq("is_active", true)
      .single();

    if (!session) {
      return new NextResponse(null, { status: 403 });
    }

    // Layer 2: If cookie auth succeeded, verify it matches session owner.
    // If not, fall back to body-based dm_user_id check against session.owner_id.
    if (verifiedUserId) {
      if (session.owner_id !== verifiedUserId) {
        return new NextResponse(null, { status: 403 });
      }
    } else if (session.owner_id !== dmUserId) {
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
