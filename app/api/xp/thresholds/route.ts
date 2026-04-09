import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/xp/thresholds — Public rank thresholds (cacheable).
 * Returns all DM + Player rank definitions.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rank_thresholds")
      .select("*")
      .order("rank");

    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  }
};

export const GET = withRateLimit(handler, { max: 30, window: "1 m" });
