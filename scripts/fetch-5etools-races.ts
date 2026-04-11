#!/usr/bin/env ts-node
/**
 * fetch-5etools-races.ts
 *
 * Fetches the complete 5e.tools race compendium from the GitHub mirror
 * and transforms every race into the project's SrdRaceFull format.
 *
 * Run:  npx tsx scripts/fetch-5etools-races.ts
 *
 * Outputs:
 *   data/srd/races-full.json  (all races with traits, full dataset)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────

const DATA_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data";
const RACES_URL = `${DATA_URL}/races.json`;
const FLUFF_URL = `${DATA_URL}/fluff-races.json`;
const OUTPUT_DIR = join(process.cwd(), "data", "srd");

const SOURCES_2024 = new Set(["XPHB", "XDMG", "XMM"]);

// ── Types ───────────────────────────────────────────────────────────

interface SrdRaceTrait {
  name: string;
  description: string;
}

interface SrdSubrace {
  name: string;
  source: string;
  traits: SrdRaceTrait[];
}

interface SrdRaceFull {
  id: string;
  name: string;
  source: string;
  ruleset_version: "2014" | "2024";
  srd?: boolean;
  basicRules?: boolean;
  size: string[];
  speed: number | Record<string, number>;
  darkvision: number | null;
  ability_bonuses: string;
  languages: string;
  traits: SrdRaceTrait[];
  subraces?: SrdSubrace[];
}

// ── Markup stripping (reused from feats/items crawlers) ─────────────

function stripTags(text: string): string {
  if (typeof text !== "string") return String(text ?? "");

  let result = text;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(
      /\{@([a-zA-Z]+)\s([^{}]*?)\}/g,
      (_match, tag: string, content: string) => {
        const lower = tag.toLowerCase();

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
        if (lower === "hit") return `+${content.trim()}`;
        if (lower === "dc") return `DC ${content.trim()}`;
        if (lower === "damage" || lower === "dice" || lower === "d20") {
          return content.split("|")[0].trim();
        }
        if (lower === "recharge") {
          const n = content.trim();
          return n ? `(Recharge ${n}-6)` : "(Recharge)";
        }
        if (lower === "scaledamage" || lower === "scaledice") {
          return content.split("|")[2]?.trim() || content.split("|")[0].trim();
        }
        if (
          [
            "condition", "spell", "creature", "item", "skill",
            "action", "status", "sense", "hazard", "disease",
            "race", "class", "background", "feat", "optfeature",
            "vehicle", "object", "reward", "psionic", "trap",
            "deity", "classFeature", "subclassFeature", "variantrule",
            "table", "book", "adventure", "quickref", "language",
            "card", "deck", "legroup", "itemMastery", "filter",
          ].includes(lower)
        ) {
          return content.split("|")[0].trim();
        }
        if (
          ["b", "bold", "i", "italic", "s", "strike", "u", "underline", "note", "h"].includes(
            lower
          )
        )
          return content;
        if (lower === "font") return content.split("|").pop()?.trim() || content;
        if (lower === "sup" || lower === "sub") return content;
        if (lower === "area") return content.split("|")[0].trim();
        if (lower === "link") return content.split("|")[0].trim();
        if (lower === "5etools") return content;
        if (lower === "chance") return `${content.split("|")[0].trim()}%`;

        return content.split("|")[0].trim();
      }
    );
  }

  return result;
}

function renderEntries(entries: unknown): string {
  if (!entries) return "";
  if (typeof entries === "string") return stripTags(entries);
  if (typeof entries === "number") return String(entries);

  if (Array.isArray(entries)) {
    return entries.map((e) => renderEntries(e)).filter(Boolean).join("\n");
  }

  if (typeof entries === "object" && entries !== null) {
    const obj = entries as Record<string, unknown>;

    if (obj.type === "entries" || obj.type === "section") {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      return header + renderEntries(obj.entries);
    }
    if (obj.type === "list") {
      const items = obj.items as unknown[] | undefined;
      if (items) {
        return items
          .map((item) => {
            if (typeof item === "string") return `- ${stripTags(item)}`;
            if (typeof item === "object" && item !== null) {
              const li = item as Record<string, unknown>;
              if (li.name && li.entries)
                return `- ${stripTags(String(li.name))}: ${renderEntries(li.entries)}`;
              if (li.entry) return `- ${renderEntries(li.entry)}`;
              if (li.entries) return `- ${renderEntries(li.entries)}`;
            }
            return `- ${renderEntries(item)}`;
          })
          .join("\n");
      }
    }
    if (obj.type === "table") {
      const caption = obj.caption ? `${stripTags(String(obj.caption))}\n` : "";
      const colLabels = obj.colLabels as string[] | undefined;
      const rows = obj.rows as unknown[][] | undefined;
      let tableStr = caption;
      if (colLabels) {
        tableStr += colLabels.map((l) => stripTags(l)).join(" | ") + "\n";
      }
      if (rows) {
        tableStr += rows
          .map((row) => row.map((cell) => renderEntries(cell)).join(" | "))
          .join("\n");
      }
      return tableStr;
    }
    if (obj.type === "item") {
      const name = obj.name ? `${stripTags(String(obj.name))}: ` : "";
      return name + (obj.entry ? renderEntries(obj.entry) : renderEntries(obj.entries));
    }
    if (
      obj.type === "inline" ||
      obj.type === "inset" ||
      obj.type === "insetReadaloud"
    ) {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      return header + renderEntries(obj.entries);
    }
    if (obj.type === "cell") {
      return renderEntries(obj.entry) || renderEntries(obj.entries);
    }
    if (obj.entries) {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      return header + renderEntries(obj.entries);
    }
    if (obj.entry) return renderEntries(obj.entry);
  }

  return "";
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

// ── _copy resolution ──────────────────────────────────────────────

/** Key for race lookup by name+source */
function raceKey(name: string, source: string): string {
  return `${name}|||${source}`;
}

