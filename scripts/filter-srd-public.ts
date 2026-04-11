#!/usr/bin/env ts-node
/**
 * filter-srd-public.ts
 *
 * Reads FULL data from data/srd/ and generates SRD-only filtered versions
 * for public/srd/. This ensures no copyrighted non-SRD content is publicly
 * accessible while keeping public/srd/ usable for guest/unauthenticated users.
 *
 * Also stamps `is_srd` on the full data files in data/srd/ so the auth
 * API route can serve them with proper SRD markers for client-side filtering.
 *
 * Run: npx tsx scripts/filter-srd-public.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "srd");
const PUBLIC_DIR = join(process.cwd(), "public", "srd");

mkdirSync(PUBLIC_DIR, { recursive: true });

// ── Slug helper (must match srd-data-server.ts toSlug) ──────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Load whitelists ─────────────────────────────────────────────────
function loadWhitelist(filename: string): Set<string> {
  const slugs: string[] = JSON.parse(
    readFileSync(join(DATA_DIR, filename), "utf-8")
  );
  return new Set(slugs);
}

const monsterWhitelist = loadWhitelist("srd-monster-whitelist.json");
const spellWhitelist = loadWhitelist("srd-spell-whitelist.json");
const itemWhitelist = loadWhitelist("srd-item-whitelist.json");

console.log(
  `Whitelists loaded: ${monsterWhitelist.size} monsters, ${spellWhitelist.size} spells, ${itemWhitelist.size} items`
);

// ── Process monsters ────────────────────────────────────────────────
for (const version of ["2014", "2024"] as const) {
  const filename = `monsters-${version}.json`;
  const raw = JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
  const total = raw.length;

  // Stamp is_srd on full data
  const stamped = raw.map((m: { name: string; source?: string }) => ({
    ...m,
    is_srd: monsterWhitelist.has(toSlug(m.name)),
  }));

  // Write full data with is_srd markers back to data/srd/
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(stamped));

  // Filter to SRD-only for public
  const filtered = stamped.filter(
    (m: { is_srd: boolean }) => m.is_srd === true
  );
  writeFileSync(join(PUBLIC_DIR, filename), JSON.stringify(filtered));

  console.log(
    `${filename}: ${total} total → ${filtered.length} SRD (public), ${total} stamped (data)`
  );
}

// ── Process spells ──────────────────────────────────────────────────
for (const version of ["2014", "2024"] as const) {
  const filename = `spells-${version}.json`;
  const raw = JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
  const total = raw.length;

  const stamped = raw.map((s: { name: string }) => ({
    ...s,
    is_srd: spellWhitelist.has(toSlug(s.name)),
  }));

  writeFileSync(join(DATA_DIR, filename), JSON.stringify(stamped));

  const filtered = stamped.filter(
    (s: { is_srd: boolean }) => s.is_srd === true
  );
  writeFileSync(join(PUBLIC_DIR, filename), JSON.stringify(filtered));

  console.log(
    `${filename}: ${total} total → ${filtered.length} SRD (public), ${total} stamped (data)`
  );
}

// ── Process items ───────────────────────────────────────────────────
{
  const filename = "items.json";
  const raw = JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
  const total = raw.length;

  // Items use id-based whitelist
  const stamped = raw.map((i: { id: string; srd?: boolean; basicRules?: boolean }) => ({
    ...i,
    srd: itemWhitelist.has(i.id) || i.srd === true,
  }));

  writeFileSync(join(DATA_DIR, filename), JSON.stringify(stamped));

  const filtered = stamped.filter(
    (i: { srd?: boolean; basicRules?: boolean }) =>
      i.srd === true || i.basicRules === true
  );
  writeFileSync(join(PUBLIC_DIR, filename), JSON.stringify(filtered));

  console.log(
    `${filename}: ${total} total → ${filtered.length} SRD/Basic (public), ${total} stamped (data)`
  );
}

// ── Copy SRD-safe files as-is ───────────────────────────────────────
const COPY_AS_IS = [
  "conditions.json",
  "feats.json",
  "backgrounds.json",
  "classes-srd.json",
  "classes-full.json",
  "subclasses-srd.json",
  "monsters-mad.json",
];

for (const file of COPY_AS_IS) {
  const src = join(DATA_DIR, file);
  try {
    const content = readFileSync(src, "utf-8");
    writeFileSync(join(PUBLIC_DIR, file), content);
    const parsed = JSON.parse(content);
    const count = Array.isArray(parsed) ? parsed.length : "object";
    console.log(`${file}: copied as-is (${count} entries)`);
  } catch {
    console.log(`${file}: skipped (not found in data/srd/)`);
  }
}

// ── Process abilities index ────────────────────────────────────────
{
  const filename = "abilities-index.json";
  try {
    const raw: { ability_type: string; source: string; source_class: string | null; source_race: string | null; srd_ref: string }[] =
      JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
    const total = raw.length;

    const SRD_SOURCES = new Set(["PHB", "XPHB"]);
    const SRD_CLASSES = new Set([
      "barbarian", "bard", "cleric", "druid", "fighter", "monk",
      "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard",
    ]);
    const SRD_SUBCLASS_SLUGS = [
      "berserker", "lore", "life", "land", "champion", "open-hand",
      "devotion", "hunter", "thief", "draconic", "fiend", "evocation", "evoker",
    ];
    const SRD_RACE_PREFIXES = [
      "dragonborn", "dwarf", "elf", "gnome", "half-elf", "half-orc",
      "halfling", "human", "tiefling", "goliath",
    ];
    const PS_PATTERN = /human-(ixalan|kaladesh|zendikar|amonkhet|dominaria)/i;

    const filtered = raw.filter((e) => {
      if (!SRD_SOURCES.has(e.source)) return false;
      switch (e.ability_type) {
        case "class_feature":
          return SRD_CLASSES.has(e.source_class || "");
        case "subclass_feature": {
          const subSlug = (e.srd_ref.split(":")[2] || "");
          return SRD_SUBCLASS_SLUGS.some((s) => subSlug.includes(s));
        }
        case "racial_trait": {
          const r = e.source_race || "";
          if (PS_PATTERN.test(r)) return false;
          return SRD_RACE_PREFIXES.some((p) => r === p || r.startsWith(p + " ("));
        }
        case "feat":
          return true;
        default:
          return false;
      }
    });

    writeFileSync(join(PUBLIC_DIR, filename), JSON.stringify(filtered));
    console.log(
      `${filename}: ${total} total → ${filtered.length} SRD (public)`
    );
  } catch {
    console.log(`${filename}: skipped (not found in data/srd/)`);
  }
}

// ── Summary ─────────────────────────────────────────────────────────
console.log("\n✅ Public SRD bundles generated successfully.");
console.log("   public/srd/ → SRD-only content (safe for public access)");
console.log("   data/srd/   → Full content with is_srd markers (auth API only)");
