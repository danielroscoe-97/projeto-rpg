#!/usr/bin/env ts-node
/**
 * fetch-5etools-bestiary.ts
 *
 * Crawls the complete 5e.tools bestiary from the GitHub mirror and transforms
 * every monster into the project's SrdMonster format.
 *
 * Source: https://github.com/5etools-mirror-3/5etools-src
 *
 * Run:  npx ts-node scripts/fetch-5etools-bestiary.ts
 *   or: npm run fetch-bestiary
 *
 * Outputs:
 *   public/srd/monsters-2014.json   (all pre-2024 sources)
 *   public/srd/monsters-2024.json   (2024 revised sources: XMM, XPHB, XDMG)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────

const BASE_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary";
const INDEX_URL = `${BASE_URL}/index.json`;
const OUTPUT_DIR = join(process.cwd(), "public", "srd");

// Sources that represent the 2024 revised ruleset
const SOURCES_2024 = new Set(["XMM", "XPHB", "XDMG"]);

// Size letter → full name
const SIZE_MAP: Record<string, string> = {
  T: "Tiny",
  S: "Small",
  M: "Medium",
  L: "Large",
  H: "Huge",
  G: "Gargantuan",
};

// Alignment codes → strings
const ALIGN_MAP: Record<string, string> = {
  L: "Lawful",
  N: "Neutral",
  C: "Chaotic",
  G: "Good",
  E: "Evil",
  U: "Unaligned",
  A: "Any alignment",
  NX: "Neutral",
  NY: "Neutral",
};

// ── Types ───────────────────────────────────────────────────────────

interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
}

interface SrdMonster {
  id: string;
  name: string;
  source: string;
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
}

// ── CR → XP table ──────────────────────────────────────────────────

const CR_XP: Record<string, number> = {
  "0": 0, "1/8": 25, "1/4": 50, "1/2": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100,
  "5": 1800, "6": 2300, "7": 2900, "8": 3900,
  "9": 5000, "10": 5900, "11": 7200, "12": 8400,
  "13": 10000, "14": 11500, "15": 13000, "16": 15000,
  "17": 18000, "18": 20000, "19": 22000, "20": 25000,
  "21": 33000, "22": 41000, "23": 50000, "24": 62000,
  "25": 75000, "26": 90000, "27": 105000, "28": 120000,
  "29": 135000, "30": 155000,
};

// ── Markup stripping ───────────────────────────────────────────────

/**
 * Strip 5e.tools {@tag ...} markup to plain text.
 *
 * Examples:
 *   {@atk mw} → "Melee Weapon Attack:"
 *   {@hit 7}  → "+7"
 *   {@damage 2d6 + 4} → "2d6 + 4"
 *   {@dc 15}  → "DC 15"
 *   {@condition frightened} → "frightened"
 *   {@spell fireball} → "fireball"
 *   {@creature goblin} → "goblin"
 *   {@dice 1d6} → "1d6"
 *   {@item longsword|phb} → "longsword"
 *   {@b bold text} → "bold text"
 *   {@i italic text} → "italic text"
 */
