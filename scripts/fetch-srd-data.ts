#!/usr/bin/env ts-node
/**
 * fetch-srd-data.ts
 *
 * Fetches the complete SRD 5.1 (2014) monster and spell corpus from the
 * 5e-database GitHub repository (MIT license) and writes client-ready
 * JSON bundles to /public/srd/.
 *
 * For the 2024 (SRD 5.2) version, the same dataset is duplicated with
 * ruleset_version="2024" as a baseline.  Individual stat-block updates
 * can be applied later as the 2024 SRD data becomes more widely available.
 *
 * Run:  npx ts-node scripts/fetch-srd-data.ts
 *   or: npm run fetch-srd
 *
 * Outputs:
 *   public/srd/monsters-2014.json
 *   public/srd/monsters-2024.json
 *   public/srd/spells-2014.json
 *   public/srd/spells-2024.json
 *   (conditions.json is NOT touched — managed by supabase/seed.sql)
 */

import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── URLs ────────────────────────────────────────────────────────────
const BASE =
  "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014";
const MONSTER_URL = `${BASE}/5e-SRD-Monsters.json`;
const SPELL_URL = `${BASE}/5e-SRD-Spells.json`;

const OUTPUT_DIR = join(process.cwd(), "public", "srd");

// ── Types (matches SrdMonster / SrdSpell in lib/srd/srd-loader.ts) ──

interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
  damage?: unknown;
  dc?: unknown;
  usage?: unknown;
}

interface SrdMonster {
  id: string;
  name: string;
  cr: string;
  type: string;
  hit_points: number;
  armor_class: number;
  ruleset_version: "2014" | "2024";
  size: string;
  alignment: string | null;
  hp_formula: string | null;
  speed: Record<string, string>;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  saving_throws: Record<string, number> | null;
  skills: Record<string, number> | null;
  damage_vulnerabilities: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  senses: string | null;
  languages: string | null;
  xp: number | null;
  special_abilities: MonsterAction[] | null;
  actions: MonsterAction[] | null;
  legendary_actions: MonsterAction[] | null;
  reactions: MonsterAction[] | null;
  lair_actions: MonsterAction[] | null;
  lair_actions_intro: string | null;
  regional_effects: MonsterAction[] | null;
  regional_effects_intro: string | null;
}

