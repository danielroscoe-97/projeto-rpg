import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";

/**
 * GET /api/characters/mine?offset=0&limit=20
 *
 * Story 02-B full — paginated feed for the "Meus personagens" tab of the
 * `CharacterPickerModal`. Returns the caller's standalone characters —
 * `user_id = auth.uid() AND campaign_id IS NULL` — so the player can bring
 * a pre-existing character into a campaign.
 *
 * Auth model: authenticated users ONLY (is_anonymous rejected). Anonymous
 * users don't have standalone characters outside of campaigns because the
 * anon → auth upgrade migrates any guest/anon char at creation time.
 *
 * Hardening (Wave 2 code review):
 *   - M2: rate-limited 60/min/IP to prevent pagination abuse or polling loops.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const handler: Parameters<typeof withRateLimit>[0] = async function GET(
  request: NextRequest,
) {
  const url = new URL(request.url);
  const offsetRaw = url.searchParams.get("offset");
  const limitRaw = url.searchParams.get("limit");

  const offset = Math.max(0, parseInt(offsetRaw ?? "0", 10) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limitRaw ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT),
  );

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // "Meus personagens" only makes sense for real accounts — anon users
    // don't carry standalone chars across campaigns.
    if (user.is_anonymous) {
      return NextResponse.json(
        { error: "Auth required" },
        { status: 403 },
      );
    }

    // Count first so pagination can surface "X of Y" UI without refetch.
    const { count, error: countError } = await supabase
      .from("player_characters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("campaign_id", null);

    if (countError) throw countError;

    const total = count ?? 0;

    if (total === 0) {
      return NextResponse.json({
        data: {
          characters: [],
          total: 0,
          hasMore: false,
          offset,
          limit,
        },
      });
    }

    const { data, error } = await supabase
      .from("player_characters")
      .select(
        "id, name, race, class, level, max_hp, ac, token_url, created_at",
      )
      .eq("user_id", user.id)
      .is("campaign_id", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const characters = data ?? [];
    const hasMore = offset + characters.length < total;

    return NextResponse.json({
      data: {
        characters,
        total,
        hasMore,
        offset,
        limit,
      },
    });
  } catch (err) {
    captureError(err, {
      component: "api/characters/mine",
      action: "GET",
      category: "database",
      extra: { offset, limit },
    });
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
};

// Rate limit: 60/min per IP. Matches `claimable` route — symmetric pagination
// feeds with similar expected call frequency.
export const GET = withRateLimit(handler, { max: 60, window: "1 m" });
