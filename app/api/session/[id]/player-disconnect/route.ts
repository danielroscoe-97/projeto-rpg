import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

/**
 * Fire-and-forget endpoint for sendBeacon on page unload.
 * Sets last_seen_at = null to mark player as explicitly offline.
 * Idempotent: repeated calls on the same row are harmless.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { token_id } = await req.json();

    if (!token_id || typeof token_id !== "string") {
      return new Response(null, { status: 400 });
    }

    const supabase = createServiceClient();

    await supabase
      .from("session_tokens")
      .update({ last_seen_at: null })
      .eq("id", token_id)
      .eq("session_id", sessionId)
      .eq("is_active", true);

    return new Response(null, { status: 204 });
  } catch {
    // sendBeacon doesn't read the response — no value in detailed errors
    return new Response(null, { status: 204 });
  }
}
