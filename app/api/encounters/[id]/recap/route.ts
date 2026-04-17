import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/errors/capture";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { withRateLimit } from "@/lib/rate-limit";
import {
  MAX_RECAP_PAYLOAD_SIZE,
  serializeRecapSafely,
} from "@/lib/combat/recap-payload";

/**
 * POST /api/encounters/[id]/recap
 *
 * Persists the end-of-combat player-safe CombatReport on the encounter row so
 * players who reconnect after the DM closes combat can still retrieve it.
 *
 * Spec: docs/spike-beta-test-3-2026-04-17.md Finding 1 (C3).
 *
 * Auth:
 *   - Requires a logged-in Supabase session (the DM).
 *   - Ownership verified via `sessions.owner_id = auth.uid()` joined through
 *     `encounters.session_id`. Does NOT use the service client.
 *
 * Idempotent:
 *   - A second POST is a no-op if `recap_snapshot` is already set, returning
 *     200 (client callers use `void fetch(...).catch(retry)` — see
 *     CombatSessionClient).
 *
 * Errors:
 *   - 400: invalid JSON, missing/invalid report, NULL bytes in payload
 *   - 401: no authenticated user
 *   - 403: caller is not the session owner (or encounter not found)
 *   - 413: payload exceeds MAX_RECAP_PAYLOAD_SIZE
 *   - 500: database error
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handler: Parameters<typeof withRateLimit>[0] = async function postHandler(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id: encounterId } = await params;

  if (!UUID_RE.test(encounterId)) {
    return NextResponse.json({ error: "Invalid encounter id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const report = (body as { report?: unknown })?.report;
  if (!report || typeof report !== "object") {
    return NextResponse.json({ error: "Missing report" }, { status: 400 });
  }

  // Basic structural validation to avoid persisting garbage
  const r = report as Record<string, unknown>;
  if (!r.summary || !r.awards || !r.rankings) {
    return NextResponse.json({ error: "Invalid report structure" }, { status: 400 });
  }

  // Payload guard (size + NULL byte sanitization) — shared helper keeps this
  // testable and consistent with combat-reports MAX_PAYLOAD_SIZE.
  const serialized = serializeRecapSafely(report);
  if (serialized.status === "too_large") {
    return NextResponse.json(
      { error: "Recap payload too large", max_bytes: MAX_RECAP_PAYLOAD_SIZE },
      { status: 413 }
    );
  }
  if (serialized.status === "null_bytes") {
    return NextResponse.json({ error: "Recap payload contains NULL bytes" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ownership check: join encounters -> sessions, require sessions.owner_id = auth.uid().
    // No service client. If RLS ever filters this out, we'll see 403 and the
    // DM client retry path (void fetch + 1 retry) absorbs it.
    const { data: ownership, error: ownershipError } = await supabase
      .from("encounters")
      .select("id, session_id, sessions!inner(owner_id)")
      .eq("id", encounterId)
      .single();

    if (ownershipError || !ownership) {
      // PGRST116 = no rows — treat as 403 for information leak prevention.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerId = Array.isArray(ownership.sessions)
      ? ownership.sessions[0]?.owner_id
      : (ownership.sessions as { owner_id?: string } | null)?.owner_id;

    if (!ownerId || ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Idempotent write: only set recap_snapshot when NULL. A second call
    // during DM double-click or retry is a silent no-op.
    const { data: updated, error: updateError } = await supabase
      .from("encounters")
      .update({ recap_snapshot: serialized.payload })
      .eq("id", encounterId)
      .is("recap_snapshot", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      captureError(updateError, {
        component: "EncounterRecapAPI",
        action: "persistRecap",
        category: "database",
      });
      return NextResponse.json({ error: "Failed to persist recap" }, { status: 500 });
    }

    const persisted = Boolean(updated);

    // Fire-and-forget analytics. Never blocks the response.
    trackServerEvent(persisted ? "recap.persisted_success" : "recap.persisted_noop", {
      userId: user.id,
      properties: {
        encounter_id: encounterId,
        payload_bytes: serialized.bytes,
      },
      req: request,
    });

    return NextResponse.json({ ok: true, persisted });
  } catch (err) {
    captureError(err, {
      component: "EncounterRecapAPI",
      action: "persistRecap",
      category: "unknown",
    });
    return NextResponse.json({ error: "Failed to persist recap" }, { status: 500 });
  }
};

export const POST = withRateLimit(handler, { max: 12, window: "1 m" });
