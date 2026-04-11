import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) return null;
  return user;
}

const handler: Parameters<typeof withRateLimit>[0] = async function getHandler() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Batch: run independent count queries + RPCs in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [totalResult, last7Result, last30Result, day1Result, week2Result, avgPlayersResult] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("users").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    admin.rpc("admin_day1_activation").single(),
    admin.rpc("admin_week2_retention").single(),
    admin.rpc("admin_avg_players_per_dm").single(),
  ]);

  const totalUsers = totalResult.count ?? 0;

  const day1 = day1Result.data as { total_eligible: number; activated: number } | null;
  const day1Activation = day1 && day1.total_eligible > 0
    ? Math.round((day1.activated / day1.total_eligible) * 100)
    : 0;

  const week2 = week2Result.data as { total_eligible: number; retained: number } | null;
  const week2Retention = week2 && week2.total_eligible > 0
    ? Math.round((week2.retained / week2.total_eligible) * 100)
    : 0;

  const avgPlayers = avgPlayersResult.data as { dm_count: number; avg_players: number } | null;

  // Phase 2: Event-based analytics (funnel, feature usage, combat stats)
  const [funnelResult, topEventsResult, guestFunnelResult, combatStatsResult] = await Promise.all([
    // Funnel: distinct users per event (last 30d)
    admin.rpc("admin_event_funnel", { since: thirtyDaysAgo }),
    // Top 15 events by count (last 30d)
    admin.rpc("admin_top_events", { since: thirtyDaysAgo, lim: 15 }),
    // Guest funnel: guest events (last 30d)
    admin.rpc("admin_guest_funnel", { since: thirtyDaysAgo }),
    // Combat stats: avg rounds, avg duration (last 30d)
    admin.rpc("admin_combat_stats", { since: thirtyDaysAgo }).single(),
  ]);

  // Log Phase 2 RPC errors server-side (non-blocking)
  for (const [name, result] of [
    ["funnel", funnelResult], ["top_events", topEventsResult],
    ["guest_funnel", guestFunnelResult], ["combat_stats", combatStatsResult],
  ] as const) {
    if ((result as { error?: unknown }).error) {
      console.warn(`[admin/metrics] RPC ${name} failed:`, (result as { error: unknown }).error);
    }
  }

  return NextResponse.json({
    data: {
      total_users: totalUsers,
      registrations_last_7d: last7Result.count ?? 0,
      registrations_last_30d: last30Result.count ?? 0,
      day1_activation_pct: day1Activation,
      week2_retention_pct: week2Retention,
      avg_players_per_dm: Number(avgPlayers?.avg_players ?? 0),
      // Phase 2
      funnel: funnelResult.data ?? [],
      top_events: topEventsResult.data ?? [],
      guest_funnel: guestFunnelResult.data ?? [],
      combat_stats: combatStatsResult.data ?? null,
    },
  });
};

export const GET = withRateLimit(handler, { max: 30, window: "15 m" });