/**
 * Resolves _copy inheritance chains. Races with _copy inherit all fields
 * from the parent, then overlay their own fields on top.
 * Handles chains (A copies B copies C) via recursive resolution.
 */
function resolveCopyRaces(
  races: Record<string, unknown>[]
): Record<string, unknown>[] {
  // Build lookup of all races by name+source
  const lookup = new Map<string, Record<string, unknown>>();
  for (const race of races) {
    const name = String(race.name || "");
    const source = String(race.source || "");
    if (name) lookup.set(raceKey(name, source), race);
  }

  const resolved = new Map<string, Record<string, unknown>>();
  const resolving = new Set<string>(); // cycle detection

  function resolve(
    race: Record<string, unknown>
  ): Record<string, unknown> {
    const key = raceKey(String(race.name), String(race.source));

    // Already resolved
    const cached = resolved.get(key);
    if (cached) return cached;

    // No _copy — return as-is
    if (!race._copy) {
      resolved.set(key, race);
      return race;
    }

    // Cycle detection
    if (resolving.has(key)) return race;
    resolving.add(key);

    const copyRef = race._copy as Record<string, unknown>;
    const parentKey = raceKey(String(copyRef.name), String(copyRef.source));
    const parent = lookup.get(parentKey);

    if (!parent) {
      // Parent not found — treat as standalone
      const standalone = { ...race };
      delete standalone._copy;
      resolved.set(key, standalone);
      resolving.delete(key);
      return standalone;
    }

    // Recursively resolve the parent first
    const resolvedParent = resolve(parent);

    // Merge: parent fields as base, child fields overlay
    const merged: Record<string, unknown> = { ...resolvedParent };
    for (const [k, v] of Object.entries(race)) {
      if (k === "_copy") continue;
      merged[k] = v;
    }

    // Handle _mod overlays if present (5e.tools uses _mod for partial overrides)
    const copyMod = copyRef._mod as Record<string, unknown> | undefined;
    if (copyMod) {
      applyMod(merged, copyMod);
    }

    resolved.set(key, merged);
    resolving.delete(key);
    return merged;
  }

  return races.map(resolve);
}

