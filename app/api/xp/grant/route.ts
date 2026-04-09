import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { grantXp } from "@/lib/xp/grant-xp";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_METADATA_SIZE = 1024; // 1KB limit for metadata

/**
 * POST /api/xp/grant — Client requests XP grant for an action.
 * Server validates auth, role ownership, cooldown, and inserts via service_role.
 * Body: { actionKey: string, role: "dm" | "player", metadata?: object }
 */
const handler: Parameters<typeof withRateLimit>[0] = async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reject anonymous users — guests don't earn XP
    if (user.is_anonymous) {
      return NextResponse.json(
        { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "anonymous" },
        { status: 200 },
      );
    }

    const body = await request.json() as {
      actionKey?: string;
      role?: "dm" | "player";
      metadata?: Record<string, unknown>;
    };

    if (!body.actionKey || !body.role) {
      return NextResponse.json({ error: "Missing actionKey or role" }, { status: 400 });
    }

    if (body.role !== "dm" && body.role !== "player") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Validate user actually has the claimed role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const actualRole = (userData?.role as string) ?? "both";
    if (actualRole !== "both" && body.role !== actualRole) {
      return NextResponse.json(
        { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "role_mismatch" },
        { status: 200 },
      );
    }

    // Sanitize metadata: limit size
    let metadata = body.metadata;
    if (metadata) {
      const serialized = JSON.stringify(metadata);
      if (serialized.length > MAX_METADATA_SIZE) {
        metadata = undefined;
      }
    }

    const result = await grantXp(user.id, body.actionKey, body.role, metadata);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { granted: false, xp: 0, newTotal: 0, newRank: 1, reason: "server_error" },
      { status: 200 },
    );
  }
};

export const POST = withRateLimit(handler, { max: 60, window: "1 m" });
