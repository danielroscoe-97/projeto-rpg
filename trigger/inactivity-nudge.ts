import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { sendInactivityEmail } from "@/lib/notifications/inactivity-email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Inactivity nudge emails — runs daily at 14:00 UTC (11:00 BRT).
 *
 * Checks for users who signed up D+3 or D+7 ago and have no campaigns or sessions.
 * Sends a gentle nudge email encouraging them to start using PocketDM.
 *
 * STANDBY: Feature-flagged via ENABLE_INACTIVITY_EMAILS env var.
 */
export const inactivityNudge = schedules.task({
  id: "inactivity-nudge",
  cron: "0 14 * * *", // Daily at 14:00 UTC
  run: async () => {
    // Feature flag: disabled by default
    if (process.env.ENABLE_INACTIVITY_EMAILS !== "true") {
      logger.info("Inactivity emails disabled (ENABLE_INACTIVITY_EMAILS !== 'true')");
      return { skipped: true, d3: 0, d7: 0 };
    }

    let d3Sent = 0;
    let d7Sent = 0;

    // D+3 window: users created between 3.5 and 2.5 days ago
    const d3Start = new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString();
    const d3End = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString();
    d3Sent = await sendNudges(d3Start, d3End, "d3");

    // D+7 window: users created between 7.5 and 6.5 days ago
    const d7Start = new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000).toISOString();
    const d7End = new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString();
    d7Sent = await sendNudges(d7Start, d7End, "d7");

    logger.info(`Inactivity nudges sent: D+3=${d3Sent}, D+7=${d7Sent}`);
    return { d3: d3Sent, d7: d7Sent };
  },
});

async function sendNudges(
  windowStart: string,
  windowEnd: string,
  variant: "d3" | "d7"
): Promise<number> {
  // Find users created in the window who have NO campaigns AND NO sessions
  const { data: users, error } = await supabase
    .from("users")
    .select("id, display_name, email")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd);

  if (error || !users) {
    logger.error(`Failed to query users for ${variant}`, { error });
    return 0;
  }

  let sent = 0;
  for (const user of users) {
    if (!user.email) continue;

    // Check if user has any campaigns
    const { count: campaignCount } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if ((campaignCount ?? 0) > 0) continue;

    // Check if user has any sessions (DM'd any combat)
    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if ((sessionCount ?? 0) > 0) continue;

    try {
      await sendInactivityEmail({
        email: user.email,
        displayName: user.display_name ?? user.email.split("@")[0],
        variant,
      });
      sent++;
    } catch {
      logger.warn(`Failed to send ${variant} nudge to ${user.id}`);
    }
  }

  return sent;
}
