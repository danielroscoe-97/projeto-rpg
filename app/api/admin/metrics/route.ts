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

  // Day-1 activation: users who created a session within 24h of signup
  const { data: allUsers } = await admin
    .from("users")
    .select("id, created_at");
  const { data: allSessions } = await admin
    .from("sessions")
    .select("owner_id, created_at");

  let activatedCount = 0;
  const userCount = allUsers?.length ?? 0;
  if (allUsers && allSessions) {
    for (const u of allUsers) {
      const userCreated = new Date(u.created_at).getTime();
      const hasSession = allSessions.some(
        (s) =>
          s.owner_id === u.id &&
          new Date(s.created_at).getTime() - userCreated <= 86400000
      );
      if (hasSession) activatedCount++;
    }
  }
  const day1Activation = userCount > 0 ? Math.round((activatedCount / userCount) * 100) : 0;

  // Week-2 retention: users who created a session >7 days after signup
  let retainedCount = 0;
  if (allUsers && allSessions) {
    for (const u of allUsers) {
      const userCreated = new Date(u.created_at).getTime();
      const hasLateSession = allSessions.some(
        (s) =>
          s.owner_id === u.id &&
          new Date(s.created_at).getTime() - userCreated >= 7 * 86400000 &&
          new Date(s.created_at).getTime() - userCreated <= 14 * 86400000
      );
      if (hasLateSession) retainedCount++;
    }
  }
  const week2Retention = userCount > 0 ? Math.round((retainedCount / userCount) * 100) : 0;

  // Average players per DM
  const { data: tokenCounts } = await admin
    .from("session_tokens")
    .select("session_id, sessions!inner(owner_id)");
  const dmPlayers = new Map<string, Set<string>>();
  if (tokenCounts) {
    for (const t of tokenCounts) {
      const ownerId = (t.sessions as unknown as { owner_id: string })?.owner_id;
      if (ownerId) {
        if (!dmPlayers.has(ownerId)) dmPlayers.set(ownerId, new Set());
        dmPlayers.get(ownerId)!.add(t.session_id);
      }
    }
  }
  const dmCount = dmPlayers.size;
  const totalPlayers = Array.from(dmPlayers.values()).reduce((sum, s) => sum + s.size, 0);
  const avgPlayersPerDm = dmCount > 0 ? Math.round((totalPlayers / dmCount) * 10) / 10 : 0;

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