/**
 * Applies _mod operations from _copy blocks.
 * Common operations: replaceArr, appendArr, removeArr, replaceTxt
 */
function applyMod(
  target: Record<string, unknown>,
  mod: Record<string, unknown>
): void {
  for (const [field, operations] of Object.entries(mod)) {
    // Skip wildcard or non-object mods
    if (field === "_") continue;
    if (typeof operations !== "object" || operations === null) continue;

    const ops = Array.isArray(operations) ? operations : [operations];
    for (const op of ops) {
      if (typeof op !== "object" || op === null) continue;
      const operation = op as Record<string, unknown>;
      const mode = String(operation.mode || "");

      if (mode === "replaceArr") {
        // Replace entire array entry matching by name
        const arr = target[field] as unknown[] | undefined;
        if (Array.isArray(arr) && operation.replace) {
          const replacement = operation.replace as Record<string, unknown>;
          const idx = arr.findIndex(
            (e) =>
              typeof e === "object" &&
              e !== null &&
              (e as Record<string, unknown>).name === replacement.name
          );
          if (idx >= 0) arr[idx] = replacement;
        }
      } else if (mode === "appendArr") {
        // Append items to array
        const arr = target[field] as unknown[] | undefined;
        if (Array.isArray(arr) && operation.items) {
          const newItems = Array.isArray(operation.items) ? operation.items : [];
          arr.push(...newItems);
        }
      } else if (mode === "removeArr") {
        // Remove entries from array by name
        const arr = target[field] as unknown[] | undefined;
        if (Array.isArray(arr) && operation.names) {
          const names = Array.isArray(operation.names) ? operation.names : [];
          const namesToRemove = new Set(names as string[]);
          target[field] = arr.filter(
            (e) =>
              !(
                typeof e === "object" &&
                e !== null &&
                namesToRemove.has(String((e as Record<string, unknown>).name))
              )
          );
        }
      } else if (mode === "replaceTxt") {
        // Replace text in string fields
        if (
          typeof target[field] === "string" &&
          operation.replace &&
          operation.with
        ) {
          target[field] = (target[field] as string).replace(
            String(operation.replace),
            String(operation.with)
          );
        }
      }
    }
  }
}

// ── Ability bonus parsing ──────────────────────────────────────────

const ABILITY_NAMES: Record<string, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

/**
 * Transforms ability array from 5e.tools format to readable string.
 * Input:  [{"str": 2, "cha": 1}]  or  [{"choose": {"from": ["str","dex"], "count": 1, "amount": 2}}]
 * Output: "STR +2, CHA +1"  or  "Choose one of STR, DEX +2"
 */
function parseAbilityBonuses(ability: unknown): string {
  if (!ability || !Array.isArray(ability)) return "";

  const parts: string[] = [];

  for (const block of ability) {
    if (typeof block !== "object" || block === null) continue;
    const obj = block as Record<string, unknown>;

    // Fixed bonuses: { "str": 2, "cha": 1 }
    for (const [key, val] of Object.entries(obj)) {
      if (key === "choose") continue;
      const abilityName = ABILITY_NAMES[key.toLowerCase()];
      if (abilityName && typeof val === "number") {
        const sign = val >= 0 ? "+" : "";
        parts.push(`${abilityName} ${sign}${val}`);
      }
    }

    // Choice bonuses: { "choose": { "from": [...], "count": 1, "amount": 2 } }
    if (obj.choose) {
      const choose = obj.choose as Record<string, unknown>;
      const from = choose.from as string[] | undefined;
      const count = (choose.count as number) || 1;
      const amount = (choose.amount as number) || 1;
      const sign = amount >= 0 ? "+" : "";

      if (from && from.length > 0) {
        const abilityList = from
          .map((a) => ABILITY_NAMES[a.toLowerCase()] || a.toUpperCase())
          .join(", ");
        parts.push(`Choose ${count} of ${abilityList} ${sign}${amount}`);
      } else {
        // "choose any" pattern
        parts.push(`Choose ${count} ability score ${sign}${amount}`);
      }
    }
  }

  return parts.join(", ");
}

