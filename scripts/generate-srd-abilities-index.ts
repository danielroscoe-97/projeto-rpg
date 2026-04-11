/**
 * generate-srd-abilities-index.ts
 * Consolidates class features, racial traits, feats, and subclass features
 * into a single searchable JSON index for the AddAbilityDialog.
 *
 * Now reads from the expanded 5e.tools data files:
 *   - data/srd/class-features-full.json (473 features)
 *   - data/srd/subclasses-full.json (191 subclasses)
 *   - data/srd/races-full.json (157 races with traits)
 *   - data/srd/feats.json (265 feats)
 *
 * Usage: npx tsx scripts/generate-srd-abilities-index.ts
 * Output: lib/data/srd-abilities-index.json
 */

import fs from "fs";
import path from "path";

interface SrdAbilityEntry {
  id: string;
  name: string;
  name_pt: string;
  description: string;
  description_pt: string;
  ability_type: "class_feature" | "racial_trait" | "feat" | "subclass_feature";
  source_class: string | null;
  source_race: string | null;
  level_acquired: number | null;
  max_uses: number | null;
  reset_type: "short_rest" | "long_rest" | "dawn" | "manual" | null;
  srd_ref: string;
  source: string;
  srd?: boolean;
}

const DATA_DIR = path.resolve(__dirname, "../data/srd");
const OUTPUT_PATH = path.resolve(__dirname, "../lib/data/srd-abilities-index.json");

// Known limited-use abilities with their recharge info
const USES_MAP: Record<string, { max_uses: number | string; reset_type: string }> = {
  "class:barbarian:rage": { max_uses: "by_level", reset_type: "long_rest" },
  "class:bard:bardic-inspiration": { max_uses: "cha_mod", reset_type: "long_rest" },
  "class:cleric:channel-divinity": { max_uses: "by_level", reset_type: "short_rest" },
  "class:cleric:divine-intervention": { max_uses: 1, reset_type: "long_rest" },
  "class:druid:wild-shape": { max_uses: 2, reset_type: "short_rest" },
  "class:fighter:second-wind": { max_uses: 1, reset_type: "short_rest" },
  "class:fighter:action-surge": { max_uses: "by_level", reset_type: "short_rest" },
  "class:fighter:indomitable": { max_uses: "by_level", reset_type: "long_rest" },
  "class:monk:ki": { max_uses: "level", reset_type: "short_rest" },
  "class:paladin:divine-sense": { max_uses: "cha_mod_plus_1", reset_type: "long_rest" },
  "class:paladin:lay-on-hands": { max_uses: "level_x_5", reset_type: "long_rest" },
  "class:paladin:cleansing-touch": { max_uses: "cha_mod", reset_type: "long_rest" },
  "class:sorcerer:font-of-magic": { max_uses: "level", reset_type: "long_rest" },
  "class:rogue:stroke-of-luck": { max_uses: 1, reset_type: "short_rest" },
};

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function readJsonSafe<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ── Extract from class-features-full.json ────────────────────────

function extractClassFeatures(): SrdAbilityEntry[] {
  const features = readJsonSafe<any[]>(path.join(DATA_DIR, "class-features-full.json"));
  if (!features) {
    console.warn("  ⚠ class-features-full.json not found, falling back to class-*.json");
    return extractClassFeaturesLegacy();
  }

  const entries: SrdAbilityEntry[] = [];
  for (const f of features) {
    const cls = f.class_id || "";
    const srdRef = `class:${cls}:${slugify(f.name)}`;
    const usesInfo = USES_MAP[srdRef];

    entries.push({
      id: f.id || srdRef,
      name: f.name,
      name_pt: "",
      description: f.description || "",
      description_pt: "",
      ability_type: "class_feature",
      source_class: cls,
      source_race: null,
      level_acquired: f.level ?? null,
      max_uses: usesInfo && typeof usesInfo.max_uses === "number" ? usesInfo.max_uses : null,
      reset_type: (usesInfo?.reset_type as SrdAbilityEntry["reset_type"]) ?? null,
      srd_ref: srdRef,
      source: f.source || "PHB",
      srd: f.srd ?? false,
    });
  }
  return entries;
}

