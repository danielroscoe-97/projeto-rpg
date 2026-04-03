import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sanitizeCombatantsForPlayer } from "@/lib/utils/sanitize-combatants";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handler: Parameters<typeof withRateLimit>[0] = async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: sessionId } = await params;
  const tokenIdParam = request.nextUrl.searchParams.get("token_id");
  const supabase = await createClient();

  // Verify auth — player must have an active token for this session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  try {
    // Use service client to bypass RLS for token/session/encounter lookups
    // (anonymous players can't read these tables through RLS)
    const serviceClient = createServiceClient();

    // Check if user has a valid session token
    const { data: tokenRow, error: tokenError } = await serviceClient
      .from("session_tokens")
      .select("id")
      .eq("session_id", sessionId)
      .eq("anon_user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    // PGRST116 = "0 rows" — not a DB failure, just no matching token
    if (tokenError && tokenError.code !== "PGRST116") {
      captureError(tokenError, { component: "SessionStateAPI", action: "verifyToken", category: "database" });
      return NextResponse.json({ error: "Failed to verify access" }, { status: 500 });
    }
    if (!tokenRow) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch dm_plan + dm_last_seen_at from sessions table
    const { data: sessionRow } = await serviceClient
      .from("sessions")
      .select("dm_plan, dm_last_seen_at")
      .eq("id", sessionId)
      .single();

    // Fetch active encounter + combatants
    const { data: encounter } = await serviceClient
      .from("encounters")
      .select("id, round_number, current_turn_index, is_active")
      .eq("session_id", sessionId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Resolve token_owner for split-brain detection (bfcache)
    let tokenOwner: string | null = null;
    if (tokenIdParam && UUID_RE.test(tokenIdParam)) {
      const { data: ownerRow } = await serviceClient
        .from("session_tokens")
        .select("anon_user_id")
        .eq("id", tokenIdParam)
        .eq("session_id", sessionId)
        .eq("is_active", true)
        .single();
      tokenOwner = ownerRow?.anon_user_id ?? null;
    }

    if (!encounter) {
      return NextResponse.json({ data: { encounter: null, combatants: [], dm_plan: sessionRow?.dm_plan ?? null, dm_last_seen_at: sessionRow?.dm_last_seen_at ?? null, token_owner: tokenOwner } });
    }

    const { data: combatants } = await serviceClient
      .from("combatants")
      .select(
        "id, name, display_name, current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative_order, conditions, is_defeated, is_player, is_hidden, monster_id, ruleset_version, monster_group_id, group_order, condition_durations"
      )
      .eq("encounter_id", encounter.id)
      .order("initiative_order", { ascending: true });

    // Strip sensitive data from monsters — players see only HP status label.
    // Also filter out hidden combatants and apply display_name anti-metagaming.
    const playerCombatants = sanitizeCombatantsForPlayer(combatants ?? []);

    return NextResponse.json({
      data: {
        encounter,
        combatants: playerCombatants,
        dm_plan: sessionRow?.dm_plan ?? null,
        dm_last_seen_at: sessionRow?.dm_last_seen_at ?? null,
        token_owner: tokenOwner,
      },
    });
  } catch (err) {
    captureError(err, { component: "SessionStateAPI", action: "getState", category: "database" });
    return NextResponse.json({ error: "Failed to fetch session state" }, { status: 500 });
  }
};

export const GET = withRateLimit(handler, { max: 60, window: "1 m" });
