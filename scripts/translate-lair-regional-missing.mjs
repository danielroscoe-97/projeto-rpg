/**
 * translate-lair-regional-missing.mjs
 *
 * Fills in missing lair_actions and regional_effects translations
 * (including lair_actions_intro and regional_effects_intro) for monsters
 * that already exist in monster-descriptions-pt.json but are missing these sections.
 *
 * Processes one monster at a time, saving progressively after each.
 *
 * Usage:
 *   node scripts/translate-lair-regional-missing.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MONSTERS_FILE = join(ROOT, "public/srd/monsters-2014.json");
const OUTPUT_FILE = join(ROOT, "public/srd/monster-descriptions-pt.json");

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractLairRegional(monster) {
  const data = {};

  if (monster.lair_actions?.length) {
    data.lair_actions = monster.lair_actions.map((a) => ({
      name: a.name,
      desc: a.desc,
    }));
  }
  if (monster.lair_actions_intro) {
    data.lair_actions_intro = monster.lair_actions_intro;
  }

  if (monster.regional_effects?.length) {
    data.regional_effects = monster.regional_effects.map((a) => ({
      name: a.name,
      desc: a.desc,
    }));
  }
  if (monster.regional_effects_intro) {
    data.regional_effects_intro = monster.regional_effects_intro;
  }

  return data;
}

function buildPrompt(monster) {
  const input = {
    slug: monster.slug,
    name: monster.name,
    ...extractLairRegional(monster),
  };

  return `Translate the following D&D 5e monster lair actions and regional effects from English to Brazilian Portuguese (PT-BR).

Rules:
- Translate all "desc" text values and intro text to natural PT-BR
- Keep object keys in English (slug, name, lair_actions, regional_effects, etc.)
- Keep proper nouns (spell names like "phantasmal force", "fireball") in English
- Keep dice notation (2d6, 1d12+5), numbers, distances (ft.) and DC values intact
- Preserve \\n line breaks in descriptions
- For lair_actions and regional_effects, return them as objects with the action name as key and translated description as value (Record<name, translatedDesc>)
- Include lair_actions_intro and regional_effects_intro as "_intro" keys inside the respective section objects
- Return ONLY a valid JSON object (not an array), no markdown fences, no explanation

Example output format:
{
  "slug": "example-monster",
  "lair_actions": {
    "_intro": "Translated intro text...",
    "Action Name": "Translated action description..."
  },
  "regional_effects": {
    "_intro": "Translated intro text...",
    "Effect Name": "Translated effect description..."
  }
}

Input:
${JSON.stringify(input, null, 2)}`;
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
      // Include monsters even without existing translation entry — they need lair/regional too

      const lairOk =
        !hasLair ||
        (entry?.lair_actions && Object.keys(entry.lair_actions).length > 0);
      const regionalOk =
        !hasRegional ||
        (entry?.regional_effects &&
          Object.keys(entry.regional_effects).length > 0);
      return !lairOk || !regionalOk;
    });

  console.log(`Monsters needing lair/regional translation: ${toProcess.length}`);
  if (toProcess.length === 0) {
    console.log("Nothing to do.");
    return;
  }
  console.log(
    `Monsters: ${toProcess.map((m) => m.slug).join(", ")}\n`
  );

  let done = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const monster = toProcess[i];
    const progress = Math.round(((i + 1) / toProcess.length) * 100);
    process.stdout.write(
      `[${i + 1}/${toProcess.length}] ${progress}% — ${monster.name}...`
    );

    try {
      const prompt = buildPrompt(monster);
      const raw = callClaude(prompt);
      const result = parseResponse(raw);

      // Merge translated lair_actions and regional_effects into existing entry
      const entry = translated[monster.slug] || {};

      if (result.lair_actions) {
        // Keep _intro inside the section map — getDesc() looks for it there
        entry.lair_actions = { ...result.lair_actions };
      }

      if (result.regional_effects) {
        // Keep _intro inside the section map — getDesc() looks for it there
        entry.regional_effects = { ...result.regional_effects };
      }

      translated[monster.slug] = entry;
      done++;

      // Save progressively after each monster
      writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(translated, null, 2),
        "utf-8"
      );
      console.log(` done`);
    } catch (err) {
      errors++;
      console.error(
        `\nERROR for ${monster.name}: ${err.message.substring(0, 200)}`
      );
      // Save what we have and continue
      writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(translated, null, 2),
        "utf-8"
      );
    }

    // Small pause between calls
    if (i < toProcess.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone!`);
  console.log(`  Translated: ${done}`);
  console.log(`  Errors:     ${errors}`);
  console.log(`  Output:     ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