function stripTags(text: string): string {
  if (typeof text !== "string") return String(text ?? "");

  // Iteratively resolve nested tags from the inside out
  let result = text;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(/\{@([a-zA-Z]+)\s([^{}]*?)\}/g, (_match, tag: string, content: string) => {
      const lower = tag.toLowerCase();

      // Attack type shorthands
      if (lower === "atk") {
        const map: Record<string, string> = {
          mw: "Melee Weapon Attack:",
          rw: "Ranged Weapon Attack:",
          ms: "Melee Spell Attack:",
          rs: "Ranged Spell Attack:",
          "mw,rw": "Melee or Ranged Weapon Attack:",
          "m,r": "Melee or Ranged Attack:",
        };
        return map[content.trim()] || `${content} Attack:`;
      }
      if (lower === "atkr") {
        const map: Record<string, string> = {
          m: "Melee Attack:",
          r: "Ranged Attack:",
          "m,r": "Melee or Ranged Attack:",
        };
        return map[content.trim()] || `${content} Attack:`;
      }

      // Hit bonus
      if (lower === "hit") return `+${content.trim()}`;

      // DC
      if (lower === "dc") return `DC ${content.trim()}`;

      // Damage / dice — just show the expression
      if (lower === "damage" || lower === "dice" || lower === "d20") {
        return content.split("|")[0].trim();
      }

      // Recharge notation
      if (lower === "recharge") {
        const n = content.trim();
        return n ? `(Recharge ${n}-6)` : "(Recharge)";
      }

      // Tags where we just want the first part before any pipe
      if (
        [
          "condition", "spell", "creature", "item", "skill",
          "action", "status", "sense", "hazard", "disease",
          "race", "class", "background", "feat", "optfeature",
          "vehicle", "object", "reward", "psionic", "trap",
          "deity", "classFeature", "subclassFeature", "variantrule",
          "table", "book", "adventure", "quickref", "language",
          "card", "deck", "legroup", "itemMastery",
        ].includes(lower)
      ) {
        return content.split("|")[0].trim();
      }

      // Formatting
      if (lower === "b" || lower === "bold") return content;
      if (lower === "i" || lower === "italic") return content;
      if (lower === "s" || lower === "strike") return content;
      if (lower === "u" || lower === "underline") return content;
      if (lower === "note") return content;
      if (lower === "h") return content;
      if (lower === "font") return content.split("|").pop()?.trim() || content;
      if (lower === "sup" || lower === "sub") return content;
      if (lower === "area") return content.split("|")[0].trim();
      if (lower === "scaledamage" || lower === "scaledice") {
        return content.split("|")[0].trim();
      }
      if (lower === "filter") return content.split("|")[0].trim();
      if (lower === "link") return content.split("|")[0].trim();
      if (lower === "5etools") return content;
      if (lower === "chance") return `${content.split("|")[0].trim()}%`;

      // Default: return content (first segment before pipe)
      return content.split("|")[0].trim();
    });
  }

  return result;
}

/**
 * Recursively render 5e.tools "entries" arrays into a plain-text string.
 */
function renderEntries(entries: unknown): string {
  if (!entries) return "";
  if (typeof entries === "string") return stripTags(entries);
  if (typeof entries === "number") return String(entries);

  if (Array.isArray(entries)) {
    return entries.map((e) => renderEntries(e)).filter(Boolean).join("\n");
  }

  if (typeof entries === "object" && entries !== null) {
    const obj = entries as Record<string, unknown>;

    // "entries" type blocks
    if (obj.type === "entries" || obj.type === "section") {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      const body = renderEntries(obj.entries);
      return header + body;
    }

    // List type
    if (obj.type === "list") {
      const items = obj.items as unknown[] | undefined;
      if (items) {
        return items
          .map((item) => {
            if (typeof item === "string") return `- ${stripTags(item)}`;
            if (typeof item === "object" && item !== null) {
              const li = item as Record<string, unknown>;
              if (li.name && li.entries) {
                return `- ${stripTags(String(li.name))}: ${renderEntries(li.entries)}`;
              }
              if (li.entry) return `- ${renderEntries(li.entry)}`;
              if (li.entries) return `- ${renderEntries(li.entries)}`;
            }
            return `- ${renderEntries(item)}`;
          })
          .join("\n");
      }
    }

    // Table type
    if (obj.type === "table") {
      const caption = obj.caption ? `${stripTags(String(obj.caption))}\n` : "";
      const rows = obj.rows as unknown[][] | undefined;
      if (rows) {
        return (
          caption +
          rows.map((row) => row.map((cell) => renderEntries(cell)).join(" | ")).join("\n")
        );
      }
    }

    // Inline/inset
    if (obj.type === "inline" || obj.type === "inset" || obj.type === "insetReadaloud") {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      return header + renderEntries(obj.entries);
    }

    // Item (name: desc)
    if (obj.type === "item") {
      const name = obj.name ? `${stripTags(String(obj.name))}: ` : "";
      return name + (obj.entry ? renderEntries(obj.entry) : renderEntries(obj.entries));
    }

    // Cell type (table cells)
    if (obj.type === "cell") {
      return renderEntries(obj.entry) || renderEntries(obj.entries);
    }

    // If it has entries, render them
    if (obj.entries) {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      return header + renderEntries(obj.entries);
    }

    // If it has entry (singular)
    if (obj.entry) {
      return renderEntries(obj.entry);
    }
  }

  return "";
}

