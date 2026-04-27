/**
 * Apply migration 185 (hit_dice backfill) via Supabase JS.
 *
 * The canonical migration runner is `supabase db push` via the Supabase
 * CLI, but the CLI + Docker Desktop are not always on agent PATHs. For
 * pure DML migrations like this one (UPDATE with row-computed SET) we
 * can re-express the SQL as PostgREST calls using the service-role key.
 *
 * Migration source of truth: `supabase/migrations/185_backfill_hit_dice_and_sync_class_resources.sql`
 *
 * SQL behaviour we re-implement:
 *
 *   UPDATE player_characters
 *      SET hit_dice = jsonb_build_object('max', level, 'used', 0)
 *    WHERE (hit_dice IS NULL
 *           OR hit_dice = '{"max":0,"used":0}'::jsonb
 *           OR hit_dice = '{"max": 0, "used": 0}'::jsonb)
 *      AND level IS NOT NULL
 *      AND level > 0;
 *
 * Idempotent: a second run finds zero matching rows because the first
 * run replaced the sentinel with `{max: <level>, used: 0}`.
 *
 * See `docs/supabase-migration-runner.md` for the broader pattern.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — load .env.local first.",
  );
}

const SENTINEL_A = { max: 0, used: 0 };
const SENTINEL_B = JSON.stringify(SENTINEL_A);

function isSentinel(hd: unknown): boolean {
  if (hd === null || hd === undefined) return true;
  if (typeof hd === "object") {
    const obj = hd as { max?: number; used?: number };
    return obj.max === 0 && obj.used === 0;
  }
  if (typeof hd === "string") return hd === SENTINEL_B;
  return false;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const s = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Connecting to ${SUPABASE_URL}`);
  console.log(`Mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY"}`);

  // PostgREST filter for "level > 0 AND level IS NOT NULL". The hit_dice
  // sentinel match is a JS-side filter because PostgREST jsonb equality
  // on object columns is fiddly across versions and we want the same
  // behaviour as the SQL `OR hit_dice IS NULL OR hit_dice = '...'::jsonb`
  // sentinel set.
  const { data: candidates, error: selectError } = await s
    .from("player_characters")
    .select("id, name, level, hit_dice")
    .gt("level", 0);

  if (selectError) {
    console.error("Select failed:", selectError);
    process.exit(1);
  }

  const targets = (candidates ?? []).filter((row) => isSentinel(row.hit_dice));

  console.log(
    `Candidates with level > 0: ${candidates?.length ?? 0}. Sentinel hit_dice (will backfill): ${targets.length}.`,
  );

  if (targets.length === 0) {
    console.log(
      "Nothing to do — every level>0 row already has a non-sentinel hit_dice. Migration is a no-op (or already applied).",
    );
    return;
  }

  if (dryRun) {
    console.log("\nWould update these rows:");
    for (const row of targets) {
      console.log(
        `  - ${row.id} · ${row.name} (lv ${row.level}) → hit_dice = {max: ${row.level}, used: 0}`,
      );
    }
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const row of targets) {
    const payload = { max: row.level, used: 0 };
    const { error } = await s
      .from("player_characters")
      .update({ hit_dice: payload })
      .eq("id", row.id);
    if (error) {
      failed += 1;
      console.error(`  FAIL ${row.id} (${row.name}):`, error.message);
    } else {
      ok += 1;
      console.log(
        `  ok   ${row.id} (${row.name}) → ${payload.max}/${payload.max}`,
      );
    }
  }

  console.log(`\nDone. ${ok} updated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
