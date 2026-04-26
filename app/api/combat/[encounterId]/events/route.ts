/**
 * GET /api/combat/:encounterId/events?since_seq=X&token=Y
 *
 * Resume endpoint for client-side event reconciliation (CR-02).
 *
 * Client reconnect flow:
 *   1. Client reads `lastSeenSeq` from sessionStorage
 *   2. Calls this endpoint with since_seq=lastSeenSeq
 *   3. If response is `events`, apply each via reducer and advance cursor
 *   4. If response is `too_stale` / `empty`, fall back to /api/combat/:id/state
 *
 * Response shapes (discriminated by `kind`):
 *   200 { kind: "events", events: JournalEntry[], currentSeq }
 *   200 { kind: "too_stale", currentSeq, oldestSeq }
 *   200 { kind: "empty", currentSeq }
 *   400 { error: "invalid_since_seq" }
 *   401 { error: "missing_token" | "invalid_token" }
 *   404 { error: "encounter_not_found" }
 *
 * Auth: validates `token` against session_tokens.token + is_active + session_id
 * match. Uses service client (bypass RLS) — the journal is already
 * sanitized per the same rules as broadcast.ts sanitizePayload.
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-02-event-journal.md
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEventsSince } from "@/lib/realtime/event-journal";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ encounterId: string }> },
) {
  const { encounterId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const sinceSeqRaw = url.searchParams.get("since_seq");

  // Token is required — anonymous players pass their session_tokens.token,
  // authenticated players do the same (the token is scoped to the session).
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const sinceSeq = parseInt(sinceSeqRaw ?? "", 10);
  if (!Number.isFinite(sinceSeq) || sinceSeq < 0) {
    return NextResponse.json({ error: "invalid_since_seq" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve session from the encounter.
  const { data: enc } = await supabase
    .from("encounters")
    .select("session_id")
    .eq("id", encounterId)
    .single();

  if (!enc) {
    return NextResponse.json({ error: "encounter_not_found" }, { status: 404 });
  }

  // Validate token belongs to this session and is active.
  const { data: tokenRow } = await supabase
    .from("session_tokens")
    .select("id")
    .eq("token", token)
    .eq("session_id", enc.session_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const result = await getEventsSince(enc.session_id, sinceSeq);
  // CR-02 AC10 (Estabilidade Combate review fix): observability on too_stale.
  // Sentry breadcrumb so the metric `too_stale_rate` (tech spec §6) is
  // measurable in prod — drives the decision on whether to bump BUFFER_CAP.
  if (result.kind === "too_stale") {
    // eslint-disable-next-line no-console -- server-side, intentional log
    console.warn(
      `[combat-events] too_stale: session=${enc.session_id} since=${sinceSeq} oldest=${result.oldestSeq} current=${result.currentSeq}`,
    );
  }
  return NextResponse.json(result, { status: 200 });
}
