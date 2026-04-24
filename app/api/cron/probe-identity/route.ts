import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/errors/capture";

/**
 * Vercel Cron — postmortem 2026-04-24 observability.
 *
 * Runs daily at 09:00 UTC (06:00 BRT). Invokes the Supabase function
 * `probe_identity_accumulation()` (migration 183) which counts anon users
 * and session_tokens, writes an info-level audit row to `error_logs`, and
 * returns the counts.
 *
 * First 21 days: log-only (no threshold). This builds a baseline series.
 * After baseline, add a threshold-based Slack alert by comparing today's
 * row to the 7-day median via SQL — the probe itself doesn't change.
 *
 * Auth: `Bearer ${CRON_SECRET}` (same pattern as sibling cron routes).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase.rpc("probe_identity_accumulation");

    if (error) {
      captureError(error, {
        component: "probe_identity_accumulation",
        action: "rpc",
        category: "database",
      });
      return NextResponse.json({ error: "RPC failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      counts: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    captureError(err, {
      component: "probe_identity_accumulation",
      action: "handler",
      category: "database",
    });
    return NextResponse.json({ error: "Probe failed" }, { status: 500 });
  }
}
