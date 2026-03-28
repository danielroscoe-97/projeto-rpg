import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getHpStatus } from "@/lib/utils/hp-status";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
  const playerCombatants = (combatants ?? [])
    .filter((c) => !c.is_hidden)
    .map((c) => {
      if (c.is_player) {
        const { display_name: _dn, is_hidden: _h, ...rest } = c;
        return rest;
      }
      const { current_hp: _current_hp, max_hp: _max_hp, temp_hp: _temp_hp, ac: _ac, display_name, is_hidden: _h, ...rest } = c;
      return {
        ...rest,
        // Anti-metagaming: replace real name with display_name if set
        name: display_name || rest.name,
        hp_status: getHpStatus(_current_hp, _max_hp),
      };
    });

  return NextResponse.json({
    data: {
      encounter,
      combatants: playerCombatants,
      dm_plan: sessionRow?.dm_plan ?? null,
    },
  });
}
