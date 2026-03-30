import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Cleanup stale sessions — runs daily at 04:00 UTC.
 *
 *  1. Active sessions with no activity for 30+ days → archived
 *  2. Archived sessions older than 90 days → soft deleted
 *  3. Expired session tokens → deleted
 */
export const cleanupSessions = schedules.task({
  id: "cleanup-sessions",
  cron: "0 4 * * *", // Daily at 04:00 UTC
  run: async () => {
    // 1. Archive inactive sessions
    const { data: archived, error: archiveError } = await supabase
      .from("sessions")
      .update({ status: "archived" })
      .eq("status", "active")
      .lt("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .select("id");

    if (archiveError) {
      logger.error("Failed to archive sessions", { error: archiveError });
    } else {
      logger.info(`Archived ${archived?.length ?? 0} inactive sessions`);
    }

    // 2. Soft delete old archived sessions
    const { data: deleted, error: deleteError } = await supabase
      .from("sessions")
      .update({ is_deleted: true })
      .eq("status", "archived")
      .lt("updated_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .select("id");

    if (deleteError) {
      logger.error("Failed to soft-delete sessions", { error: deleteError });
    } else {
      logger.info(`Soft-deleted ${deleted?.length ?? 0} old archived sessions`);
    }

    // 3. Clean up expired session tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("session_tokens")
      .delete()
      .lt("expires_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .select("id");

    if (tokenError) {
      logger.error("Failed to clean tokens", { error: tokenError });
    } else {
      logger.info(`Cleaned ${tokens?.length ?? 0} expired tokens`);
    }

    return {
      archived: archived?.length ?? 0,
      softDeleted: deleted?.length ?? 0,
      tokensCleaned: tokens?.length ?? 0,
    };
  },
});
