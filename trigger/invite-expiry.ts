import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Expire stale campaign invites — runs daily at 05:00 UTC.
 *
 *  Pending invites older than 7 days → status = 'expired'.
 *  DM can re-send (creates a new invite with a fresh token).
 */
export const inviteExpiry = schedules.task({
  id: "invite-expiry",
  cron: "0 5 * * *", // Daily at 05:00 UTC
  run: async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expired, error } = await supabase
      .from("campaign_invites")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo)
      .select("id, campaign_id");

    if (error) {
      logger.error("Failed to expire invites", { error });
      return { expired: 0 };
    }

    logger.info(`Expired ${expired?.length ?? 0} pending invites`);

    return { expired: expired?.length ?? 0 };
  },
});
