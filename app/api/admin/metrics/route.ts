import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) return null;
  return user;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Total registrations
  const { count: totalUsers } = await admin
    .from("users")
    .select("id", { count: "exact", head: true });

  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: last7 } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // Last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: last30 } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);

  // Day-1 activation: % of users who created a session within 24h of signup
  // Uses SQL aggregation via COUNT to avoid loading all rows into memory
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { count: activatedCount } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .filter(
      "id",
      "in",
      `(select owner_id from sessions where created_at <= users.created_at + interval '1 day')`
    )
    .lt("created_at", oneDayAgo); // Only users old enough to have a day-1 window

  const day1Activation =
    (totalUsers ?? 0) > 0
      ? Math.round(((activatedCount ?? 0) / (totalUsers ?? 1)) * 100)
      : 0;

  // Week-2 retention: % of users who had a session between day 7 and day 14 after signup
  const { count: retainedCount } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .filter(
      "id",
      "in",
      `(select owner_id from sessions where created_at >= users.created_at + interval '7 days' and created_at <= users.created_at + interval '14 days')`
    )
    .lt("created_at", new Date(Date.now() - 14 * 86400000).toISOString());

  const week2Retention =
    (totalUsers ?? 0) > 0
      ? Math.round(((retainedCount ?? 0) / (totalUsers ?? 1)) * 100)
      : 0;

  // Average players per DM: count unique player tokens (anon_user_id) per DM's sessions
  const { data: tokenCounts } = await admin
    .from("session_tokens")
    .select("anon_user_id, sessions!inner(owner_id)")
    .not("anon_user_id", "is", null);
  const dmPlayers = new Map<string, Set<string>>();
  if (tokenCounts) {
    for (const t of tokenCounts) {
      const ownerId = (t.sessions as unknown as { owner_id: string })?.owner_id;
      if (ownerId && t.anon_user_id) {
        if (!dmPlayers.has(ownerId)) dmPlayers.set(ownerId, new Set());
        // Count unique players (anon_user_id), not sessions
        dmPlayers.get(ownerId)!.add(t.anon_user_id);
      }
    }
  }
  const dmCount = dmPlayers.size;
  const totalPlayerCount = Array.from(dmPlayers.values()).reduce((sum, s) => sum + s.size, 0);
  const avgPlayersPerDm = dmCount > 0 ? Math.round((totalPlayerCount / dmCount) * 10) / 10 : 0;

  return NextResponse.json({
    data: {
      total_users: totalUsers ?? 0,
      registrations_last_7d: last7 ?? 0,
      registrations_last_30d: last30 ?? 0,
      day1_activation_pct: day1Activation,
      week2_retention_pct: week2Retention,
      avg_players_per_dm: avgPlayersPerDm,
    },
  });
}