// ── Language parsing ──────────────────────────────────────────────

/**
 * Transforms languageProficiencies from 5e.tools format to readable string.
 * Input:  [{"common": true, "celestial": true}]
 * Output: "Common, Celestial"
 */
function parseLanguages(langProfs: unknown): string {
  if (!langProfs || !Array.isArray(langProfs)) return "";

  const parts: string[] = [];

  for (const block of langProfs) {
    if (typeof block !== "object" || block === null) continue;
    const obj = block as Record<string, unknown>;

    for (const [key, val] of Object.entries(obj)) {
      if (key === "anyStandard" || key === "any") {
        const count = typeof val === "number" ? val : 1;
        parts.push(
          count === 1 ? "One language of your choice" : `${count} languages of your choice`
        );
      } else if (key === "choose") {
        // { "choose": { "from": [...], "count": 1 } }
        const choose = val as Record<string, unknown>;
        const from = choose.from as string[] | undefined;
        const count = (choose.count as number) || 1;
        if (from && from.length > 0) {
          const langList = from.map(capitalize).join(", ");
          parts.push(`Choose ${count} from ${langList}`);
        }
      } else if (val === true) {
        parts.push(capitalize(key));
      }
    }
  }

  return parts.join(", ");
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Speed parsing ─────────────────────────────────────────────────

/**
 * Normalizes speed from 5e.tools format.
 * Input can be:
 *   - number: 30
 *   - object: { "walk": 30, "fly": 60, "swim": 30 }
 *   - object with walk as number: { "walk": 30 }
 * Output: number (if walk only) or Record<string, number>
 */
function parseSpeed(raw: unknown): number | Record<string, number> {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "object" || raw === null) return 30; // default

  const obj = raw as Record<string, unknown>;
  const result: Record<string, number> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (key === "canHover" || key === "choose") continue;
    if (typeof val === "number") {
      result[key] = val;
    } else if (typeof val === "object" && val !== null) {
      // Some speeds are { "number": 30, "condition": "..." }
      const nested = val as Record<string, unknown>;
      if (typeof nested.number === "number") {
        result[key] = nested.number;
      }
    } else if (typeof val === "boolean" && val === true) {
      // e.g. "fly": true means equal to walk speed
      if (typeof result.walk === "number") {
        result[key] = result.walk;
      }
    }
  }

  // If only walk speed, return as number
  const keys = Object.keys(result);
  if (keys.length === 1 && keys[0] === "walk") return result.walk;
  if (keys.length === 0) return 30;

  return result;
}

// ── Darkvision extraction ─────────────────────────────────────────

/**
 * Extracts darkvision distance.
 * First checks the top-level `darkvision` field.
 * Falls back to scanning entries for "Darkvision" trait.
 */
function parseDarkvision(
  raw: Record<string, unknown>
): number | null {
  // Direct field
  if (typeof raw.darkvision === "number") return raw.darkvision;

  // Check entries for a Darkvision trait
  const entries = raw.entries as unknown[] | undefined;
  if (entries && Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) continue;
      const obj = entry as Record<string, unknown>;
      if (
        (obj.type === "entries" || obj.type === "section") &&
        typeof obj.name === "string" &&
        obj.name.toLowerCase().includes("darkvision")
      ) {
        // Try to extract distance from the description
        const desc = renderEntries(obj.entries);
        const match = desc.match(/(\d+)\s*(?:feet|ft)/i);
        if (match) return parseInt(match[1], 10);
        return 60; // default darkvision distance
      }
    }
  }

  return null;
}

// ── Trait extraction ──────────────────────────────────────────────

/**
 * Extracts racial traits from entries array.
 * Each entry with type "entries" and a name becomes a trait.
 */
