import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Check if user has a valid session token
  const { data: tokenRow } = await supabase
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

  // Fetch active encounter + combatants
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id, round_number, current_turn_index, is_active")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!encounter) {
    return NextResponse.json({ data: { encounter: null, combatants: [] } });
  }

  const { data: combatants } = await supabase
    .from("combatants")
    .select(
      "id, name, current_hp, max_hp, temp_hp, ac, initiative_order, conditions, is_defeated, is_player, monster_id, ruleset_version"
    )
    .eq("encounter_id", encounter.id)
    .order("initiative_order", { ascending: true });

  // Strip exact HP values from monsters — players see status label only (OK/LOW/CRIT)
  const playerCombatants = (combatants ?? []).map((c) => {
    if (c.is_player) return c;
    const pct = c.max_hp > 0 ? c.current_hp / c.max_hp : 0;
    const hpStatus = pct > 0.5 ? "OK" : pct > 0.25 ? "LOW" : "CRIT";
    const { current_hp, max_hp, temp_hp, ...rest } = c;
    return { ...rest, hp_status: hpStatus };
  });

  return NextResponse.json({
    data: {
      encounter,
      combatants: playerCombatants,
    },
  });
}
