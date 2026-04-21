import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Epic 12, Story 12.3 — link a quick combat to a campaign after the fact.
 *
 * The old bloqueante banner ("Select a campaign to save combat") redirected
 * the DM away from the recap. This endpoint is the non-blocking alternative:
 * the DM can optionally pick a campaign from the recap, and we patch both
 * `sessions.campaign_id` and any existing `combat_reports.campaign_id` in
 * one shot, so the combat shows up in the campaign's history.
 *
 * Ownership: both session and target campaign must belong to the caller.
 * Service client is used so RLS doesn't block the UPDATEs (no UPDATE policy
 * on combat_reports); ownership is enforced explicitly before writing.
 */
const handler: Parameters<typeof withRateLimit>[0] = async function postHandler(
  req,
  { params },
) {
  const { id: sessionId } = await params;

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const campaignId = (body as { campaignId?: unknown })?.campaignId;
  if (typeof campaignId !== "string" || !UUID_RE.test(campaignId)) {
    return NextResponse.json({ error: "invalid_campaign_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: session } = await service
    .from("sessions")
    .select("id, owner_id, campaign_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  if (session.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: campaign } = await service
    .from("campaigns")
    .select("id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: "campaign_not_found" }, { status: 404 });
  }
  if (campaign.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden_campaign" }, { status: 403 });
  }

  const { error: sessionUpdateErr } = await service
    .from("sessions")
    .update({ campaign_id: campaignId })
    .eq("id", sessionId)
    .eq("owner_id", user.id);

  if (sessionUpdateErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // Cascade the link into any combat_reports derived from this session's
  // encounters so the combat surfaces in the campaign's history. If the
  // encounter fetch or the cascade UPDATE fails, surface it — otherwise
  // the client thinks the link succeeded but the combat never shows up
  // in the campaign history.
  const { data: encounterRows, error: encountersErr } = await service
    .from("encounters")
    .select("id")
    .eq("session_id", sessionId);

  if (encountersErr) {
    return NextResponse.json({ error: "encounters_lookup_failed" }, { status: 500 });
  }

  const encounterIds = (encounterRows ?? []).map((r: { id: string }) => r.id);
  if (encounterIds.length > 0) {
    const { error: reportsErr } = await service
      .from("combat_reports")
      .update({ campaign_id: campaignId })
      .in("encounter_id", encounterIds)
      .eq("owner_id", user.id);

    if (reportsErr) {
      return NextResponse.json({ error: "reports_cascade_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ campaignId }, { status: 200 });
};

export const POST = withRateLimit(handler, {
  max: 10,
  window: "1 m",
  prefix: "combat-link-campaign",
});