// ── Transform helpers ──────────────────────────────────────────────

function parseSize(size: unknown): string {
  if (Array.isArray(size)) {
    return size.map((s) => SIZE_MAP[String(s)] || String(s)).join("/");
  }
  if (typeof size === "string") return SIZE_MAP[size] || size;
  return "Medium";
}

function parseType(type: unknown): string {
  if (typeof type === "string") return type.toLowerCase();
  if (typeof type === "object" && type !== null) {
    const t = type as Record<string, unknown>;
    return String(t.type || "unknown").toLowerCase();
  }
  return "unknown";
}

function parseAlignment(align: unknown): string | null {
  if (!align) return null;
  if (typeof align === "string") return align;
  if (Array.isArray(align)) {
    if (align.length === 0) return null;
    // Check for special alignment objects
    if (typeof align[0] === "object" && align[0] !== null) {
      const obj = align[0] as Record<string, unknown>;
      if (obj.special) return stripTags(String(obj.special));
      if (obj.alignment) return parseAlignment(obj.alignment);
    }
    // Simple letter codes
    const parts = align
      .filter((a) => typeof a === "string")
      .map((a) => ALIGN_MAP[a as string] || a);
    if (parts.length === 0) return null;
    // Deduplicate "Neutral Neutral" → "True Neutral"
    if (parts.length === 2 && parts[0] === "Neutral" && parts[1] === "Neutral") {
      return "True Neutral";
    }
    return parts.join(" ");
  }
  return null;
}

function parseAC(ac: unknown): number {
  if (typeof ac === "number") return ac;
  if (Array.isArray(ac)) {
    for (const entry of ac) {
      if (typeof entry === "number") return entry;
      if (typeof entry === "object" && entry !== null) {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.ac === "number") return obj.ac;
      }
    }
  }
  return 10;
}

function parseHP(hp: unknown): { hit_points: number; hp_formula: string | null } {
  if (typeof hp === "number") return { hit_points: hp, hp_formula: null };
  if (typeof hp === "object" && hp !== null) {
    const obj = hp as Record<string, unknown>;
    return {
      hit_points: (obj.average as number) ?? 0,
      hp_formula: obj.formula ? String(obj.formula) : null,
    };
  }
  return { hit_points: 0, hp_formula: null };
}

function parseSpeed(speed: unknown): Record<string, string> {
  if (!speed || typeof speed !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(speed as Record<string, unknown>)) {
    if (key === "canHover") continue;
    if (typeof val === "number") {
      result[key] = `${val} ft.`;
    } else if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      const num = obj.number ?? obj.distance;
      if (num) {
        const cond = obj.condition ? ` ${stripTags(String(obj.condition))}` : "";
        result[key] = `${num} ft.${cond}`;
      }
    } else if (typeof val === "boolean") {
      // e.g. canHover: true — skip
    } else {
      result[key] = String(val);
    }
  }
  return result;
}

function parseCR(cr: unknown): string {
  if (typeof cr === "string") return cr;
  if (typeof cr === "number") return String(cr);
  if (typeof cr === "object" && cr !== null) {
    const obj = cr as Record<string, unknown>;
    return String(obj.cr ?? obj.coven ?? "0");
  }
  return "0";
}