interface SrdSpell {
  id: string;
  name: string;
  ruleset_version: "2014" | "2024";
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higher_levels: string | null;
  classes: string[];
  ritual: boolean;
  concentration: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert numeric CR to the string form used in the app (e.g. 0.25 → "1/4") */
function crToString(cr: number | undefined | null): string {
  if (cr == null) return "0";
  const fractions: Record<number, string> = {
    0: "0",
    0.125: "1/8",
    0.25: "1/4",
    0.5: "1/2",
  };
  return fractions[cr] ?? String(cr);
}

/** Extract the first numeric AC value from the 5e-database armor_class array */
function extractAC(acField: unknown): number {
  if (Array.isArray(acField)) {
    for (const entry of acField) {
      if (typeof entry === "number") return entry;
      if (typeof entry === "object" && entry !== null && "value" in entry) {
        return (entry as { value: number }).value;
      }
    }
  }
  if (typeof acField === "number") return acField;
  return 10; // fallback
}

/** Extract saving throws from proficiencies array */
function extractSavingThrows(
  profs: Array<{ value: number; proficiency: { index: string; name: string } }>
): Record<string, number> | null {
  const saves: Record<string, number> = {};
  for (const p of profs) {
    if (!p.proficiency) continue;
    const idx = p.proficiency.index;
    if (idx.startsWith("saving-throw-")) {
      const ability = idx.replace("saving-throw-", "").toUpperCase();
      saves[ability] = p.value;
    }
  }
  return Object.keys(saves).length > 0 ? saves : null;
}

/** Extract skills from proficiencies array */
function extractSkills(
  profs: Array<{ value: number; proficiency: { index: string; name: string } }>
): Record<string, number> | null {
  const skills: Record<string, number> = {};
  for (const p of profs) {
    if (!p.proficiency) continue;
    const idx = p.proficiency.index;
    if (idx.startsWith("skill-")) {
      const skill = p.proficiency.name.replace("Skill: ", "");
      skills[skill] = p.value;
    }
  }
  return Object.keys(skills).length > 0 ? skills : null;
}

/** Convert senses object to string */
function sensesToString(
  senses: Record<string, unknown> | undefined
): string | null {
  if (!senses) return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(senses)) {
    if (key === "passive_perception") {
      parts.push(`passive Perception ${value}`);
    } else {
      // e.g. "darkvision" → "darkvision 120 ft."
      parts.push(`${key} ${value}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Convert arrays of strings or objects to a single comma-separated string */
function arrayToString(
  arr: Array<string | { index: string; name: string; url?: string }> | undefined
): string | null {
  if (!arr || arr.length === 0) return null;
  return arr
    .map((item) => (typeof item === "string" ? item : item.name))
    .join(", ");
}

/** Normalize action objects from 5e-database format */
function normalizeActions(
  actions: Array<Record<string, unknown>> | undefined
): MonsterAction[] | null {
  if (!actions || actions.length === 0) return null;
  return actions.map((a) => {
    const action: MonsterAction = {
      name: String(a.name || ""),
      desc: String(a.desc || ""),
    };
    if (typeof a.attack_bonus === "number") {
      action.attack_bonus = a.attack_bonus;
    }
    return action;
  });
}

// ── Lair Data ──────────────────────────────────────────────────────

interface LairData {
  lair_actions_intro: string;
  lair_actions: MonsterAction[];
  regional_effects_intro: string;
  regional_effects: MonsterAction[];
  regional_effects_closing?: string;
}

/** Load curated lair actions data from scripts/data/monster-lair-data.json */
function loadLairData(): Record<string, LairData> {
  const filePath = join(__dirname, "data", "monster-lair-data.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  // Remove _comment key
  delete raw._comment;
  return raw as Record<string, LairData>;
}

/**
 * Match a monster index to its lair data key.
 * Adult/Ancient dragons of the same color share lair data.
 * e.g. "adult-blue-dragon" and "ancient-blue-dragon" both map to "blue-dragon"
 */
function getLairKey(monsterIndex: string): string | null {
  // Dragon matching: extract color from "adult-{color}-dragon" or "ancient-{color}-dragon"
  const dragonMatch = monsterIndex.match(/^(?:adult|ancient)-(.+)-dragon$/);
  if (dragonMatch) {
    return `${dragonMatch[1]}-dragon`;
  }
  // Sphinx matching: androsphinx and gynosphinx share lair data
  if (monsterIndex === "androsphinx" || monsterIndex === "gynosphinx") {
    return "sphinx";
  }
  // Vampire matching: all vampire forms share regional effects (not spawn)
  if (monsterIndex.startsWith("vampire-") && monsterIndex !== "vampire-spawn") {
    return "vampire";
  }
  // Beholder matching (for when 5etools pack is used)
  if (monsterIndex === "beholder" || monsterIndex === "death-tyrant") {
    return "beholder";
  }
  // Direct match for non-dragons (aboleth, kraken, lich, unicorn, mummy-lord, etc.)
  return monsterIndex;
}

// ── Transformers ────────────────────────────────────────────────────

function transformMonster(
  raw: Record<string, unknown>,
  version: "2014" | "2024",
  lairDataMap?: Record<string, LairData>
): SrdMonster {
  const index = String(raw.index || "");
  const id = version === "2024" ? `${index}-2024` : index;
  const profs = (raw.proficiencies as Array<{
    value: number;
    proficiency: { index: string; name: string };
  }>) || [];

  const monster: SrdMonster = {
    id,
    name: String(raw.name || ""),
    cr: crToString(raw.challenge_rating as number),
    type: String(raw.type || ""),
    hit_points: (raw.hit_points as number) ?? 0,
    armor_class: extractAC(raw.armor_class),
    ruleset_version: version,
    size: String(raw.size || "Medium"),
    alignment: (raw.alignment as string) || null,
    hp_formula: (raw.hit_points_roll as string) || (raw.hit_dice as string) || null,
    speed: (raw.speed as Record<string, string>) ?? {},
    str: (raw.strength as number) ?? 10,
    dex: (raw.dexterity as number) ?? 10,
    con: (raw.constitution as number) ?? 10,
    int: (raw.intelligence as number) ?? 10,
    wis: (raw.wisdom as number) ?? 10,
    cha: (raw.charisma as number) ?? 10,
    saving_throws: extractSavingThrows(profs),
    skills: extractSkills(profs),
    damage_vulnerabilities: arrayToString(
      raw.damage_vulnerabilities as string[] | undefined
    ),
    damage_resistances: arrayToString(
      raw.damage_resistances as string[] | undefined
    ),
    damage_immunities: arrayToString(
      raw.damage_immunities as string[] | undefined
    ),
    condition_immunities: arrayToString(
      raw.condition_immunities as Array<{ index: string; name: string }> | undefined
    ),
    senses: sensesToString(raw.senses as Record<string, unknown> | undefined),
    languages: (raw.languages as string) || null,
    xp: (raw.xp as number) ?? null,
    special_abilities: normalizeActions(
      raw.special_abilities as Array<Record<string, unknown>> | undefined
    ),
    actions: normalizeActions(
      raw.actions as Array<Record<string, unknown>> | undefined
    ),
    legendary_actions: normalizeActions(
      raw.legendary_actions as Array<Record<string, unknown>> | undefined
    ),
    reactions: normalizeActions(
      raw.reactions as Array<Record<string, unknown>> | undefined
    ),
    lair_actions: null,
    lair_actions_intro: null,
    regional_effects: null,
    regional_effects_intro: null,
  };

  // Merge lair data if available
  if (lairDataMap) {
    const lairKey = getLairKey(index);
    const lair = lairKey ? lairDataMap[lairKey] : null;
    if (lair) {
      monster.lair_actions = lair.lair_actions;
      monster.lair_actions_intro = lair.lair_actions_intro;
      monster.regional_effects = lair.regional_effects;
      monster.regional_effects_intro = lair.regional_effects_intro;
      // Append closing text to intro if present
      if (lair.regional_effects_closing) {
        monster.regional_effects_intro += "\n\n" + lair.regional_effects_closing;
      }
    }
  }

  return monster;
}

function transformSpell(
  raw: Record<string, unknown>,
  version: "2014" | "2024"
): SrdSpell {
  const index = String(raw.index || "");
  const id = version === "2024" ? `${index}-2024` : index;

  // Build components string: "V, S, M (material description)"
  const comps = (raw.components as string[]) || [];
  let componentStr = comps.join(", ");
  if (raw.material) {
    componentStr += ` (${raw.material})`;
  }

  // Join description array
  const desc = Array.isArray(raw.desc)
    ? (raw.desc as string[]).join("\n\n")
    : String(raw.desc || "");

  // Join higher_level array
  const higherLevel = Array.isArray(raw.higher_level)
    ? (raw.higher_level as string[]).join("\n\n")
    : null;

  // Extract class names
  const classes = Array.isArray(raw.classes)
    ? (raw.classes as Array<{ name: string }>).map((c) => c.name)
    : [];

  // Extract school name
  const school =
    typeof raw.school === "object" && raw.school !== null
      ? (raw.school as { name: string }).name
      : String(raw.school || "");

  return {
    id,
    name: String(raw.name || ""),
    ruleset_version: version,
    level: (raw.level as number) || 0,
    school,
    casting_time: String(raw.casting_time || ""),
    range: String(raw.range || ""),
    components: componentStr,
    duration: String(raw.duration || ""),
    description: desc,
    higher_levels: higherLevel,
    classes,
    ritual: Boolean(raw.ritual),
    concentration: Boolean(raw.concentration),
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load curated lair actions data
  console.log("Loading curated lair actions data...");
  const lairData = loadLairData();
  console.log(`  Loaded lair data for ${Object.keys(lairData).length} creature types`);

  // Fetch raw data from 5e-database
  console.log("Fetching SRD monsters from 5e-database...");
  const monstersRes = await fetch(MONSTER_URL);
  if (!monstersRes.ok)
    throw new Error(`Failed to fetch monsters: ${monstersRes.status}`);
  const rawMonsters = (await monstersRes.json()) as Record<string, unknown>[];
  console.log(`  Received ${rawMonsters.length} raw monsters`);

  console.log("Fetching SRD spells from 5e-database...");
  const spellsRes = await fetch(SPELL_URL);
  if (!spellsRes.ok)
    throw new Error(`Failed to fetch spells: ${spellsRes.status}`);
  const rawSpells = (await spellsRes.json()) as Record<string, unknown>[];
  console.log(`  Received ${rawSpells.length} raw spells`);

  // Transform to our format (with lair data merge)
  const monsters2014 = rawMonsters
    .map((m) => transformMonster(m, "2014", lairData))
    .sort((a, b) => a.name.localeCompare(b.name));

  const monsters2024 = rawMonsters
    .map((m) => transformMonster(m, "2024", lairData))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Report lair data coverage
  const withLair = monsters2014.filter((m) => m.lair_actions !== null);
  console.log(`  ${withLair.length} monsters received lair actions data`);

  const spells2014 = rawSpells
    .map((s) => transformSpell(s, "2014"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const spells2024 = rawSpells
    .map((s) => transformSpell(s, "2024"))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Write JSON bundles
  const files = [
    { name: "monsters-2014.json", data: monsters2014 },
    { name: "monsters-2024.json", data: monsters2024 },
    { name: "spells-2014.json", data: spells2014 },
    { name: "spells-2024.json", data: spells2024 },
  ];

  for (const f of files) {
    const path = join(OUTPUT_DIR, f.name);
    const json = JSON.stringify(f.data, null, 2);
    writeFileSync(path, json);
    const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
    console.log(`  ${f.name}: ${f.data.length} entries (${sizeKB} KB)`);
  }

  console.log("\nDone! SRD bundles written to public/srd/");
  console.log("Note: conditions.json is managed separately by supabase/seed.sql");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
