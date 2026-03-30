import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Cleanup anonymous guest users — runs daily at 04:30 UTC.
 *
 *  Supabase creates auth.users entries for anonymous sign-ins.
 *  Clean up anonymous users with no active session tokens and
 *  inactive for 7+ days via the Admin API.
 */
export const cleanupGuestData = schedules.task({
  id: "cleanup-guest-data",
  cron: "30 4 * * *", // Daily at 04:30 UTC
  run: async () => {
    // List anonymous users via Admin API
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      logger.error("Failed to list users", { error: listError });
      return { cleaned: 0 };
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Filter anonymous users inactive for 7+ days
    const staleAnonymous = (usersData.users ?? []).filter((u) => {
      if (!u.is_anonymous) return false;
      const lastActivity = new Date(u.last_sign_in_at ?? u.created_at);
      return lastActivity < sevenDaysAgo;
    });

    let cleaned = 0;

    for (const user of staleAnonymous) {
      // Check for active session tokens
      const { data: activeTokens } = await supabase
        .from("session_tokens")
        .select("id")
        .eq("player_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (activeTokens && activeTokens.length > 0) {
        continue; // Skip — still has active sessions
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        logger.warn(`Failed to delete anonymous user ${user.id}`, { error: deleteError });
      } else {
        cleaned++;
      }
    }

    logger.info(`Cleaned ${cleaned} anonymous users (${staleAnonymous.length} candidates)`);

    return { candidates: staleAnonymous.length, cleaned };
  },
});
