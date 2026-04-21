// scripts/validate-srd-monster-whitelist-sync.ts
//
// Epic 04 Sprint 1 follow-up — keep `data/srd/srd-monster-whitelist.json`
// in lock-step with the `srd_monster_slugs` table seeded in migration
// 167. The table is the runtime enforcement point (trigger
// validate_template_monsters_srd); the JSON is the build-time source of
// truth (scripts/filter-srd-public.ts). If they drift, either the trigger
// rejects legitimate SRD slugs OR the trigger accepts slugs that
// shouldn't be public.
//
// What this script checks
// ───────────────────────
//   1. Parse data/srd/srd-monster-whitelist.json → Set<string>.
//   2. Extract the INSERT seed block from migration 167 → Set<string>.
//   3. Diff. Report:
//        - Slugs in JSON but not in migration seed (migration is STALE —
//          someone added to the JSON, forgot to sync the SQL seed).
//        - Slugs in migration seed but not in JSON (someone trimmed the
//          JSON, forgot to drop the seed entry — runtime would accept
//          a slug that's no longer SRD).
//   4. Exit non-zero on any mismatch. Stdout is JSON-printable for CI.
//
// Run: `npx tsx scripts/validate-srd-monster-whitelist-sync.ts`
// CI: wire into `npm run validate:migrations` or similar.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const JSON_PATH = join(ROOT, "data/srd/srd-monster-whitelist.json");
const MIGRATION_PATH = join(
  ROOT,
  "supabase/migrations/167_campaign_templates.sql",
);

function readJsonSlugs(): Set<string> {
  const raw = readFileSync(JSON_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${JSON_PATH} is not a JSON array`);
  }
  const out = new Set<string>();
  for (const entry of parsed) {
    if (typeof entry !== "string") {
      throw new Error(`${JSON_PATH} contains a non-string entry`);
    }
    out.add(entry);
  }
  return out;
}

function readMigrationSlugs(): Set<string> {
  const raw = readFileSync(MIGRATION_PATH, "utf8");
  // Grab everything between the INSERT and the ON CONFLICT terminator
  // for srd_monster_slugs.
  const startMarker = "INSERT INTO srd_monster_slugs (slug) VALUES";
  const endMarker = "ON CONFLICT (slug) DO NOTHING";
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Could not locate srd_monster_slugs INSERT block in ${MIGRATION_PATH}`,
    );
  }
  const block = raw.slice(startIdx + startMarker.length, endIdx);
  // Each entry is ('slug'). Extract via regex; tolerate whitespace/newlines.
  const re = /\(\s*'([^']+)'\s*\)/g;
  const out = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    out.add(match[1]);
  }
  return out;
}

function diff(
  jsonSlugs: Set<string>,
  migrationSlugs: Set<string>,
): { missingFromMigration: string[]; missingFromJson: string[] } {
  const missingFromMigration: string[] = [];
  const missingFromJson: string[] = [];
  for (const s of jsonSlugs) {
    if (!migrationSlugs.has(s)) missingFromMigration.push(s);
  }
  for (const s of migrationSlugs) {
    if (!jsonSlugs.has(s)) missingFromJson.push(s);
  }
  missingFromMigration.sort();
  missingFromJson.sort();
  return { missingFromMigration, missingFromJson };
}

function main(): number {
  const jsonSlugs = readJsonSlugs();
  const migrationSlugs = readMigrationSlugs();
  const { missingFromMigration, missingFromJson } = diff(
    jsonSlugs,
    migrationSlugs,
  );

  const report = {
    json_path: JSON_PATH,
    migration_path: MIGRATION_PATH,
    json_count: jsonSlugs.size,
    migration_count: migrationSlugs.size,
    in_sync: missingFromMigration.length === 0 && missingFromJson.length === 0,
    missing_from_migration: missingFromMigration,
    missing_from_json: missingFromJson,
  };

  // One line of human-readable summary, then JSON on stdout for CI.
  if (report.in_sync) {
    process.stderr.write(
      `OK — srd_monster_slugs (migration 167) matches srd-monster-whitelist.json (${jsonSlugs.size} slugs)\n`,
    );
  } else {
    process.stderr.write(
      `DRIFT — srd_monster_slugs vs srd-monster-whitelist.json are out of sync\n`,
    );
    if (missingFromMigration.length > 0) {
      process.stderr.write(
        `  + ${missingFromMigration.length} slug(s) in JSON but not in migration seed (migration is STALE)\n`,
      );
    }
    if (missingFromJson.length > 0) {
      process.stderr.write(
        `  + ${missingFromJson.length} slug(s) in migration seed but not in JSON (JSON is STALE or migration has extras)\n`,
      );
    }
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");

  return report.in_sync ? 0 : 1;
}

process.exitCode = main();
