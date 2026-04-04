/**
 * translate-spells.mjs
 *
 * Generates spell-descriptions-pt.json for all SRD spells (2014 + 2024)
 * using the local `claude` CLI (no API key needed).
 * Processes spells in batches of 5, saves after each batch (resume-safe).
 *
 * Usage:
 *   node scripts/translate-spells.mjs
 *   node scripts/translate-spells.mjs --from 50   (resume from index 50)
 *   node scripts/translate-spells.mjs --batch 3   (smaller batches if issues)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SRD_DIR = join(ROOT, "public/srd");
const OUTPUT_FILE = join(SRD_DIR, "spell-descriptions-pt.json");
const WHITELIST_FILE = join(SRD_DIR, "srd-spell-whitelist.json");

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

function buildPrompt(batch) {
  const items = batch.map((s) => ({
    slug: s.slug,
    name: s.name,
    description: s.description,
    higher_levels: s.higher_levels || null,
  }));

  return `Translate the following D&D 5e spell descriptions from English to Brazilian Portuguese (PT-BR).

Rules:
- Translate "description" and "higher_levels" to natural PT-BR
- Add a "name_pt" field with the PT-BR name for the spell
- Keep object keys in English (slug, name, description, higher_levels)
- Keep proper nouns (creature names, specific spell names) in English
- Keep dice notation (2d6, 1d12+5), numbers, distances (feet/ft.) and DC values intact
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

async function main() {
  // Parse args
  const fromArg = process.argv.indexOf("--from");
  const startIndex = fromArg !== -1 ? parseInt(process.argv[fromArg + 1], 10) : 0;

  const batchArg = process.argv.indexOf("--batch");
  const batchSize = batchArg !== -1 ? parseInt(process.argv[batchArg + 1], 10) : 5;

  // Load all spells from both rulesets
  const s2014 = JSON.parse(readFileSync(join(SRD_DIR, "spells-2014.json"), "utf-8"));
  const s2024 = JSON.parse(readFileSync(join(SRD_DIR, "spells-2024.json"), "utf-8"));

  // Filter by whitelist (SRD compliance)
  const whitelist = new Set(JSON.parse(readFileSync(WHITELIST_FILE, "utf-8")));
  const allSpells = [...s2014, ...s2024]
    .filter((s) => whitelist.has(toSlug(s.name)))
    .map((s) => ({ ...s, slug: toSlug(s.name) }));

  const existing = loadJson(OUTPUT_FILE);

  console.log(`Total SRD spells (2014+2024): ${allSpells.length}`);
  console.log(`Already translated: ${Object.keys(existing).length}`);
  console.log(`Batch size: ${batchSize} | Starting from index: ${startIndex}\n`);

  let translated = { ...existing };
  let done = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = startIndex; i < allSpells.length; i += batchSize) {
    const batch = allSpells.slice(i, i + batchSize);

    const toTranslate = batch.filter((s) => !translated[s.slug]);

    if (toTranslate.length === 0) {
      skipped += batch.length;
      const progress = Math.round(((i + batch.length) / allSpells.length) * 100);
      process.stdout.write(`\r[${i + batch.length}/${allSpells.length}] ${progress}% — skipped (already done)   `);
      continue;
    }

    const names = toTranslate.map((s) => s.name).join(", ");
    const progress = Math.round(((i + batch.length) / allSpells.length) * 100);
    process.stdout.write(`\r[${i + batch.length}/${allSpells.length}] ${progress}% — ${names.substring(0, 70)}...`);

    try {
      const prompt = buildPrompt(toTranslate);
      const raw = callClaude(prompt);
      const results = parseResponse(raw);

      for (const result of results) {
        const slug = result.slug ?? toSlug(result.name);
        translated[slug] = {
          name_pt: result.name_pt ?? result.name,
          description: result.description,
          higher_levels: result.higher_levels || null,
        };
        done++;
      }

      writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
    } catch (err) {
      errors++;
      console.error(`\nERROR on batch [${i}–${i + batchSize}]: ${err.message.substring(0, 200)}`);
      writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
      // Retry individually
      if (batchSize > 1) {
        console.log("  → Retrying individually...");
        for (const s of toTranslate) {
          if (translated[s.slug]) continue;
          try {
            const raw2 = callClaude(buildPrompt([s]));
            const [result] = parseResponse(raw2);
            translated[s.slug] = {
              name_pt: result.name_pt ?? result.name,
              description: result.description,
              higher_levels: result.higher_levels || null,
            };
            done++;
            writeFileSync(OUTPUT_FILE, JSON.stringify(translated, null, 2), "utf-8");
          } catch (err2) {
            console.error(`  → Failed individually for ${s.name}: ${err2.message.substring(0, 100)}`);
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
