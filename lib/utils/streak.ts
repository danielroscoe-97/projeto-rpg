import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Compute the DM's weekly session streak.
 * A streak counts consecutive weeks (Mon-Sun) where the DM finalized at least one encounter.
 * Returns 0 if no encounters or no consecutive weeks.
 */
export async function computeStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  // Single joined query: encounters with their session's owner
  const { data: encounters } = await supabase
    .from("encounters")
    .select("created_at, sessions!inner(owner_id)")
    .eq("sessions.owner_id", userId)
    .eq("is_active", false)
    .order("created_at", { ascending: false });

  if (!encounters || encounters.length === 0) return 0;

  // Get unique weeks (ISO week start = Monday)
  const weekSet = new Set<string>();
  for (const e of encounters) {
    const date = new Date(e.created_at);
    const weekStart = getWeekStart(date);
    weekSet.add(weekStart.toISOString().slice(0, 10));
  }

  const weeks = Array.from(weekSet).sort().reverse(); // most recent first
  if (weeks.length === 0) return 0;

  // Count consecutive weeks from now
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const currentWeekStr = currentWeekStart.toISOString().slice(0, 10);

  // Check if current or previous week has activity (grace period)
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStr = prevWeekStart.toISOString().slice(0, 10);

  const startWeek = weeks.includes(currentWeekStr)
    ? currentWeekStr
    : weeks.includes(prevWeekStr)
    ? prevWeekStr
    : null;

  if (!startWeek) return 0;

  let streak = 0;
  const checkDate = new Date(startWeek);

  for (let i = 0; i < 52; i++) { // max 1 year
    const weekStr = checkDate.toISOString().slice(0, 10);
    if (weeks.includes(weekStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
}

/** Get Monday 00:00 UTC for the week containing the given date */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Move to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
