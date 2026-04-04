import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/errors/capture";

/**
 * GET /api/methodology/contribution — User's personal contribution stats.
 * Requires authentication. Returns how many rated combats this DM contributed.
 * Filters match get_methodology_stats() RPC exactly.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count valid encounters — filters match RPC get_methodology_stats() exactly
    const { count: total } = await supabase
      .from("sessions")
      .select("encounters!inner(id)", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .not("encounters.party_snapshot", "is", null)
      .not("encounters.creatures_snapshot", "is", null)
      .not("encounters.combat_result", "is", null);

    // Count encounters with DM rating (subset of valid)
    const { count: rated } = await supabase
      .from("sessions")
      .select("encounters!inner(id)", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .not("encounters.dm_difficulty_rating", "is", null)
      .not("encounters.party_snapshot", "is", null)
      .not("encounters.creatures_snapshot", "is", null)
      .not("encounters.combat_result", "is", null);

    const t = total ?? 0;
    const r = rated ?? 0;

    return NextResponse.json({
      total_combats: t,
      rated_combats: r,
      is_researcher: r >= 10,
    });
  } catch (err) {
    captureError(err, { component: "methodology", action: "get-contribution" });
    return NextResponse.json(
      { total_combats: 0, rated_combats: 0, is_researcher: false },
      { status: 200 }
    );
  }
}
