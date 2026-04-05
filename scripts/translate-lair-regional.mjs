/**
 * translate-lair-regional.mjs
 *
 * Fills in missing lair_actions and regional_effects translations for monsters
 * that already exist in monster-descriptions-pt.json but are missing these sections.
 *
 * Usage:
 *   node scripts/translate-lair-regional.mjs
 *   node scripts/translate-lair-regional.mjs --batch 3
 */

import { readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MONSTERS_FILE = join(ROOT, "public/srd/monsters-2014.json");
const OUTPUT_FILE = join(ROOT, "public/srd/monster-descriptions-pt.json");

const SECTION_KEYS = ["lair_actions", "regional_effects"];

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractSections(monster) {
  const sections = {};
  for (const key of SECTION_KEYS) {
    if (monster[key]?.length) {
      sections[key] = monster[key].map((a) => ({ name: a.name, desc: a.desc }));
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

  return `Translate the following D&D 5e monster lair actions and regional effects from English to Brazilian Portuguese (PT-BR).

Rules:
- Translate all "desc" text values to natural PT-BR
- Keep object keys in English (slug, name, sections, lair_actions, regional_effects, etc.)
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
      input: prompt,
      cwd: ROOT,
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
        out[key] = Object.fromEntries(sections[key].map((a) => [a.name, a.desc]));
      } else {
        out[key] = sections[key];
      }
    }
  }
  return out;
}

async function main() {
  const batchArg = process.argv.indexOf("--batch");
  const batchSize = batchArg !== -1 ? parseInt(process.argv[batchArg + 1], 10) : 5;

  const monsters = JSON.parse(readFileSync(MONSTERS_FILE, "utf-8"));
  const translated = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));

  // Find monsters with lair/regional data that are missing translations
  const toProcess = monsters
    .map((m) => ({ ...m, slug: toSlug(m.name) }))
    .filter((m) => {
      const hasLair = m.lair_actions?.length > 0;
      const hasRegional = m.regional_effects?.length > 0;
      if (!hasLair && !hasRegional) return false;

      const entry = translated[m.slug];
      const lairOk = !hasLair || (entry?.lair_actions && Object.keys(entry.lair_actions).length > 0);
      const regionalOk = !hasRegional || (entry?.regional_effects && Object.keys(entry.regional_effects).length > 0);
      return !lairOk || !regionalOk;
    });

  console.log(`Monsters needing lair/regional translation: ${toProcess.length}`);
  console.log(`Batch size: ${batchSize}\n`);

  let done = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    const names = batch.map((m) => m.name).join(", ");
    const progress = Math.round(((i + batch.length) / toProcess.length) * 100);
    process.stdout.write(`\r[${i + batch.length}/${toProcess.length}] ${progress}% — ${names.substring(0, 70)}...`);

    try {
      const prompt = buildPrompt(batch);
      const raw = callClaude(prompt);
      const results = parseResponse(raw);

      for (const result of results) {
        const slug = result.slug ?? toSlug(result.name);
        const sections = normalizeSections(result.sections);
        // Merge only the new sections into the existing entry
        translated[slug] = { ...translated[slug], ...sections };
        done++;
      }

      writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
    } catch (err) {
      errors++;
      console.error(`\nERROR on batch [${i}–${i + batchSize}]: ${err.message.substring(0, 200)}`);
      writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");

      if (batchSize > 1) {
        console.log("  → Retrying individually...");
        for (const m of batch) {
          try {
            const raw2 = callClaude(buildPrompt([m]));
            const [result] = parseResponse(raw2);
            const sections = normalizeSections(result.sections);
            translated[m.slug] = { ...translated[m.slug], ...sections };
            done++;
            writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
          } catch (err2) {
            console.error(`  → Failed for ${m.name}: ${err2.message.substring(0, 100)}`);
          }
        }
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n\n✓ Done!`);
  console.log(`  Translated this run: ${done}`);
  console.log(`  Errors:              ${errors}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
