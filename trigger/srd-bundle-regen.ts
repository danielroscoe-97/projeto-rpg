import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Regenerate SRD bundles — triggered manually after admin content edits.
 *
 *  Fetches all monsters/spells from the DB, generates fresh JSON bundles,
 *  and broadcasts a content:update event to connected clients.
 *
 *  NOTE: In production, bundles live in /public/srd/ and are deployed with Vercel.
 *  This job is meant to trigger a Vercel redeploy or upload to a CDN bucket.
 *  For now, it logs the bundle sizes and broadcasts the update event.
 */
export const srdBundleRegen = task({
  id: "srd-bundle-regen",
  run: async (payload: { editedEntity: "monsters" | "spells"; version: "2014" | "2024" }) => {
    const { editedEntity, version } = payload;

    logger.info(`Regenerating ${editedEntity}-${version} bundle`);

    if (editedEntity === "monsters") {
      const { data: monsters, error } = await supabase
        .from("srd_monsters")
        .select("*")
        .eq("ruleset_version", version);

      if (error) {
        logger.error("Failed to fetch monsters", { error });
        throw error;
      }

      const bundleSize = JSON.stringify(monsters).length;
      logger.info(`Monsters bundle: ${monsters?.length ?? 0} entries, ${(bundleSize / 1024).toFixed(0)} KB`);

      // TODO: Upload to Vercel Blob or trigger redeploy
      // For now, broadcast update event
    }

    if (editedEntity === "spells") {
      const { data: spells, error } = await supabase
        .from("srd_spells")
        .select("*")
        .eq("ruleset_version", version);

      if (error) {
        logger.error("Failed to fetch spells", { error });
        throw error;
      }

      const bundleSize = JSON.stringify(spells).length;
      logger.info(`Spells bundle: ${spells?.length ?? 0} entries, ${(bundleSize / 1024).toFixed(0)} KB`);
    }

    // Broadcast content:update to active Realtime channels
    // This will cause connected clients to invalidate their IndexedDB cache
    const channel = supabase.channel("content-updates");
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "content:update",
            payload: { entity: editedEntity, version, timestamp: Date.now() },
          });
          resolve();
        }
      });
    });

    // Cleanup channel
    supabase.removeChannel(channel);

    logger.info(`SRD bundle regen complete: ${editedEntity}-${version}`);

    return { entity: editedEntity, version, status: "complete" };
  },
});