function extractTraits(entries: unknown): SrdRaceTrait[] {
  if (!entries || !Array.isArray(entries)) return [];

  const traits: SrdRaceTrait[] = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      // Top-level description string — include as unnamed trait
      const desc = stripTags(entry);
      if (desc.trim()) {
        traits.push({ name: "Description", description: desc });
      }
      continue;
    }

    if (typeof entry !== "object" || entry === null) continue;
    const obj = entry as Record<string, unknown>;

    if (
      (obj.type === "entries" || obj.type === "section") &&
      typeof obj.name === "string"
    ) {
      const name = stripTags(obj.name);
      const description = renderEntries(obj.entries);
      if (name && description) {
        traits.push({ name, description });
      }
    } else if (obj.type === "list" || obj.type === "table") {
      // Render inline lists/tables as part of traits
      const rendered = renderEntries(entry);
      if (rendered.trim()) {
        traits.push({ name: "Additional", description: rendered });
      }
    }
  }

  return traits;
}

// ── Subrace parsing ───────────────────────────────────────────────

/**
 * Transforms subraces from 5e.tools format.
 */
function parseSubraces(subraces: unknown): SrdSubrace[] | undefined {
  if (!subraces || !Array.isArray(subraces)) return undefined;

  const result: SrdSubrace[] = [];

  for (const sub of subraces) {
    if (typeof sub !== "object" || sub === null) continue;
    const obj = sub as Record<string, unknown>;

    // Skip _copy subraces that can't be resolved at this level
    if (obj._copy) continue;

    const name = String(obj.name || "Unknown");
    const source = String(obj.source || "PHB");
    const traits = extractTraits(obj.entries as unknown[]);

    // Also extract ability bonuses as a trait if present
    if (obj.ability) {
      const abilityStr = parseAbilityBonuses(obj.ability);
      if (abilityStr) {
        traits.unshift({
          name: "Ability Score Increase",
          description: abilityStr,
        });
      }
    }

    result.push({ name, source, traits });
  }

  return result.length > 0 ? result : undefined;
}

// ── Size parsing ──────────────────────────────────────────────────

function parseSize(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => {
      if (typeof s === "string") return s;
      // Some sizes are objects: { "size": "M" }
      if (typeof s === "object" && s !== null) {
        const obj = s as Record<string, unknown>;
        return String(obj.size || "M");
      }
      return "M";
    });
  }
  return ["M"]; // default
}

// ── Transform ───────────────────────────────────────────────────────