function parseSaves(save: unknown): Record<string, number> | null {
  if (!save || typeof save !== "object") return null;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(save as Record<string, unknown>)) {
    const num = parseInt(String(val), 10);
    if (!isNaN(num)) {
      result[key.toUpperCase().slice(0, 3)] = num;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function parseSkills(skill: unknown): Record<string, number> | null {
  if (!skill || typeof skill !== "object") return null;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(skill as Record<string, unknown>)) {
    const num = parseInt(String(val), 10);
    if (!isNaN(num)) {
      // Capitalize skill name
      const name = key
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      result[name] = num;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function parseSenses(senses: unknown, passive: unknown): string | null {
  const parts: string[] = [];
  if (Array.isArray(senses)) {
    parts.push(...senses.map((s) => stripTags(String(s))));
  }
  if (passive != null) {
    parts.push(`passive Perception ${passive}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

function parseLanguages(languages: unknown): string | null {
  if (!languages) return null;
  if (typeof languages === "string") return stripTags(languages);
  if (Array.isArray(languages)) {
    return languages.map((l) => stripTags(String(l))).join(", ") || null;
  }
  return null;
}

function parseDamageTypes(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") return stripTags(field);
  if (Array.isArray(field)) {
    const parts: string[] = [];
    for (const item of field) {
      if (typeof item === "string") {
        parts.push(stripTags(item));
      } else if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        // Complex resistance objects: {resist: [...], note: "...", preNote: "..."}
        const types = (obj.resist || obj.immune || obj.vulnerable || obj.conditionImmune) as
          | unknown[]
          | undefined;
        const preNote = obj.preNote ? `${stripTags(String(obj.preNote))} ` : "";
        const note = obj.note ? ` ${stripTags(String(obj.note))}` : "";
        if (Array.isArray(types)) {
          const inner = types
            .map((t) => {
              if (typeof t === "string") return stripTags(t);
              if (typeof t === "object" && t !== null) {
                return stripTags(String((t as Record<string, unknown>).name || JSON.stringify(t)));
              }
              return String(t);
            })
            .join(", ");
          parts.push(`${preNote}${inner}${note}`);
        } else if (obj.special) {
          parts.push(stripTags(String(obj.special)));
        }
      }
    }
    return parts.length > 0 ? parts.join("; ") : null;
  }
  return null;
}

function parseConditionImmunities(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") return stripTags(field);
  if (Array.isArray(field)) {
    const parts: string[] = [];
    for (const item of field) {
      if (typeof item === "string") {
        parts.push(stripTags(item));
      } else if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if (obj.conditionImmune && Array.isArray(obj.conditionImmune)) {
          const conditions = (obj.conditionImmune as string[]).map((c) => stripTags(c));
          const note = obj.note ? ` ${stripTags(String(obj.note))}` : "";
          parts.push(conditions.join(", ") + note);
        } else if (obj.special) {
          parts.push(stripTags(String(obj.special)));
        }
      }
    }
    return parts.length > 0 ? parts.join("; ") : null;
  }
  return null;
}

/**
 * Parse actions/traits/legendary from 5e.tools format.
 * They come as: { name, entries: [...] }
 */
function parseActions(
  items: unknown[] | undefined
): MonsterAction[] | null {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const result: MonsterAction[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      result.push({ name: "", desc: stripTags(item) });
      continue;
    }
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;

    const name = obj.name ? stripTags(String(obj.name)) : "";
    const desc = renderEntries(obj.entries);

    result.push({ name, desc });
  }

  return result.length > 0 ? result : null;
}

/**
 * Parse spellcasting blocks into action format
 */
function parseSpellcasting(
  items: unknown[] | undefined
): MonsterAction[] | null {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const result: MonsterAction[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const name = obj.name ? stripTags(String(obj.name)) : "Spellcasting";
    const parts: string[] = [];

    // Header entries
    if (obj.headerEntries) {
      parts.push(renderEntries(obj.headerEntries));
    }

    // Spells by level
    if (obj.spells && typeof obj.spells === "object") {
      for (const [level, data] of Object.entries(obj.spells as Record<string, unknown>)) {
        if (typeof data !== "object" || data === null) continue;
        const spell = data as Record<string, unknown>;
        const slots = spell.slots ? ` (${spell.slots} slots)` : "";
        const spellList = Array.isArray(spell.spells)
          ? (spell.spells as string[]).map((s) => stripTags(s)).join(", ")
          : "";
        if (level === "0") {
          parts.push(`Cantrips (at will): ${spellList}`);
        } else {
          parts.push(`${level}${getOrdinal(Number(level))} level${slots}: ${spellList}`);
        }
      }
    }

    // At will, daily, etc.
    for (const freq of ["will", "ritual", "rest", "charges"]) {
      if (obj[freq] && Array.isArray(obj[freq])) {
        const spells = (obj[freq] as string[]).map((s) => stripTags(s)).join(", ");
        parts.push(`At ${freq}: ${spells}`);
      }
    }

    if (obj.daily && typeof obj.daily === "object") {
      for (const [times, spells] of Object.entries(obj.daily as Record<string, unknown>)) {
        if (Array.isArray(spells)) {
          const list = spells.map((s) => stripTags(String(s))).join(", ");
          const label = times.endsWith("e") ? `${times.slice(0, -1)}/day each` : `${times}/day`;
          parts.push(`${label}: ${list}`);
        }
      }
    }

    // Footer
    if (obj.footerEntries) {
      parts.push(renderEntries(obj.footerEntries));
    }

    result.push({ name, desc: parts.join("\n") });
  }

  return result.length > 0 ? result : null;
}

function getOrdinal(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

// ── Main transform ─────────────────────────────────────────────────

function transformMonster(
  raw: Record<string, unknown>,
  sourceCode: string,
  version: "2014" | "2024"
): SrdMonster | null {
  // Skip copy/variant entries that reference other monsters
  if (raw._copy) return null;

  const name = String(raw.name || "Unknown");
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = version === "2024" ? `${slug}-${sourceCode.toLowerCase()}-2024` : `${slug}-${sourceCode.toLowerCase()}`;

  const { hit_points, hp_formula } = parseHP(raw.hp);
  const cr = parseCR(raw.cr);

  // Merge spellcasting into special_abilities
  const traits = parseActions(raw.trait as unknown[] | undefined);
  const spellcastingActions = parseSpellcasting(raw.spellcasting as unknown[] | undefined);
  let special_abilities: MonsterAction[] | null = null;
  if (traits || spellcastingActions) {
    special_abilities = [...(traits || []), ...(spellcastingActions || [])];
  }

  return {
    id,
    name,
    source: sourceCode,
    cr,
    type: parseType(raw.type),
    hit_points,
    armor_class: parseAC(raw.ac),
    ruleset_version: version,
    size: parseSize(raw.size),
    alignment: parseAlignment(raw.alignment),
    hp_formula,
    speed: parseSpeed(raw.speed),
    str: (raw.str as number) ?? 10,
    dex: (raw.dex as number) ?? 10,
    con: (raw.con as number) ?? 10,
    int: (raw.int as number) ?? 10,
    wis: (raw.wis as number) ?? 10,
    cha: (raw.cha as number) ?? 10,
    saving_throws: parseSaves(raw.save),
    skills: parseSkills(raw.skill),
    damage_vulnerabilities: parseDamageTypes(raw.vulnerable),
    damage_resistances: parseDamageTypes(raw.resist),
    damage_immunities: parseDamageTypes(raw.immune),
    condition_immunities: parseConditionImmunities(raw.conditionImmune),
    senses: parseSenses(raw.senses, raw.passive),
    languages: parseLanguages(raw.languages),
    xp: CR_XP[cr] ?? null,
    special_abilities,
    actions: parseActions(raw.action as unknown[] | undefined),
    legendary_actions: parseActions(raw.legendary as unknown[] | undefined),
    reactions: parseActions(raw.reaction as unknown[] | undefined),
  };
}

// ── Fetch with retry ───────────────────────────────────────────────

async function fetchJSON(url: string, retries = 3): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`  Retry ${i + 1}/${retries} for ${url}: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Fetch index
  console.log("Fetching bestiary index from 5e.tools mirror...");
  const index = (await fetchJSON(INDEX_URL)) as Record<string, string>;
  if (!index) throw new Error("Failed to fetch index.json");

  const sourceEntries = Object.entries(index);
  console.log(`  Found ${sourceEntries.length} source books`);

  // 2. Fetch all bestiary files
  const monsters2014: SrdMonster[] = [];
  const monsters2024: SrdMonster[] = [];
  let totalRaw = 0;
  let skippedCopies = 0;

  // Process in batches of 5 to avoid overwhelming the connection
  const BATCH_SIZE = 5;
  for (let i = 0; i < sourceEntries.length; i += BATCH_SIZE) {
    const batch = sourceEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ([sourceCode, filename]) => {
        const url = `${BASE_URL}/${filename}`;
        const data = (await fetchJSON(url)) as Record<string, unknown> | null;
        if (!data) {
          console.warn(`  Skipping ${sourceCode}: failed to fetch ${filename}`);
          return { sourceCode, monsters: [] as Record<string, unknown>[] };
        }
        const monsterArray = (data.monster || []) as Record<string, unknown>[];
        return { sourceCode, monsters: monsterArray };
      })
    );

    for (const { sourceCode, monsters } of results) {
      if (monsters.length === 0) continue;
      totalRaw += monsters.length;

      const is2024 = SOURCES_2024.has(sourceCode);
      const version = is2024 ? "2024" : "2014";

      for (const raw of monsters) {
        const transformed = transformMonster(raw, sourceCode, version);
        if (!transformed) {
          skippedCopies++;
          continue;
        }

        if (is2024) {
          monsters2024.push(transformed);
        } else {
          monsters2014.push(transformed);
        }
      }

      const target = is2024 ? monsters2024 : monsters2014;
      console.log(
        `  [${String(i + results.indexOf(results.find((r) => r.sourceCode === sourceCode)!) + 1).padStart(3)}/${sourceEntries.length}] ${sourceCode.padEnd(12)} → ${monsters.length} monsters (${version})`
      );
    }
  }

  // 3. Sort and deduplicate by name (keep first occurrence)
  const dedup = (arr: SrdMonster[]): SrdMonster[] => {
    const seen = new Map<string, SrdMonster>();
    for (const m of arr) {
      const key = m.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, m);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const final2014 = dedup(monsters2014);
  const final2024 = dedup(monsters2024);

  // 4. Write output
  const files = [
    { name: "monsters-2014.json", data: final2014 },
    { name: "monsters-2024.json", data: final2024 },
  ];

  for (const f of files) {
    const path = join(OUTPUT_DIR, f.name);
    const json = JSON.stringify(f.data, null, 2);
    writeFileSync(path, json);
    const sizeMB = (Buffer.byteLength(json) / (1024 * 1024)).toFixed(1);
    console.log(`  ${f.name}: ${f.data.length} monsters (${sizeMB} MB)`);
  }

  console.log(`\nDone!`);
  console.log(`  Total raw entries: ${totalRaw}`);
  console.log(`  Skipped (copies/variants): ${skippedCopies}`);
  console.log(`  2014 monsters: ${final2014.length}`);
  console.log(`  2024 monsters: ${final2024.length}`);
  console.log(`  Combined unique: ${final2014.length + final2024.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
