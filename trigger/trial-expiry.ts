import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { Novu } from "@novu/node";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const novu = new Novu(process.env.NOVU_API_KEY!);

/** Check trial expirations — runs daily at 08:00 UTC.
 *
 *  1. Trials expiring in 3 days → send warning notification
 *  2. Expired trials → update status, revoke pro features
 */
export const trialExpiry = schedules.task({
  id: "trial-expiry",
  cron: "0 8 * * *", // Daily at 08:00 UTC
  run: async () => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // 1. Trials expiring in 3 days — send warning
    const { data: expiringSoon } = await supabase
      .from("subscriptions")
      .select("id, user_id, trial_ends_at")
      .eq("status", "trial")
      .gt("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", threeDaysFromNow.toISOString());

    let notified = 0;
    for (const sub of expiringSoon ?? []) {
      const daysLeft = Math.ceil(
        (new Date(sub.trial_ends_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
      if (!userData?.user?.email) continue;

      try {
        await novu.trigger("trial-expiry-warning", {
          to: { subscriberId: sub.user_id, email: userData.user.email },
          payload: {
            days: daysLeft,
            name: userData.user.user_metadata?.display_name ?? "DM",
          },
        });
        notified++;
      } catch (err) {
        logger.warn(`Failed to notify user ${sub.user_id}`, { error: err });
      }
    }

    // 2. Expired trials — update status
    const { data: expired } = await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("status", "trial")
      .lt("trial_ends_at", now.toISOString())
      .select("id, user_id");

    // Notify expired users
    for (const sub of expired ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
      if (!userData?.user?.email) continue;

      try {
        await novu.trigger("trial-expired", {
          to: { subscriberId: sub.user_id, email: userData.user.email },
          payload: {
            name: userData.user.user_metadata?.display_name ?? "DM",
          },
        });
      } catch {
        // Non-critical
      }
    }

    logger.info(`Trial expiry: ${notified} warned, ${expired?.length ?? 0} expired`);

    return {
      warned: notified,
      expired: expired?.length ?? 0,
    };
  },
});
