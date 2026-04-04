/**
 * translate-monsters-2024-mad.mjs
 *
 * Generates PT-BR translations for SRD 2024 + MAD monsters.
 * Appends to the existing monster-descriptions-pt.json.
 * Uses the local `claude` CLI (no API key needed).
 * Processes monsters in batches of 5, saves after each batch (resume-safe).
 *
 * Usage:
 *   node scripts/translate-monsters-2024-mad.mjs
 *   node scripts/translate-monsters-2024-mad.mjs --from 50   (resume from index 50)
 *   node scripts/translate-monsters-2024-mad.mjs --batch 3   (smaller batches)
 *   node scripts/translate-monsters-2024-mad.mjs --source 2024  (only 2024)
 *   node scripts/translate-monsters-2024-mad.mjs --source mad   (only MAD)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SRD_DIR = join(ROOT, "public/srd");
const OUTPUT_FILE = join(SRD_DIR, "monster-descriptions-pt.json");
const WHITELIST_FILE = join(SRD_DIR, "srd-monster-whitelist.json");

const SECTION_KEYS = [
  "special_abilities",
  "actions",
  "reactions",
  "legendary_actions",
  "lair_actions",
  "regional_effects",
];

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadJson(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

function extractSections(monster) {
  const sections = {};
  for (const key of SECTION_KEYS) {
    if (monster[key]?.length) {
      sections[key] = monster[key].map((a) => ({
        name: a.name,
        desc: a.desc,
        ...(a.attack_bonus !== undefined ? { attack_bonus: a.attack_bonus } : {}),
      }));
    }
  }
  return sections;
}

function buildPrompt(batch) {
  const items = batch.map((m) => ({
    slug: m.slug,
    name: m.name,
    sections: extractSections(m),
  }));

  return `Translate the following D&D 5e monster stat block descriptions from English to Brazilian Portuguese (PT-BR).

Rules:
- Translate all "desc" text values to natural PT-BR
- Keep object keys in English (slug, name, sections, special_abilities, actions, etc.)
- Add a "name_pt" field with the PT-BR name for the creature
- Keep proper nouns (spell names like "phantasmal force", "fireball") in English
- Keep dice notation (2d6, 1d12+5), numbers, distances (ft.) and DC values intact
- Preserve \\n line breaks in descriptions
- Return ONLY a valid JSON array, no markdown fences, no explanation

Input:
${JSON.stringify(items, null, 2)}`;
}

function callClaude(prompt) {
  const result = spawnSync(
    "claude",
    ["--print", "--input-format", "text"],
    {
      cwd: ROOT,
      input: prompt,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
      shell: true,
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`claude exited ${result.status}: ${(result.stderr ?? "").substring(0, 200)}`);
  }
  return result.stdout.trim();
}

function parseResponse(raw) {
  const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(clean);
}

function normalizeSections(sections) {
  const out = {};
  for (const key of SECTION_KEYS) {
    if (sections?.[key]) {
      if (Array.isArray(sections[key])) {
        out[key] = Object.fromEntries(
          sections[key].map((a) => [a.name, a.desc])
        );
      } else {
        out[key] = sections[key];
      }
    } else {
      out[key] = {};
    }
  }
  return out;
}

async function main() {
  // Parse args
  const fromArg = process.argv.indexOf("--from");
  const startIndex = fromArg !== -1 ? parseInt(process.argv[fromArg + 1], 10) : 0;

  const batchArg = process.argv.indexOf("--batch");
  const batchSize = batchArg !== -1 ? parseInt(process.argv[batchArg + 1], 10) : 5;

  const sourceArg = process.argv.indexOf("--source");
  const sourceFilter = sourceArg !== -1 ? process.argv[sourceArg + 1] : "all";

  // Load monsters by source
  const whitelist = new Set(JSON.parse(readFileSync(WHITELIST_FILE, "utf-8")));
  let allMonsters = [];

  if (sourceFilter === "all" || sourceFilter === "2024") {
    const m2024 = JSON.parse(readFileSync(join(SRD_DIR, "monsters-2024.json"), "utf-8"));
    const srd2024 = m2024.filter((m) => whitelist.has(toSlug(m.name)));
    allMonsters.push(...srd2024);
    console.log(`SRD 2024 monsters loaded: ${srd2024.length}`);
  }

  if (sourceFilter === "all" || sourceFilter === "mad") {
    try {
      const mad = JSON.parse(readFileSync(join(SRD_DIR, "monsters-mad.json"), "utf-8"));
      allMonsters.push(...mad);
      console.log(`MAD monsters loaded: ${mad.length}`);
    } catch {
      console.log("No MAD monsters file found, skipping.");
    }
  }

  // Add slugs
  allMonsters = allMonsters.map((m) => ({ ...m, slug: toSlug(m.name) }));

  const existing = loadJson(OUTPUT_FILE);

  console.log(`Total monsters to process: ${allMonsters.length}`);
  console.log(`Already translated: ${Object.keys(existing).length}`);
  console.log(`Source filter: ${sourceFilter}`);
  console.log(`Batch size: ${batchSize} | Starting from index: ${startIndex}\n`);

  let translated = { ...existing };
  let done = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = startIndex; i < allMonsters.length; i += batchSize) {
    const batch = allMonsters.slice(i, i + batchSize);
    const toTranslate = batch.filter((m) => !translated[m.slug]);

    if (toTranslate.length === 0) {
      skipped += batch.length;
      const progress = Math.round(((i + batch.length) / allMonsters.length) * 100);
      process.stdout.write(`\r[${i + batch.length}/${allMonsters.length}] ${progress}% — skipped (already done)   `);
      continue;
    }

    const names = toTranslate.map((m) => m.name).join(", ");
    const progress = Math.round(((i + batch.length) / allMonsters.length) * 100);
    process.stdout.write(`\r[${i + batch.length}/${allMonsters.length}] ${progress}% — ${names.substring(0, 70)}...`);

    try {
      const prompt = buildPrompt(toTranslate);
      const raw = callClaude(prompt);
      const results = parseResponse(raw);

      for (const result of results) {
        const slug = result.slug ?? toSlug(result.name);
        translated[slug] = {
          name: result.name_pt ?? result.name,
          ...normalizeSections(result.sections),
        };
        done++;
      }

      writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
    } catch (err) {
      errors++;
      console.error(`\nERROR on batch [${i}–${i + batchSize}]: ${err.message.substring(0, 200)}`);
      writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
      if (batchSize > 1) {
        console.log("  → Retrying individually...");
        for (const m of toTranslate) {
          if (translated[m.slug]) continue;
          try {
            const raw2 = callClaude(buildPrompt([m]));
            const [result] = parseResponse(raw2);
            translated[m.slug] = {
              name: result.name_pt ?? result.name,
              ...normalizeSections(result.sections),
            };
            done++;
            writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
          } catch (err2) {
            console.error(`  → Failed individually for ${m.name}: ${err2.message.substring(0, 100)}`);
          }
        }
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n\n✓ Done!`);
  console.log(`  Translated this run: ${done}`);
  console.log(`  Skipped (existed):   ${skipped}`);
  console.log(`  Errors:              ${errors}`);
  console.log(`  Total in file:       ${Object.keys(translated).length}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