// Legacy fallback (reads old class-barbarian.json, etc.)
function extractClassFeaturesLegacy(): SrdAbilityEntry[] {
  const CLASSES = ["barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard"];
  const entries: SrdAbilityEntry[] = [];
  for (const cls of CLASSES) {
    const filePath = path.join(DATA_DIR, `class-${cls}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    for (const feat of (data.class_features || [])) {
      if (feat.name === "Ability Score Improvement") continue;
      const srdRef = `class:${cls}:${slugify(feat.name)}`;
      const usesInfo = USES_MAP[srdRef];
      entries.push({
        id: srdRef, name: feat.name, name_pt: feat.name_pt || "",
        description: feat.description_en || "", description_pt: feat.description_pt || "",
        ability_type: "class_feature", source_class: cls, source_race: null,
        level_acquired: feat.level ?? null,
        max_uses: usesInfo && typeof usesInfo.max_uses === "number" ? usesInfo.max_uses : null,
        reset_type: (usesInfo?.reset_type as SrdAbilityEntry["reset_type"]) ?? null,
        srd_ref: srdRef, source: "SRD 5.1", srd: true,
      });
    }
  }
  return entries;
}

// ── Extract from subclasses-full.json ────────────────────────────

function extractSubclassFeatures(): SrdAbilityEntry[] {
  const subclasses = readJsonSafe<any[]>(path.join(DATA_DIR, "subclasses-full.json"));
  if (!subclasses) {
    console.warn("  ⚠ subclasses-full.json not found, falling back to subclasses-srd.json");
    return extractSubclassFeaturesLegacy();
  }

  const entries: SrdAbilityEntry[] = [];
  for (const sub of subclasses) {
    for (const feat of (sub.features || [])) {
      const srdRef = `subclass:${sub.class_id}:${slugify(sub.short_name || sub.name)}:${slugify(feat.name)}`;
      entries.push({
        id: srdRef, name: feat.name, name_pt: "",
        description: feat.description || "", description_pt: "",
        ability_type: "subclass_feature", source_class: sub.class_id, source_race: null,
        level_acquired: feat.level ?? null,
        max_uses: null, reset_type: null,
        srd_ref: srdRef, source: sub.source || "PHB", srd: sub.srd ?? false,
      });
    }
  }
  return entries;
}

function extractSubclassFeaturesLegacy(): SrdAbilityEntry[] {
  const filePath = path.join(DATA_DIR, "subclasses-srd.json");
  if (!fs.existsSync(filePath)) return [];
  const subclasses = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const entries: SrdAbilityEntry[] = [];
  for (const sub of subclasses) {
    for (const feat of (sub.features || [])) {
      const srdRef = `subclass:${sub.class_id}:${slugify(sub.id)}:${slugify(feat.name)}`;
      entries.push({
        id: srdRef, name: feat.name, name_pt: feat.name_pt || "",
        description: feat.description_en || "", description_pt: feat.description_pt || "",
        ability_type: "subclass_feature", source_class: sub.class_id, source_race: null,
        level_acquired: feat.level ?? null,
        max_uses: null, reset_type: null,
        srd_ref: srdRef, source: "SRD 5.1", srd: true,
      });
    }
  }
  return entries;
}

// ── Extract from feats.json ──────────────────────────────────────

function extractFeats(): SrdAbilityEntry[] {
  const feats = readJsonSafe<any[]>(path.join(DATA_DIR, "feats.json"));
  if (!feats) return [];
  const entries: SrdAbilityEntry[] = [];
  for (const feat of feats) {
    const srdRef = `feat:${feat.id || slugify(feat.name)}`;
    entries.push({
      id: srdRef, name: feat.name, name_pt: feat.name_pt || "",
      description: feat.description || "", description_pt: feat.description_pt || "",
      ability_type: "feat", source_class: null, source_race: null,
      level_acquired: null, max_uses: null, reset_type: null,
      srd_ref: srdRef, source: feat.source || "PHB", srd: feat.srd ?? false,
    });
  }
  return entries;
}

// ── Extract from races-full.json ─────────────────────────────────

function extractRacialTraits(): SrdAbilityEntry[] {
  const races = readJsonSafe<any[]>(path.join(DATA_DIR, "races-full.json"));
  if (!races) {
    console.warn("  ⚠ races-full.json not found, using hardcoded racial traits");
    return extractRacialTraitsLegacy();
  }

  const entries: SrdAbilityEntry[] = [];
  for (const race of races) {
    const raceSlug = slugify(race.name);
    for (const trait of (race.traits || [])) {
      const srdRef = `racial:${raceSlug}:${slugify(trait.name)}`;
      entries.push({
        id: srdRef, name: trait.name, name_pt: "",
        description: trait.description || "", description_pt: "",
        ability_type: "racial_trait", source_class: null, source_race: raceSlug,
        level_acquired: null, max_uses: null, reset_type: null,
        srd_ref: srdRef, source: race.source || "PHB", srd: race.srd ?? false,
      });
    }
    // Also add subrace traits
    for (const sub of (race.subraces || [])) {
      for (const trait of (sub.traits || [])) {
        const subSlug = slugify(sub.name);
        const srdRef = `racial:${raceSlug}:${subSlug}:${slugify(trait.name)}`;
        entries.push({
          id: srdRef, name: trait.name, name_pt: "",
          description: trait.description || "", description_pt: "",
          ability_type: "racial_trait", source_class: null, source_race: `${raceSlug} (${sub.name})`,
          level_acquired: null, max_uses: null, reset_type: null,
          srd_ref: srdRef, source: sub.source || race.source || "PHB", srd: race.srd ?? false,
        });
      }
    }
  }
  return entries;
}

function extractRacialTraitsLegacy(): SrdAbilityEntry[] {
  return []; // Minimal fallback
}

// ── Main ─────────────────────────────────────────────────────────

const classFeatures = extractClassFeatures();
const subclassFeatures = extractSubclassFeatures();
const feats = extractFeats();
const racialTraits = extractRacialTraits();

const allEntries = [...classFeatures, ...subclassFeatures, ...feats, ...racialTraits];

// Deduplicate by id
const seen = new Map<string, SrdAbilityEntry>();
for (const e of allEntries) {
  if (!seen.has(e.id)) seen.set(e.id, e);
}
const deduped = Array.from(seen.values());

// Sort: class features by class+level, then subclass, then racial, then feats
deduped.sort((a, b) => {
  const typeOrder: Record<string, number> = {
    class_feature: 0, subclass_feature: 1, racial_trait: 2, feat: 3,
  };
  const ta = typeOrder[a.ability_type] ?? 4;
  const tb = typeOrder[b.ability_type] ?? 4;
  if (ta !== tb) return ta - tb;
  if (a.source_class !== b.source_class) return (a.source_class || "").localeCompare(b.source_class || "");
  if (a.level_acquired !== b.level_acquired) return (a.level_acquired ?? 0) - (b.level_acquired ?? 0);
  return a.name.localeCompare(b.name);
});

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2), "utf-8");
console.log(`✅ Generated ${deduped.length} SRD abilities → ${OUTPUT_PATH}`);

// Also copy to data/srd/ for the auth-gated API route
const DATA_SRD_COPY = path.resolve(__dirname, "../data/srd/abilities-index.json");
fs.writeFileSync(DATA_SRD_COPY, JSON.stringify(deduped), "utf-8");
console.log(`   Copied to ${DATA_SRD_COPY} (auth API)`);

const byType = deduped.reduce((acc, e) => {
  acc[e.ability_type] = (acc[e.ability_type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
console.log("   Breakdown:", byType);

const bySrd = deduped.filter((e) => e.srd).length;
console.log(`   SRD-marked: ${bySrd} / ${deduped.length}`);
console.log("   ⚠ Run filter-srd-abilities-public.ts next to update public/srd/abilities-index.json");
