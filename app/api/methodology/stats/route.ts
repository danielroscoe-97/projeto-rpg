import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/methodology/stats — Public aggregated stats for methodology community page.
 * Returns combat count, DM count, voting rate — all anonymous/aggregated.
 * Cached for 5 minutes via Cache-Control headers.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_methodology_stats");

    if (error) throw error;

    return NextResponse.json(data ?? {
      valid_combats: 0,
      combats_with_dm_rating: 0,
      unique_dms: 0,
      current_phase: "collecting",
      phase_target: 500,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch {
    // Fail gracefully — page still renders with zeroes
    return NextResponse.json({
      valid_combats: 0,
      combats_with_dm_rating: 0,
      unique_dms: 0,
      current_phase: "collecting",
      phase_target: 500,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    });
  }
};

export const GET = withRateLimit(handler, { max: 30, window: "1 m" });
