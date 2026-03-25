#!/usr/bin/env ts-node
/**
 * generate-srd-bundles.ts
 * Exports monsters, spells, and conditions from Supabase to /public/srd/*.json
 * Run: npx ts-node scripts/generate-srd-bundles.ts
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Database } from "../lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OUTPUT_DIR = join(process.cwd(), "public", "srd");

// ── DB → Client field mapping ──────────────────────────────────────
// The DB uses: hp, ac, challenge_rating
// The client (SrdMonster) expects: hit_points, armor_class, cr
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMonster(row: any) {
  const { hp, ac, challenge_rating, ...rest } = row;
  return {
    ...rest,
    hit_points: hp,
    armor_class: ac,
    cr: String(challenge_rating),
  };
}

async function fetchAll(
  tableName: "monsters" | "spells",
  version: "2014" | "2024"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const PAGE_SIZE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("ruleset_version", version)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${tableName} v${version}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const version of ["2014", "2024"] as const) {
    console.log(`Fetching monsters (${version})...`);
    const rawMonsters = await fetchAll("monsters", version);
    const monsters = rawMonsters.map(mapMonster);
    writeFileSync(
      join(OUTPUT_DIR, `monsters-${version}.json`),
      JSON.stringify(monsters, null, 2)
    );
    console.log(`  ${monsters.length} monsters written`);

    console.log(`Fetching spells (${version})...`);
    const spells = await fetchAll("spells", version);
    writeFileSync(
      join(OUTPUT_DIR, `spells-${version}.json`),
      JSON.stringify(spells, null, 2)
    );
    console.log(`  ${spells.length} spells written`);
  }

  console.log("Fetching conditions...");
  const { data: conditions, error: condErr } = await supabase
    .from("condition_types")
    .select("*")
    .order("name");

  if (condErr) throw new Error(`conditions: ${condErr.message}`);
  writeFileSync(
    join(OUTPUT_DIR, "conditions.json"),
    JSON.stringify(conditions, null, 2)
  );
  console.log(`  ${conditions?.length ?? 0} conditions written`);

  console.log("\nDone. Files written to public/srd/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
