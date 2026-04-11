#!/usr/bin/env ts-node
/**
 * filter-srd-abilities-public.ts
 *
 * Reads the FULL abilities index from data/srd/abilities-index.json and
 * generates an SRD-only filtered version for public/srd/abilities-index.json.
 *
 * SRD 5.1 / 5.2 filter criteria:
 *   - Sources: PHB (2014) + XPHB (2024) only
 *   - Class features: 12 core SRD classes only
 *   - Subclass features: only the one SRD subclass per class
 *   - Racial traits: core SRD races only (no Eberron, Plane Shift, etc.)
 *   - Feats: all PHB/XPHB feats
 *
 * Run: npx tsx scripts/filter-srd-abilities-public.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");
const PUBLIC_DIR = join(process.cwd(), "public", "srd");

mkdirSync(PUBLIC_DIR, { recursive: true });

// ── SRD 5.1 / 5.2 whitelists ──────────────────────────────────────

/** Only PHB (2014) and XPHB (2024) are SRD sources */
const SRD_SOURCES = new Set(["PHB", "XPHB"]);

/** The 12 core SRD classes (no Artificer, Blood Hunter, etc.) */
const SRD_CLASSES = new Set([
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
]);

/**
 * SRD subclass slugs — one per class.
 * The filter checks if the subclass portion of srd_ref contains any of these.
 */
const SRD_SUBCLASS_SLUGS = [
  "berserker",      // Barbarian — Path of the Berserker
  "lore",           // Bard — College of Lore
  "life",           // Cleric — Life Domain
  "land",           // Druid — Circle of the Land
  "champion",       // Fighter — Champion
  "open-hand",      // Monk — Way of the Open Hand
  "devotion",       // Paladin — Oath of Devotion
  "hunter",         // Ranger — Hunter
  "thief",          // Rogue — Thief
  "draconic",       // Sorcerer — Draconic Bloodline
  "fiend",          // Warlock — The Fiend
  "evocation",      // Wizard — School of Evocation (2014)
  "evoker",         // Wizard — Evoker (2024)
];

/**
 * SRD race base slugs. Matches both "dwarf" and "dwarf (Hill)", etc.
 * Goliath is included because it's in the 2024 PHB (XPHB).
 */
const SRD_RACE_PREFIXES = [
  "dragonborn", "dwarf", "elf", "gnome", "half-elf", "half-orc",
  "halfling", "human", "tiefling", "goliath",
];

/** Plane Shift / setting-specific human variants wrongly tagged as PHB */
const PLANE_SHIFT_PATTERN = /human-(ixalan|kaladesh|zendikar|amonkhet|dominaria)/i;

// ── Helpers ────────────────────────────────────────────────────────

function isSrdRace(sourceRace: string | null): boolean {
  if (!sourceRace) return false;
  if (PLANE_SHIFT_PATTERN.test(sourceRace)) return false;
  return SRD_RACE_PREFIXES.some(
    (p) => sourceRace === p || sourceRace.startsWith(p + " (")
  );
}

function isSrdSubclass(srdRef: string): boolean {
  // srd_ref format: "subclass:<class>:<subclass-slug>:<feature-slug>"
  const parts = srdRef.split(":");
  const subSlug = parts[2] || "";
  return SRD_SUBCLASS_SLUGS.some((s) => subSlug.includes(s));
}

// ── Main ───────────────────────────────────────────────────────────

interface AbilityEntry {
  id: string;
  name: string;
  ability_type: "class_feature" | "racial_trait" | "feat" | "subclass_feature";
  source_class: string | null;
  source_race: string | null;
  source: string;
  srd_ref: string;
  [key: string]: unknown;
}

const inputPath = join(DATA_DIR, "abilities-index.json");
const outputPath = join(PUBLIC_DIR, "abilities-index.json");

const allAbilities: AbilityEntry[] = JSON.parse(
  readFileSync(inputPath, "utf-8")
);

const filtered = allAbilities.filter((entry) => {
  // Gate 1: Must be from an SRD source book
  if (!SRD_SOURCES.has(entry.source)) return false;

  switch (entry.ability_type) {
    case "class_feature":
      return SRD_CLASSES.has(entry.source_class || "");

    case "subclass_feature":
      return isSrdSubclass(entry.srd_ref);

    case "racial_trait":
      return isSrdRace(entry.source_race);

    case "feat":
      return true; // All PHB/XPHB feats are safe

    default:
      return false;
  }
});

writeFileSync(outputPath, JSON.stringify(filtered));

// ── Report ─────────────────────────────────────────────────────────

const byType: Record<string, number> = {};
filtered.forEach((e) => {
  byType[e.ability_type] = (byType[e.ability_type] || 0) + 1;
});

console.log(
  `abilities-index.json: ${allAbilities.length} total → ${filtered.length} SRD (public)`
);
console.log(`  Breakdown: ${JSON.stringify(byType)}`);
console.log(
  `  Removed: ${allAbilities.length - filtered.length} non-SRD entries`
);
