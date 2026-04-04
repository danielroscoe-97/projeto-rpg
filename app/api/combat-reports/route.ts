import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_PAYLOAD_SIZE = 100_000; // 100KB max for report_data

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { report, campaignId, encounterId } = body as Record<string, unknown>;

  // Validate report exists and has basic structure
  if (!report || typeof report !== "object") {
    return NextResponse.json({ error: "Missing report" }, { status: 400 });
  }

  const r = report as Record<string, unknown>;
  if (!r.summary || !r.awards || !r.rankings) {
    return NextResponse.json({ error: "Invalid report structure" }, { status: 400 });
  }

  // Payload size check
  const serialized = JSON.stringify(report);
  if (serialized.length > MAX_PAYLOAD_SIZE) {
    return NextResponse.json({ error: "Report too large" }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const shortCode = crypto.randomUUID().slice(0, 8);
  const expiresAt = user
    ? null
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("combat_reports").insert({
    short_code: shortCode,
    encounter_name: (r.encounterName as string) ?? "Encounter",
    report_data: report,
    owner_id: user?.id ?? null,
    campaign_id: typeof campaignId === "string" ? campaignId : null,
    encounter_id: typeof encounterId === "string" ? encounterId : null,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({ shortCode, url: `${origin}/r/${shortCode}` });
}
