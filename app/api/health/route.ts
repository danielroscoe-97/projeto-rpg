import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/health — Lightweight health-check for uptime monitors.
 *
 * Checks:
 *  1. Server is alive (implicit — this route responds)
 *  2. Supabase DB is reachable (simple query)
 *
 * Returns 200 if healthy, 503 if degraded.
 */
export async function GET() {
  const start = Date.now();

  const checks: Record<string, { status: "ok" | "fail"; ms?: number; error?: string }> = {
    server: { status: "ok" },
  };

  // --- Supabase connectivity ---
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const dbStart = Date.now();
    const { error } = await supabase.from("analytics_events").select("id").limit(1);
    const dbMs = Date.now() - dbStart;

    if (error) {
      checks.database = { status: "fail", ms: dbMs, error: error.message };
    } else {
      checks.database = { status: "ok", ms: dbMs };
    }
  } catch (e) {
    checks.database = { status: "fail", error: e instanceof Error ? e.message : "unknown" };
  }

  const totalMs = Date.now() - start;
  const healthy = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseMs: totalMs,
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
