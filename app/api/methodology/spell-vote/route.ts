import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";

const VALID_VOTES = ["S", "A", "B", "C", "D", "E"] as const;
type SpellVote = (typeof VALID_VOTES)[number];

const MAX_SPELL_NAME_LENGTH = 100;

/**
 * GET /api/methodology/spell-vote — Spell tier vote stats.
 * Optional ?spell=name param for single-spell lookup. Without param returns top 20.
 * Optional ?my=true param returns the authenticated user's personal votes.
 * Public (stats). Cached 5 minutes (stats only — personal votes are not cached).
 */
const getHandler: Parameters<typeof withRateLimit>[0] = async function GET(request: NextRequest) {
  try {
    const myParam = request.nextUrl.searchParams.get("my");
    const spellParam = request.nextUrl.searchParams.get("spell");

    // Personal votes mode — requires auth
    if (myParam === "true") {
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

      const limitParam = request.nextUrl.searchParams.get("limit");
      const offsetParam = request.nextUrl.searchParams.get("offset");
      const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);
      const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

      const { data, error, count } = await supabase
        .from("spell_tier_votes")
        .select("spell_name, vote, voted_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("voted_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return NextResponse.json(
        { votes: data ?? [], total: count ?? 0 },
        { headers: { "Cache-Control": "private, no-cache" } },
      );
    }

    // Public aggregated stats mode
    if (spellParam && spellParam.length > MAX_SPELL_NAME_LENGTH) {
      return NextResponse.json([], { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_spell_tier_stats",
      spellParam ? { p_spell_name: spellParam.toLowerCase() } : {}
    );

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
 * Body: { spell_name: string, vote: "S" | "A" | "B" | "C" | "D" | "E" }
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
      p_spell_name: spell_name.trim().toLowerCase(),
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
