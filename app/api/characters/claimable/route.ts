import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";
import {
  listClaimableCharacters,
  type PlayerIdentity,
} from "@/lib/supabase/character-claim";

/**
 * GET /api/characters/claimable?campaignId=...&offset=0&limit=20
 *
 * Story 02-B full — paginated feed for the "Disponíveis" tab of the
 * `CharacterPickerModal`. Proxies `listClaimableCharacters` with auth gating
 * and identity resolution from the caller's cookie (anon session token or
 * authenticated user_id). Query params control pagination.
 *
 * Auth model: caller MUST be authenticated OR have a valid anon Supabase
 * session — we resolve `playerIdentity` from the JWT (`user.id` for auth,
 * `user.id` of anon user for anonymous). The underlying list function is
 * campaign-scoped (any valid identity sees the same set) so the identity
 * exists primarily to enforce caller discipline + future per-identity
 * filtering without a breaking change.
 *
 * Hardening (Wave 2 code review):
 *   - M1: campaignId is UUID-validated before hitting Postgres — otherwise
 *     a non-UUID string produces a confusing 500 from a 22P02 pg error.
 *   - M2: rate-limited 60/min/IP so a buggy client cannot saturate this
 *     endpoint via tight polling.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * RFC 4122 UUID regex (any version 1-5). Matches the shape Postgres accepts
 * as `uuid` and rejects obvious junk. Mirrors the regex in
 * `app/api/e2e/seed-session-token/route.ts`.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const handler: Parameters<typeof withRateLimit>[0] = async function GET(
  request: NextRequest,
) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");
  const offsetRaw = url.searchParams.get("offset");
  const limitRaw = url.searchParams.get("limit");

  if (!campaignId) {
    return NextResponse.json(
      { error: "Missing campaignId" },
      { status: 400 },
    );
  }

  if (!UUID_RE.test(campaignId)) {
    return NextResponse.json(
      { error: "invalid_uuid" },
      { status: 400 },
    );
  }

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

    // Identity kind:
    //   - anon Supabase user → sessionTokenId (we use user.id as the stable
    //     identifier; the underlying fn only validates shape, not lookup).
    //   - authenticated user → userId.
    const identity: PlayerIdentity = user.is_anonymous
      ? { sessionTokenId: user.id }
      : { userId: user.id };

    const result = await listClaimableCharacters(campaignId, identity, {
      limit,
      offset,
    });

    return NextResponse.json({
      data: {
        characters: result.characters,
        total: result.total,
        hasMore: result.hasMore,
        offset,
        limit,
      },
    });
  } catch (err) {
    captureError(err, {
      component: "api/characters/claimable",
      action: "GET",
      category: "database",
      extra: { campaignId, offset, limit },
    });
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
};

// Rate limit: 60/min per IP. Generous for the picker modal's expected
// pagination pattern (2-5 requests per session) while still containing
// a misbehaving client loop.
export const GET = withRateLimit(handler, { max: 60, window: "1 m" });
