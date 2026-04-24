import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/errors/capture";

/**
 * Vercel Cron — postmortem 2026-04-24 R6.
 *
 * Runs daily at 04:30 UTC (01:30 BRT). Invokes the Supabase function
 * `sweep_stale_session_tokens()` (migration 182) which deletes inactive
 * session_tokens whose `last_seen_at` is older than the threshold (default
 * 21 days — see migration file for rationale).
 *
 * pg_cron is not enabled on the current Supabase plan, so this Vercel Cron
 * shim is the scheduling mechanism. Auth header comes from `CRON_SECRET`
 * env var (same pattern as app/api/cron/ebook-nurturing/route.ts).
 *
 * The function writes an audit row to `error_logs` when rows are deleted,
 * so operators can trace runs via the admin dashboard.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // Call the SECURITY DEFINER function. Supabase RPC returns the integer
    // result directly as `data` when the function returns a scalar.
    const { data, error } = await supabase.rpc("sweep_stale_session_tokens");

    if (error) {
      captureError(error, {
        component: "SweepStaleSessionTokensCron",
        action: "rpc",
        category: "database",
      });
      return NextResponse.json({ error: "RPC failed" }, { status: 500 });
    }

    const deletedCount = typeof data === "number" ? data : 0;

    return NextResponse.json({
      ok: true,
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    captureError(err, {
      component: "SweepStaleSessionTokensCron",
      action: "handler",
      category: "database",
    });
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}
