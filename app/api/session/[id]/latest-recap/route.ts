import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/session/[id]/latest-recap
 *
 * Returns the most recently ended encounter's persisted `recap_snapshot` for
 * a given session, provided it was ended less than 24h ago. Used by the
 * player client on mount so players who reconnect after the DM ended combat
 * still see the Wrapped recap.
 *
 * Spec: docs/spike-beta-test-3-2026-04-17.md Finding 1 (C1).
 *
 * Auth / visibility model:
 *   - The caller must hold an active `session_tokens` row for this session
 *     (same contract as `GET /api/session/[id]/state`, the anon-player path).
 *   - The DM (authenticated session owner) is also allowed via an owner
 *     fallback, which covers the case where the DM refreshes mid-review.
 *
 * TTL:
 *   - `ended_at > now() - 24h`. Older recaps return `{ data: null }` and are
 *     treated as expired by the player client (matches anon cookie TTL).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL_MS = 24 * 60 * 60 * 1000;

const handler: Parameters<typeof withRateLimit>[0] = async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: sessionId } = await params;

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Service client mirrors /state — anon player JWTs can't read
    // session_tokens / encounters through RLS directly.
    const serviceClient = createServiceClient();

    // Authorization: either (a) active token for this session, or (b) the
    // session owner (DM). Single round trip: fetch both in parallel.
    const [tokenResult, sessionResult] = await Promise.all([
      serviceClient
        .from("session_tokens")
        .select("id")
        .eq("session_id", sessionId)
        .eq("anon_user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      serviceClient
        .from("sessions")
        .select("owner_id")
        .eq("id", sessionId)
        .maybeSingle(),
    ]);

    const hasActiveToken = Boolean(tokenResult.data?.id);
    const isOwner = sessionResult.data?.owner_id === user.id;

    if (!hasActiveToken && !isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Find the most recently ended encounter with a persisted recap.
    // `ended_at` is NOT NULL only once the DM closes combat; we rely on that
    // to avoid the `is_active = true` filter bug documented in the spike.
    const ttlCutoffIso = new Date(Date.now() - TTL_MS).toISOString();

    const { data: encounter, error: encError } = await serviceClient
      .from("encounters")
      .select("id, ended_at, recap_snapshot")
      .eq("session_id", sessionId)
      .not("ended_at", "is", null)
      .not("recap_snapshot", "is", null)
      .gt("ended_at", ttlCutoffIso)
      .order("ended_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (encError && encError.code !== "PGRST116") {
      captureError(encError, {
        component: "LatestRecapAPI",
        action: "fetchRecap",
        category: "database",
      });
      return NextResponse.json({ error: "Failed to fetch recap" }, { status: 500 });
    }

    if (!encounter?.recap_snapshot) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        encounter_id: encounter.id,
        ended_at: encounter.ended_at,
        recap: encounter.recap_snapshot,
      },
    });
  } catch (err) {
    captureError(err, {
      component: "LatestRecapAPI",
      action: "fetchRecap",
      category: "unknown",
    });
    return NextResponse.json({ error: "Failed to fetch recap" }, { status: 500 });
  }
};

export const GET = withRateLimit(handler, { max: 30, window: "1 m" });