function transformRace(raw: Record<string, unknown>): SrdRaceFull | null {
  const name = String(raw.name || "Unknown");
  const sourceCode = String(raw.source || "PHB");
  const is2024 = SOURCES_2024.has(sourceCode);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = is2024
    ? `${slug}-${sourceCode.toLowerCase()}-2024`
    : `${slug}-${sourceCode.toLowerCase()}`;

  const size = parseSize(raw.size);
  const speed = parseSpeed(raw.speed);
  const darkvision = parseDarkvision(raw);
  const abilityBonuses = parseAbilityBonuses(raw.ability);
  const languages = parseLanguages(raw.languageProficiencies);
  const traits = extractTraits(raw.entries as unknown[]);
  const subraces = parseSubraces(raw.subraces);

  const race: SrdRaceFull = {
    id,
    name,
    source: sourceCode,
    ruleset_version: is2024 ? "2024" : "2014",
    size,
    speed,
    darkvision,
    ability_bonuses: abilityBonuses,
    languages,
    traits,
  };

  if (raw.srd === true || raw.srd52 === true) race.srd = true;
  if (raw.basicRules === true || raw.basicRules2024 === true)
    race.basicRules = true;
  if (subraces) race.subraces = subraces;

  return race;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Fetch races
  console.log("Fetching races from 5e.tools mirror...");
  const racesData = (await fetchJSON(RACES_URL)) as Record<
    string,
    unknown
  > | null;
  if (!racesData) throw new Error("Failed to fetch races.json");

  const rawRaces = (racesData.race || []) as Record<string, unknown>[];
  const rawSubraces = (racesData.subrace || []) as Record<string, unknown>[];
  console.log(
    `  Found ${rawRaces.length} races + ${rawSubraces.length} standalone subraces`
  );

  // 2. Fetch fluff (optional — for lore, not used in output but logged)
  console.log("Fetching race fluff (lore)...");
  const fluffData = (await fetchJSON(FLUFF_URL)) as Record<
    string,
    unknown
  > | null;
  if (fluffData) {
    const fluffEntries = (fluffData.raceFluff || []) as unknown[];
    console.log(`  Found ${fluffEntries.length} fluff entries (lore available)`);
  } else {
    console.log("  No fluff data found (optional, continuing)");
  }

  // 3. Merge standalone subraces into their parent races
  // 5e.tools has some subraces defined at top level rather than nested
  const raceMap = new Map<string, Record<string, unknown>>();
  for (const race of rawRaces) {
    const key = raceKey(String(race.name), String(race.source));
    raceMap.set(key, race);
  }

  for (const sub of rawSubraces) {
    const raceName = String(sub.raceName || "");
    const raceSource = String(sub.raceSource || sub.source || "");
    const parentKey = raceKey(raceName, raceSource);
    const parent = raceMap.get(parentKey);

    if (parent) {
      // Append to parent's subraces array
      if (!parent.subraces) parent.subraces = [];
      (parent.subraces as Record<string, unknown>[]).push(sub);
    }
  }

  // 4. Resolve _copy inheritance chains
  console.log("\nResolving _copy inheritance...");
  const copyCount = rawRaces.filter((r) => r._copy).length;
  const resolvedRaces = resolveCopyRaces(rawRaces);
  console.log(`  Resolved ${copyCount} _copy races`);

  // 5. Transform all races
  console.log("\nTransforming races...");
  const allRaces: SrdRaceFull[] = [];
  let skipped = 0;

  for (const raw of resolvedRaces) {
    const transformed = transformRace(raw);
    if (!transformed) {
      skipped++;
      continue;
    }
    allRaces.push(transformed);
  }

  // 6. Deduplicate by id (keep first occurrence)
  const seen = new Map<string, SrdRaceFull>();
  for (const race of allRaces) {
    if (!seen.has(race.id)) {
      seen.set(race.id, race);
    }
  }
  const deduped = Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // 7. Write output
  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(join(OUTPUT_DIR, "races-full.json"), json);
  const sizeMB = (Buffer.byteLength(json) / (1024 * 1024)).toFixed(1);

  // 8. Stats
  const sources: Record<string, number> = {};
  for (const r of deduped) sources[r.source] = (sources[r.source] || 0) + 1;

  const srdCount = deduped.filter((r) => r.srd).length;
  const basicRulesCount = deduped.filter((r) => r.basicRules).length;
  const with2024 = deduped.filter((r) => r.ruleset_version === "2024").length;
  const withSubraces = deduped.filter((r) => r.subraces && r.subraces.length > 0).length;
  const totalSubraces = deduped.reduce(
    (acc, r) => acc + (r.subraces?.length || 0),
    0
  );
  const withDarkvision = deduped.filter((r) => r.darkvision !== null).length;

  console.log(
    `\n  races-full.json: ${deduped.length} races (${sizeMB} MB) → data/srd/`
  );
  console.log(`  Skipped: ${skipped}`);
  console.log(`  SRD races: ${srdCount}`);
  console.log(`  Basic Rules races: ${basicRulesCount}`);
  console.log(`  2024 ruleset races: ${with2024}`);
  console.log(`  Races with subraces: ${withSubraces} (${totalSubraces} total subraces)`);
  console.log(`  Races with darkvision: ${withDarkvision}`);
  console.log(`\n  By source:`);
  Object.entries(sources)
    .sort(([, a], [, b]) => b - a)
    .forEach(([s, c]) => console.log(`    ${s}: ${c}`));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
