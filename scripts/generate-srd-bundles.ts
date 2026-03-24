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

async function fetchAll<T>(
  tableName: "monsters" | "spells",
  version: "2014" | "2024"
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const rows: T[] = [];
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

    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching monsters (2014)...");
  const monsters2014 = await fetchAll("monsters", "2014");
  writeFileSync(
    join(OUTPUT_DIR, "monsters-2014.json"),
    JSON.stringify(monsters2014, null, 2)
  );
  console.log(`  ${monsters2014.length} monsters written`);

  console.log("Fetching monsters (2024)...");
  const monsters2024 = await fetchAll("monsters", "2024");
  writeFileSync(
    join(OUTPUT_DIR, "monsters-2024.json"),
    JSON.stringify(monsters2024, null, 2)
  );
  console.log(`  ${monsters2024.length} monsters written`);

  console.log("Fetching spells (2014)...");
  const spells2014 = await fetchAll("spells", "2014");
  writeFileSync(
    join(OUTPUT_DIR, "spells-2014.json"),
    JSON.stringify(spells2014, null, 2)
  );
  console.log(`  ${spells2014.length} spells written`);

  console.log("Fetching spells (2024)...");
  const spells2024 = await fetchAll("spells", "2024");
  writeFileSync(
    join(OUTPUT_DIR, "spells-2024.json"),
    JSON.stringify(spells2024, null, 2)
  );
  console.log(`  ${spells2024.length} spells written`);

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
