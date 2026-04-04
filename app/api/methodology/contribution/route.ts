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

    const { data, error } = await supabase.rpc("get_user_methodology_contribution", { p_user_id: user.id });

    if (error) throw error;

    return NextResponse.json(data ?? {
      total_combats: 0,
      rated_combats: 0,
      is_researcher: false,
    });
  } catch (err) {
    captureError(err, { component: "methodology", action: "get-contribution" });
    return NextResponse.json(
      { total_combats: 0, rated_combats: 0, is_researcher: false },
      { status: 200 }
    );
  }
}
