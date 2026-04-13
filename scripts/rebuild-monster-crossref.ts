#!/usr/bin/env ts-node
/**
 * rebuild-monster-crossref.ts
 *
 * Rebuilds the monster-version-crossref.json files (data/srd + public/srd).
 *
 * Strategy:
 *   1. Start from the existing crossref (preserves all correct name-matched pairs)
 *   2. Apply manual overrides — fixes wrong mappings and adds renamed/split monsters
 *   3. Filter to SRD-only for the public version
 *   4. Write both files
 *
 * Run: npx tsx scripts/rebuild-monster-crossref.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data", "srd");
const PUBLIC_DIR = join(ROOT, "public", "srd");

interface Monster {
  id: string;
  name: string;
  cr: string;
  is_srd?: boolean;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

// ── Manual overrides ────────────────────────────────────────────────────────
// Each entry is [id_2024, id_2014]. Bidirectional mapping is automatic.
// These take PRIORITY over any existing name-based match.
//
// Categories:
//   FIX  — existing crossref points to obscure source; should point to -mm
//   RENAME — 2024 renamed the monster (e.g., Flying Sword → Animated Flying Sword)
//   SPLIT  — 2024 split one monster into variants; pick closest-CR match
//   MERGE  — 2024 merged variants into one (e.g., Bone Naga Guardian/Spirit → Bone Naga)
//   CONCEPT — same creature, very different name (e.g., Androsphinx → Sphinx of Valor)

const OVERRIDES: [string, string][] = [
  // ── FIX: wrong mapping (non-MM when MM is available) ──────────────────
  ["goblin-warrior-xmm-2024", "goblin-mm"],             // was goblin-warrior-wtthc
  ["gnoll-warrior-xmm-2024", "gnoll-mm"],               // was gnoll-warrior-wtthc
  ["shrieker-fungus-xmm-2024", "shrieker-mm"],           // was shrieker-fungus-wtthc

  // ── RENAME: same creature, different name ─────────────────────────────
  ["animated-flying-sword-xmm-2024", "flying-sword-mm"],
  ["animated-rug-of-smothering-xmm-2024", "rug-of-smothering-mm"],
  ["cultist-fanatic-xmm-2024", "cult-fanatic-mm"],
  ["gas-spore-fungus-xmm-2024", "gas-spore-mm"],
  ["giant-venomous-snake-xmm-2024", "giant-poisonous-snake-mm"],
  ["giant-seahorse-xmm-2024", "giant-sea-horse-mm"],
  ["half-dragon-xmm-2024", "half-red-dragon-veteran-mm"],
  ["kobold-warrior-xmm-2024", "kobold-mm"],
  ["ogrillon-ogre-xmm-2024", "half-ogre-ogrillon-mm"],
  ["salamander-fire-snake-xmm-2024", "fire-snake-mm"],
  ["seahorse-xmm-2024", "sea-horse-mm"],
  ["swarm-of-venomous-snakes-xmm-2024", "swarm-of-poisonous-snakes-mm"],
  ["venomous-snake-xmm-2024", "poisonous-snake-mm"],
  ["warrior-veteran-xmm-2024", "veteran-mm"],
  ["warrior-infantry-xmm-2024", "tribal-warrior-mm"],
  ["yuan-ti-infiltrator-xmm-2024", "yuan-ti-pureblood-mm"],
  ["tough-xmm-2024", "thug-mm"],
  ["priest-acolyte-xmm-2024", "acolyte-mm"],
  ["hobgoblin-warrior-xmm-2024", "hobgoblin-mm"],
  ["shadow-dragon-xmm-2024", "young-red-shadow-dragon-mm"],

  // ── RENAME: modron prefix added in 2024 ───────────────────────────────
  ["modron-duodrone-xmm-2024", "duodrone-mm"],
  ["modron-monodrone-xmm-2024", "monodrone-mm"],
  ["modron-pentadrone-xmm-2024", "pentadrone-mm"],
  ["modron-quadrone-xmm-2024", "quadrone-mm"],
  ["modron-tridrone-xmm-2024", "tridrone-mm"],

  // ── CONCEPT: same creature, very different name ───────────────────────
  ["bone-naga-xmm-2024", "bone-naga-guardian-mm"],       // 2024 merged Guardian+Spirit
  ["dracolich-xmm-2024", "adult-blue-dracolich-mm"],     // 2024 genericized
  ["grick-ancient-xmm-2024", "grick-alpha-mm"],          // renamed Alpha → Ancient
  ["sphinx-of-valor-xmm-2024", "androsphinx-mm"],        // renamed Androsphinx → Sphinx of Valor
  ["sphinx-of-lore-xmm-2024", "gynosphinx-mm"],          // renamed Gynosphinx → Sphinx of Lore
  ["vampire-umbral-lord-xmm-2024", "vampire-spellcaster-mm"], // both CR 15 caster vampires
  ["lizardfolk-geomancer-xmm-2024", "lizardfolk-shaman-mm"], // both CR 2 caster lizardfolk
  ["lizardfolk-sovereign-xmm-2024", "lizard-king-mm"],   // both CR 4 leader lizardfolk

  // ── MERGE: 2024 consolidated color variants into age categories ───────
  ["faerie-dragon-adult-xmm-2024", "faerie-dragon-violet-mm"],  // CR 2 representative
  ["faerie-dragon-youth-xmm-2024", "faerie-dragon-red-mm"],     // CR 1 representative

  // ── SPLIT: 2024 split one base into variants — pick closest CR ────────
  ["aarakocra-skirmisher-xmm-2024", "aarakocra-mm"],     // both CR 1/4
  ["azer-sentinel-xmm-2024", "azer-mm"],                 // both CR 2
  ["bugbear-warrior-xmm-2024", "bugbear-mm"],            // both CR 1
  ["bugbear-stalker-xmm-2024", "bugbear-chief-mm"],      // both CR 3
  ["bullywug-warrior-xmm-2024", "bullywug-mm"],           // both CR 1/4
  ["centaur-trooper-xmm-2024", "centaur-mm"],             // both CR 2
  ["cyclops-sentry-xmm-2024", "cyclops-mm"],              // both CR 6
  ["merfolk-skirmisher-xmm-2024", "merfolk-mm"],           // both CR 1/8
  ["sahuagin-warrior-xmm-2024", "sahuagin-mm"],           // both CR 1/2
  ["sahuagin-priest-xmm-2024", "sahuagin-priestess-mm"],  // both CR 2
  ["thri-kreen-marauder-xmm-2024", "thri-kreen-mm"],      // both CR 1
  ["minotaur-of-baphomet-xmm-2024", "minotaur-mm"],       // both CR 3

  // ── CONCEPT: non-MM sources (MPMM, TftYP, PHB) ───────────────────────
  ["animated-object-xphb-2024", "animated-object-medium-phb"],   // spell summon consolidated
  ["mage-apprentice-xmm-2024", "apprentice-wizard-mpmm"],       // renamed junior wizard NPC
  ["lacedon-ghoul-xmm-2024", "lacedon-tftyp"],                  // aquatic ghoul, both CR 1
  ["psychic-gray-ooze-xmm-2024", "sentient-gray-ooze-tftyp"],   // psychic ooze variant
  ["performer-xmm-2024", "bard-mpmm"],                          // Bard NPC → Performer
  ["archpriest-xmm-2024", "war-priest-mpmm"],                   // high-level divine NPC
  ["warrior-commander-xmm-2024", "warlord-mpmm"],               // martial leader NPC
  ["questing-knight-xmm-2024", "champion-mpmm"],                // elite fighter NPC
  ["myconid-spore-servant-xmm-2024", "quaggoth-spore-servant-mm"], // genericized spore servant
  ["goblin-hexer-xmm-2024", "nilbog-mpmm"],                     // goblin trickster caster
  ["death-knight-aspirant-xmm-2024", "blackguard-mpmm"],        // fallen paladin archetype
];

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  console.log("Loading data...");

  const crossref: Record<string, string> = loadJson(
    join(DATA_DIR, "monster-version-crossref.json")
  );
  const monsters2014: Monster[] = loadJson(join(DATA_DIR, "monsters-2014.json"));
  const monsters2024: Monster[] = loadJson(join(DATA_DIR, "monsters-2024.json"));
  const publicMonsters2014: Monster[] = loadJson(join(PUBLIC_DIR, "monsters-2014.json"));
  const publicMonsters2024: Monster[] = loadJson(join(PUBLIC_DIR, "monsters-2024.json"));

  const ids2014 = new Set(monsters2014.map((m) => m.id));
  const ids2024 = new Set(monsters2024.map((m) => m.id));

  const before = Object.keys(crossref).length;
  console.log(`Existing crossref: ${before} entries (${before / 2} pairs)`);

  // Apply overrides
  let added = 0;
  let fixed = 0;

  for (const [id24, id14] of OVERRIDES) {
    // Validate both IDs exist in their respective datasets
    if (!ids2024.has(id24)) {
      console.warn(`  SKIP: ${id24} not found in 2024 data`);
      continue;
    }
    if (!ids2014.has(id14)) {
      console.warn(`  SKIP: ${id14} not found in 2014 data`);
      continue;
    }

    // Remove any existing mapping for either ID
    const old24 = crossref[id24];
    const old14 = crossref[id14];
    if (old24 && old24 !== id14) {
      // Remove old bidirectional pair
      delete crossref[old24]; // old 2014 → 2024 direction
      delete crossref[id24];
      fixed++;
    }
    if (old14 && old14 !== id24) {
      delete crossref[old14];
      delete crossref[id14];
    }

    // Set new bidirectional mapping
    if (!crossref[id24] || crossref[id24] !== id14) {
      crossref[id24] = id14;
      crossref[id14] = id24;
      if (!old24) added++;
    }
  }

  const after = Object.keys(crossref).length;
  console.log(`\nApplied ${OVERRIDES.length} overrides: ${added} added, ${fixed} fixed`);
  console.log(`New crossref: ${after} entries (${after / 2} pairs)`);

  // Validate: check no orphaned references
  let orphans = 0;
  for (const [k, v] of Object.entries(crossref)) {
    if (!ids2014.has(k) && !ids2024.has(k)) {
      console.warn(`  ORPHAN key: ${k}`);
      orphans++;
    }
    if (!ids2014.has(v) && !ids2024.has(v)) {
      console.warn(`  ORPHAN value: ${v}`);
      orphans++;
    }
  }
  if (orphans > 0) console.warn(`Found ${orphans} orphaned references!`);

  // Write full crossref
  const sorted = Object.fromEntries(
    Object.entries(crossref).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(
    join(DATA_DIR, "monster-version-crossref.json"),
    JSON.stringify(sorted)
  );
  console.log(`\nWrote: data/srd/monster-version-crossref.json (${after} entries)`);

  // Build public version: only include pairs where BOTH IDs exist in public data
  const publicIds2014 = new Set(publicMonsters2014.map((m) => m.id));
  const publicIds2024 = new Set(publicMonsters2024.map((m) => m.id));

  const publicCrossref: Record<string, string> = {};
  for (const [k, v] of Object.entries(sorted)) {
    const kIsPublic2024 = publicIds2024.has(k);
    const kIsPublic2014 = publicIds2014.has(k);
    const vIsPublic2024 = publicIds2024.has(v);
    const vIsPublic2014 = publicIds2014.has(v);

    // Include if both sides are in public data
    if ((kIsPublic2024 && vIsPublic2014) || (kIsPublic2014 && vIsPublic2024)) {
      publicCrossref[k] = v;
    }
  }

  const publicCount = Object.keys(publicCrossref).length;
  writeFileSync(
    join(PUBLIC_DIR, "monster-version-crossref.json"),
    JSON.stringify(publicCrossref)
  );
  console.log(`Wrote: public/srd/monster-version-crossref.json (${publicCount} entries)`);

  // Stats
  const missing2024Full = monsters2024.filter((m) => !crossref[m.id]);
  const missing2024Public = publicMonsters2024.filter((m) => !publicCrossref[m.id]);
  console.log(
    `\nRemaining 2024 without crossref: ${missing2024Full.length} full, ${missing2024Public.length} public`
  );

  if (missing2024Full.length > 0) {
    console.log(`\n--- 2024 full monsters still missing crossref ---`);
    for (const m of missing2024Full) {
      console.log(`  ${m.id} | ${m.name} | CR ${m.cr}`);
    }
  }
}

main();
