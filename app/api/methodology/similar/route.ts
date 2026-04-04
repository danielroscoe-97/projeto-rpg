import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";

const FALLBACK = {
  match_count: 0,
  avg_dm_rating: null,
  avg_player_rating: null,
  has_enough_data: false,
};

/**
 * GET /api/methodology/similar?party_size=4&creature_count=3
 * Returns aggregated stats for similar encounters.
 * Public. Cached 5 minutes.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const partySizeRaw = searchParams.get("party_size");
    const creatureCountRaw = searchParams.get("creature_count");

    const partySize = partySizeRaw !== null ? parseInt(partySizeRaw, 10) : NaN;
    const creatureCount = creatureCountRaw !== null ? parseInt(creatureCountRaw, 10) : NaN;

    if (
      isNaN(partySize) || !Number.isInteger(partySize) || partySize <= 0 ||
      isNaN(creatureCount) || !Number.isInteger(creatureCount) || creatureCount <= 0
    ) {
      return NextResponse.json(
        { error: "party_size and creature_count must be positive integers" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_similar_encounters", {
      p_party_size: partySize,
      p_creature_count: creatureCount,
    });

    if (error) throw error;

    return NextResponse.json(data ?? FALLBACK, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    captureError(err, { component: "methodology", action: "get-similar-encounters" });
    return NextResponse.json(FALLBACK, {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    });
  }
};

export const GET = withRateLimit(handler, { max: 30, window: "1 m" });
