import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Aggregate daily analytics — runs daily at 03:00 UTC.
 *
 *  Reads raw analytics_events from the previous day,
 *  computes metrics, and inserts into analytics_daily.
 *  Optionally prunes raw events older than 90 days.
 */
export const analyticsAggregation = schedules.task({
  id: "analytics-aggregation",
  cron: "0 3 * * *", // Daily at 03:00 UTC
  run: async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    // Fetch raw events for yesterday
    const { data: events, error: fetchError } = await supabase
      .from("analytics_events")
      .select("event_type, user_id")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (fetchError) {
      logger.error("Failed to fetch analytics events", { error: fetchError });
      return { date: dateStr, error: fetchError.message };
    }

    if (!events || events.length === 0) {
      logger.info(`No events for ${dateStr}`);
      return { date: dateStr, dau: 0 };
    }

    // Compute metrics
    const uniqueUsers = new Set(events.filter((e) => e.user_id).map((e) => e.user_id));
    const countByType = (type: string) => events.filter((e) => e.event_type === type).length;

    const metrics = {
      date: dateStr,
      dau: uniqueUsers.size,
      sessions_created: countByType("session:created"),
      combats_started: countByType("combat:started"),
      players_joined: countByType("player:joined"),
      signups: countByType("auth:signup"),
      guest_conversions: countByType("guest:converted"),
    };

    // Upsert into analytics_daily
    const { error: upsertError } = await supabase
      .from("analytics_daily")
      .upsert(metrics, { onConflict: "date" });

    if (upsertError) {
      logger.error("Failed to upsert analytics_daily", { error: upsertError });
      return { date: dateStr, error: upsertError.message };
    }

    // Prune raw events older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pruned } = await supabase
      .from("analytics_events")
      .delete()
      .lt("created_at", ninetyDaysAgo)
      .select("id");

    logger.info(`Aggregated ${dateStr}: DAU=${metrics.dau}, pruned=${pruned?.length ?? 0} old events`);

    return { ...metrics, pruned: pruned?.length ?? 0 };
  },
});
