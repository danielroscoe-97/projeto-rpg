#!/usr/bin/env ts-node
/**
 * classify-srd-content.ts
 *
 * Adds `is_srd: boolean` field to monster and spell JSON bundles.
 * Uses source book as primary classifier:
 *   - Monsters: MM source → srd (conservative; refine with exact SRD 5.1 list)
 *   - Spells: PHB source → srd
 *   - Everything else → non-srd
 *
 * Also maintains a deny-list of known non-SRD monsters that appear in MM
 * (e.g. Beholder, Mind Flayer — these are WotC IP even though they're in the MM).
 *
 * Run: npx ts-node scripts/classify-srd-content.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SRD_DIR = join(process.cwd(), "public", "srd");

// ── Known non-SRD monsters from the MM ──────────────────────────
// These monsters appear in the Monster Manual but are NOT in the SRD 5.1.
// This is the "deny list" approach: MM monsters minus this list = SRD.
const NON_SRD_MM_MONSTERS = new Set([
  // Beholder family
  "Beholder",
  "Death Tyrant",
  "Spectator",
  "Beholder Zombie",
  // Mind Flayer family
  "Mind Flayer",
  "Intellect Devourer",
  "Mind Flayer Arcanist",
  // Displacer Beast
  "Displacer Beast",
  // Githyanki/Githzerai
  "Githyanki Warrior",
  "Githyanki Knight",
  "Githzerai Monk",
  "Githzerai Zerth",
  // Yuan-ti
  "Yuan-ti Pureblood",
  "Yuan-ti Malison",
  "Yuan-ti Abomination",
  "Yuan-ti Anathema",
  // Carrion Crawler
  "Carrion Crawler",
  // Umber Hulk
  "Umber Hulk",
  // Slaadi
  "Red Slaad",
  "Blue Slaad",
  "Green Slaad",
  "Gray Slaad",
  "Death Slaad",
  // Kuo-Toa
  "Kuo-toa",
  "Kuo-toa Archpriest",
  "Kuo-toa Whip",
  // Other non-SRD MM
  "Grell",
  "Hook Horror",
  "Modron Duodrone",
  "Modron Monodrone",
  "Modron Tridrone",
  "Modron Quadrone",
  "Modron Pentadrone",
  "Piercer",
  "Quaggoth",
  "Quaggoth Spore Servant",
  "Thri-kreen",
]);

// ── SRD source books ────────────────────────────────────────────
// Primary sources that contain SRD content
const SRD_MONSTER_SOURCES = new Set(["MM", "XMM"]);
const SRD_SPELL_SOURCES = new Set(["PHB", "XPHB"]);

// ── Known non-SRD spells from PHB ───────────────────────────────
// Most PHB spells are in the SRD, but a few aren't
const NON_SRD_PHB_SPELLS = new Set<string>([
  // The actual SRD 5.1 spell list covers most PHB spells.
  // Refine this list as needed with exact non-SRD PHB spells.
]);

interface JsonEntry {
  name: string;
  source?: string;
  is_srd?: boolean;
  [key: string]: unknown;
}

function classifyMonsters(filePath: string): number {
  const raw = readFileSync(filePath, "utf-8");
  const monsters: JsonEntry[] = JSON.parse(raw);
  let srdCount = 0;

  for (const monster of monsters) {
    const isSrdSource = SRD_MONSTER_SOURCES.has(monster.source || "");
    const isDenied = NON_SRD_MM_MONSTERS.has(monster.name);
    monster.is_srd = isSrdSource && !isDenied;
    if (monster.is_srd) srdCount++;
  }

  writeFileSync(filePath, JSON.stringify(monsters, null, 2));
  return srdCount;
}

function classifySpells(filePath: string): number {
  const raw = readFileSync(filePath, "utf-8");
  const spells: JsonEntry[] = JSON.parse(raw);
  let srdCount = 0;

  for (const spell of spells) {
    const isSrdSource = SRD_SPELL_SOURCES.has(spell.source || "");
    const isDenied = NON_SRD_PHB_SPELLS.has(spell.name);
    spell.is_srd = isSrdSource && !isDenied;
    if (spell.is_srd) srdCount++;
  }

  writeFileSync(filePath, JSON.stringify(spells, null, 2));
  return srdCount;
}

function main() {
  console.log("Classifying SRD content in JSON bundles...\n");

  for (const version of ["2014", "2024"]) {
    const monstersPath = join(SRD_DIR, `monsters-${version}.json`);
    const spellsPath = join(SRD_DIR, `spells-${version}.json`);

    try {
      const raw = readFileSync(monstersPath, "utf-8");
      const total = JSON.parse(raw).length;
      const srdCount = classifyMonsters(monstersPath);
      console.log(
        `  monsters-${version}.json: ${srdCount}/${total} marked as SRD`
      );
    } catch {
      console.log(`  monsters-${version}.json: not found, skipping`);
    }

    try {
      const raw = readFileSync(spellsPath, "utf-8");
      const total = JSON.parse(raw).length;
      const srdCount = classifySpells(spellsPath);
      console.log(
        `  spells-${version}.json: ${srdCount}/${total} marked as SRD`
      );
    } catch {
      console.log(`  spells-${version}.json: not found, skipping`);
    }
  }

  console.log("\nDone! All bundles updated with is_srd field.");
  console.log(
    "NOTE: Refine NON_SRD_MM_MONSTERS list for exact SRD 5.1 compliance."
  );
}

main();
