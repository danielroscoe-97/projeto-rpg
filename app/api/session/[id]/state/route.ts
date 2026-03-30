import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sanitizeCombatantsForPlayer } from "@/lib/utils/sanitize-combatants";
import { withRateLimit } from "@/lib/rate-limit";

const handler: Parameters<typeof withRateLimit>[0] = async function getHandler(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();

  // Verify auth — player must have an active token for this session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service client to bypass RLS for token/session/encounter lookups
  // (anonymous players can't read these tables through RLS)
  const serviceClient = createServiceClient();

  // Check if user has a valid session token
  const { data: tokenRow } = await serviceClient
    .from("session_tokens")
    .select("id")
    .eq("session_id", sessionId)
    .eq("anon_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!tokenRow) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Fetch dm_plan from sessions table (Mesa model)
  const { data: sessionRow } = await serviceClient
    .from("sessions")
    .select("dm_plan")
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

  if (!encounter) {
    return NextResponse.json({ data: { encounter: null, combatants: [], dm_plan: sessionRow?.dm_plan ?? null } });
  }

  const { data: combatants } = await serviceClient
    .from("combatants")
    .select(
      "id, name, display_name, current_hp, max_hp, temp_hp, ac, initiative_order, conditions, is_defeated, is_player, is_hidden, monster_id, ruleset_version"
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
    },
  });
};

export const GET = withRateLimit(handler, { max: 60, window: "1 m" });
