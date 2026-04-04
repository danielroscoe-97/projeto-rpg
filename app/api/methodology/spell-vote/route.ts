import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";

const VALID_VOTES = ["under_tiered", "correct", "over_tiered"] as const;
type SpellVote = (typeof VALID_VOTES)[number];

const MAX_SPELL_NAME_LENGTH = 100;

/**
 * GET /api/methodology/spell-vote — Top 20 voted spells with tier stats.
 * Public. Cached 5 minutes.
 */
const getHandler: Parameters<typeof withRateLimit>[0] = async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_spell_tier_stats");

    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    captureError(err, { component: "methodology", action: "get-spell-tier-stats" });
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "public, s-maxage=60",
      },
    });
  }
};

export const GET = withRateLimit(getHandler, { max: 30, window: "1 m" });

/**
 * POST /api/methodology/spell-vote — Submit a spell tier vote.
 * Requires authentication.
 * Body: { spell_name: string, vote: "under_tiered" | "correct" | "over_tiered" }
 */
const postHandler: Parameters<typeof withRateLimit>[0] = async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.is_anonymous) {
      return NextResponse.json({ error: "Anonymous users cannot vote" }, { status: 403 });
    }

    const body = await request.json();
    const { spell_name, vote } = body ?? {};

    if (!spell_name || typeof spell_name !== "string" || spell_name.trim() === "") {
      return NextResponse.json({ error: "spell_name is required" }, { status: 400 });
    }

    if (spell_name.trim().length > MAX_SPELL_NAME_LENGTH) {
      return NextResponse.json({ error: "spell_name too long" }, { status: 400 });
    }

    if (!VALID_VOTES.includes(vote as SpellVote)) {
      return NextResponse.json(
        { error: `vote must be one of: ${VALID_VOTES.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("upsert_spell_tier_vote", {
      p_spell_name: spell_name.trim(),
      p_vote: vote,
    });

    if (error) throw error;

    return NextResponse.json(data ?? { success: true });
  } catch (err) {
    captureError(err, { component: "methodology", action: "upsert-spell-tier-vote" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const POST = withRateLimit(postHandler, { max: 10, window: "1 m" });
