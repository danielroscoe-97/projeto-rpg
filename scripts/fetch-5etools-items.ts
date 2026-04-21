#!/usr/bin/env ts-node
/**
 * fetch-5etools-items.ts
 *
 * Crawls the complete 5e.tools item compendium from the GitHub mirror
 * and transforms every item into the project's SrdItem format.
 *
 * Sources:
 *   - items-base.json  (~230 mundane/base items)
 *   - items.json        (~2400 magic/special items)
 *
 * Run:  npx ts-node scripts/fetch-5etools-items.ts
 *   or: npm run fetch-items
 *
 * Output:
 *   public/srd/items.json  (consolidated array of all items)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────

const DATA_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data";
const ITEMS_URL = `${DATA_URL}/items.json`;
const ITEMS_BASE_URL = `${DATA_URL}/items-base.json`;
const MAGIC_VARIANTS_URL = `${DATA_URL}/magicvariants.json`;
const OUTPUT_DIR = join(process.cwd(), "data", "srd");
const PUBLIC_DIR = join(process.cwd(), "public", "srd");

// Sources that represent the 2024 revised ruleset
const SOURCES_2024 = new Set(["XPHB", "XDMG", "XMM"]);

// ── Types ───────────────────────────────────────────────────────────

type ItemRarity =
  | "none"
  | "common"
  | "uncommon"
  | "rare"
  | "very rare"
  | "legendary"
  | "artifact"
  | "varies"
  | "unknown";

type ItemType =
  | "melee-weapon"
  | "ranged-weapon"
  | "light-armor"
  | "medium-armor"
  | "heavy-armor"
  | "shield"
  | "potion"
  | "scroll"
  | "ring"
  | "wand"
  | "rod"
  | "staff"
  | "adventuring-gear"
  | "tool"
  | "instrument"
  | "gaming-set"
  | "artisan-tools"
  | "spellcasting-focus"
  | "ammunition"
  | "wondrous"
  | "trade-good"
  | "art-object"
  | "gemstone"
  | "vehicle"
  | "mount"
  | "food-drink"
  | "explosive"
  | "other";

interface SrdItem {
  id: string;
  name: string;
  source: string;
  type: ItemType;
  rarity: ItemRarity;
  isMagic: boolean;
  value?: number;
  weight?: number;
  ac?: number;
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  weaponCategory?: "simple" | "martial";
  property?: string[];
  range?: string;
  stealth?: boolean;
  strength?: string;
  reqAttune?: boolean | string;
  charges?: number;
  recharge?: string;
  bonusWeapon?: string;
  bonusAc?: string;
  wondrous?: boolean;
  curse?: boolean;
  sentient?: boolean;
  entries: string[];
  baseItem?: string;
  edition?: "classic" | "one";
  srd?: boolean;
  basicRules?: boolean;
}

// ── Type code normalization ─────────────────────────────────────────

function normalizeTypeCode(raw: string | undefined, item: Record<string, unknown>): ItemType {
  if (!raw) {
    // No type field — check wondrous
    if (item.wondrous) return "wondrous";
    return "other";
  }

  // Strip source suffix: "RG|DMG" → "RG"
  const code = raw.split("|")[0].toUpperCase();

  switch (code) {
    // Weapons
    case "M": return "melee-weapon";
    case "R": return "ranged-weapon";
    // Armor
    case "LA": return "light-armor";
    case "MA": return "medium-armor";
    case "HA": return "heavy-armor";
    case "S": return "shield";
    // Consumables
    case "P": return "potion";
    case "SC": return "scroll";
    // Magic item categories
    case "RG": return "ring";
    case "WD": return "wand";
    case "RD": return "rod";
    // Equipment
    case "G": return "adventuring-gear";
    case "SCF": return "spellcasting-focus";
    case "INS": return "instrument";
    case "AT": return "artisan-tools";
    case "T": return "tool";
    case "GS": return "gaming-set";
    case "A": return "ammunition";
    case "AF": return "ammunition";
    // Treasure/Trade
    case "TG": return "trade-good";
    case "$A": return "art-object";
    case "$G": return "gemstone";
    case "$C": return "other"; // coins
    // Vehicles
    case "AIR": return "vehicle";
    case "SHP": return "vehicle";
    case "VEH": return "vehicle";
    case "SPC": return "vehicle";
    case "MNT": return "mount";
    // Other
    case "FD": return "food-drink";
    case "EXP": return "explosive";
    case "TAH": return "adventuring-gear";
    case "OTH": return "other";
    case "TB": return "other";
    default:
      // Check wondrous fallback
      if (item.wondrous) return "wondrous";
      // Staff items often have staff: true
      if (item.staff) return "staff";
      return "other";
  }
}

// ── Rarity normalization ────────────────────────────────────────────

function normalizeRarity(raw: unknown): ItemRarity {
  if (!raw) return "none";
  const str = String(raw).toLowerCase().trim();
  switch (str) {
    case "none": return "none";
    case "common": return "common";
    case "uncommon": return "uncommon";
    case "rare": return "rare";
    case "very rare": return "very rare";
    case "legendary": return "legendary";
    case "artifact": return "artifact";
    case "varies": return "varies";
    case "unknown":
    case "unknown (magic)":
      return "unknown";
    default:
      return "none";
  }
}

// ── Damage type codes ───────────────────────────────────────────────

const DMG_TYPE_MAP: Record<string, string> = {
  B: "bludgeoning",
  P: "piercing",
  S: "slashing",
  A: "acid",
  C: "cold",
  F: "fire",
  O: "force",
  L: "lightning",
  N: "necrotic",
  I: "poison",
  Y: "psychic",
  R: "radiant",
  T: "thunder",
};

// ── Property codes ──────────────────────────────────────────────────

const PROPERTY_MAP: Record<string, string> = {
  A: "Ammunition",
  AF: "Ammunition (Firearm)",
  BF: "Burst Fire",
  F: "Finesse",
  H: "Heavy",
  L: "Light",
  LD: "Loading",
  R: "Reach",
  RLD: "Reload",
  S: "Special",
  T: "Thrown",
  "2H": "Two-Handed",
  V: "Versatile",
};

// ── Markup stripping (reused from bestiary/spells crawlers) ─────────

function stripTags(text: string): string {
  if (typeof text !== "string") return String(text ?? "");

  let result = text;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(/\{@([a-zA-Z]+)\s([^{}]*?)\}/g, (_match, tag: string, content: string) => {
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
      if (lower === "b" || lower === "bold") return content;
      if (lower === "i" || lower === "italic") return content;
      if (lower === "s" || lower === "strike") return content;
      if (lower === "u" || lower === "underline") return content;
      if (lower === "note") return content;
      if (lower === "h") return content;
      if (lower === "font") return content.split("|").pop()?.trim() || content;
      if (lower === "sup" || lower === "sub") return content;
      if (lower === "area") return content.split("|")[0].trim();
      if (lower === "link") return content.split("|")[0].trim();
      if (lower === "5etools") return content;
      if (lower === "chance") return `${content.split("|")[0].trim()}%`;

      return content.split("|")[0].trim();
    });
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
              if (li.name && li.entries) return `- ${stripTags(String(li.name))}: ${renderEntries(li.entries)}`;
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
        tableStr += rows.map((row) => row.map((cell) => renderEntries(cell)).join(" | ")).join("\n");
      }
      return tableStr;
    }
    if (obj.type === "item") {
      const name = obj.name ? `${stripTags(String(obj.name))}: ` : "";
      return name + (obj.entry ? renderEntries(obj.entry) : renderEntries(obj.entries));
    }
    if (obj.type === "inline" || obj.type === "inset" || obj.type === "insetReadaloud") {
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

// ── Transform ───────────────────────────────────────────────────────

function transformItem(
  raw: Record<string, unknown>,
  isBaseItem: boolean
): SrdItem | null {

  const name = String(raw.name || "Unknown");
  const sourceCode = String(raw.source || "PHB");
  const is2024 = SOURCES_2024.has(sourceCode);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `${slug}-${sourceCode.toLowerCase()}`;

  const rarity = normalizeRarity(raw.rarity);
  const isMagic = rarity !== "none" && !isBaseItem;
  const type = normalizeTypeCode(raw.type as string | undefined, raw);

  // Parse entries to string array
  const entriesRaw = raw.entries as unknown[] | undefined;
  const entriesStrings: string[] = [];
  if (entriesRaw && Array.isArray(entriesRaw)) {
    for (const entry of entriesRaw) {
      const rendered = renderEntries(entry);
      if (rendered) entriesStrings.push(rendered);
    }
  }

  // Parse properties
  let property: string[] | undefined;
  if (raw.property && Array.isArray(raw.property)) {
    property = (raw.property as unknown[])
      .filter((p) => typeof p === "string")
      .map((p) => {
        const code = (p as string).split("|")[0].toUpperCase();
        return PROPERTY_MAP[code] || code;
      });
  }

  // Parse damage type
  let dmgType: string | undefined;
  if (raw.dmgType) {
    const code = String(raw.dmgType);
    dmgType = DMG_TYPE_MAP[code] || code;
  }

  // Parse attunement
  let reqAttune: boolean | string | undefined;
  if (raw.reqAttune === true) {
    reqAttune = true;
  } else if (typeof raw.reqAttune === "string") {
    reqAttune = stripTags(raw.reqAttune);
  }

  const item: SrdItem = {
    id,
    name,
    source: sourceCode,
    type,
    rarity,
    isMagic,
    entries: entriesStrings,
    edition: is2024 ? "one" : "classic",
  };

  // Optional fields — only include if present
  if (raw.value != null) item.value = Number(raw.value);
  if (raw.weight != null) item.weight = Number(raw.weight);
  if (raw.ac != null) item.ac = Number(raw.ac);
  if (raw.dmg1) item.dmg1 = String(raw.dmg1);
  if (raw.dmg2) item.dmg2 = String(raw.dmg2);
  if (dmgType) item.dmgType = dmgType;
  if (raw.weaponCategory) item.weaponCategory = String(raw.weaponCategory) as "simple" | "martial";
  if (property && property.length > 0) item.property = property;
  if (raw.range) item.range = String(raw.range);
  if (raw.stealth === true) item.stealth = true;
  if (raw.strength) item.strength = String(raw.strength);
  if (reqAttune != null) item.reqAttune = reqAttune;
  if (raw.charges != null) item.charges = Number(raw.charges);
  if (raw.recharge) item.recharge = String(raw.recharge);
  if (raw.bonusWeapon) item.bonusWeapon = String(raw.bonusWeapon);
  if (raw.bonusAc) item.bonusAc = String(raw.bonusAc);
  if (raw.wondrous === true) item.wondrous = true;
  if (raw.curse === true) item.curse = true;
  if (raw.sentient === true) item.sentient = true;
  if (raw.baseItem) item.baseItem = String(raw.baseItem);
  if (raw.srd === true || raw.srd52 === true) item.srd = true;
  if (raw.basicRules === true || raw.basicRules2024 === true) item.basicRules = true;

  return item;
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

/** Key for item lookup by name+source */
function itemKey(name: string, source: string): string {
  return `${name}|||${source}`;
}

/**
 * Resolves _copy inheritance chains. Items with _copy inherit all fields
 * from the parent, then overlay their own fields on top.
 * Handles chains (A copies B copies C) via recursive resolution.
 */
function resolveCopyItems(items: Record<string, unknown>[]): Record<string, unknown>[] {
  // Build lookup of all items by name+source
  const lookup = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    const name = String(item.name || "");
    const source = String(item.source || "");
    if (name) lookup.set(itemKey(name, source), item);
  }

  const resolved = new Map<string, Record<string, unknown>>();
  const resolving = new Set<string>(); // cycle detection

  function resolve(item: Record<string, unknown>): Record<string, unknown> {
    const key = itemKey(String(item.name), String(item.source));

    // Already resolved
    const cached = resolved.get(key);
    if (cached) return cached;

    // No _copy — return as-is
    if (!item._copy) {
      resolved.set(key, item);
      return item;
    }

    // Cycle detection
    if (resolving.has(key)) return item;
    resolving.add(key);

    const copyRef = item._copy as Record<string, unknown>;
    const parentKey = itemKey(String(copyRef.name), String(copyRef.source));
    const parent = lookup.get(parentKey);

    if (!parent) {
      // Parent not found — treat as standalone item
      const standalone = { ...item };
      delete standalone._copy;
      resolved.set(key, standalone);
      resolving.delete(key);
      return standalone;
    }

    // Recursively resolve the parent first
    const resolvedParent = resolve(parent);

    // Merge: parent fields as base, child fields overlay
    const merged: Record<string, unknown> = { ...resolvedParent };
    for (const [k, v] of Object.entries(item)) {
      if (k === "_copy") continue; // strip _copy from output
      merged[k] = v;
    }

    resolved.set(key, merged);
    resolving.delete(key);
    return merged;
  }

  return items.map(resolve);
}

// ── itemGroup expansion ───────────────────────────────────────────

/**
 * Expands itemGroup entries into individual items.
 * Each group is a parent template; its `items` array references sub-items
 * that may or may not exist in the main item array.
 * For sub-items NOT found in the main array, we create entries from the
 * group template with the sub-item name.
 */
function expandItemGroups(
  groups: Record<string, unknown>[],
  existingItems: Record<string, unknown>[]
): Record<string, unknown>[] {
  // Build lookup of existing items
  const existing = new Set<string>();
  for (const item of existingItems) {
    existing.add(itemKey(String(item.name), String(item.source)));
  }

  const expanded: Record<string, unknown>[] = [];

  for (const group of groups) {
    const subItemRefs = group.items as string[] | undefined;
    if (!subItemRefs || subItemRefs.length === 0) continue;

    for (const ref of subItemRefs) {
      // refs are "ItemName|Source" format
      const parts = ref.split("|");
      const subName = parts[0]?.trim();
      const subSource = parts[1]?.trim() || String(group.source || "");
      if (!subName) continue;

      // Skip if this item already exists in the main array
      if (existing.has(itemKey(subName, subSource))) continue;

      // Create item from group template
      const item: Record<string, unknown> = {};
      // Copy relevant fields from group template
      for (const [k, v] of Object.entries(group)) {
        if (k === "items") continue; // don't copy the sub-item refs
        item[k] = v;
      }
      // Override with sub-item specifics
      item.name = subName;
      item.source = subSource;

      expanded.push(item);
    }
  }

  return expanded;
}

// ── magicvariant (generic magic items) ────────────────────────────

/**
 * 5e.tools stores iconic magic modifiers (Flame Tongue, Holy Avenger, Vorpal
 * Sword, Adamantine Armor, etc.) as `magicvariant` entries — templates that
 * apply to any qualifying base item. They are NOT in the main `item` array.
 *
 * For search UX we materialize one generic entry per variant using its
 * `.name` (no `namePrefix`) + `.inherits` block, so a DM searching
 * "Flame Tongue" finds the concept directly instead of only concrete fusions
 * like "Flame Tongue Shortsword of Greed".
 */

function inferTypeFromRequires(
  requires: Array<Record<string, unknown>> | undefined,
): ItemType {
  if (!requires || requires.length === 0) return "other";

  // Each entry in the requires array is an alternative target for this
  // magicvariant (union semantics). We probe every entry and return the
  // first recognized type — an Object.assign merge would overwrite earlier
  // keys (e.g. Adamantine Armor has [{type:"HA"},{type:"MA"},…] and the
  // last wins, hiding the heavy-armor signal).
  //
  // `type` fields in 5etools use source-suffix encoding: `"HA|XPHB"` must
  // be stripped to `"HA"` before comparison or armor checks silently fail.
  const stripSrc = (v: unknown): string =>
    typeof v === "string" ? v.split("|")[0].toUpperCase() : "";

  for (const r of requires) {
    const typeCode = stripSrc(r.type);

    // Armor / shield
    if (typeCode === "HA") return "heavy-armor";
    if (typeCode === "MA") return "medium-armor";
    if (typeCode === "LA") return "light-armor";
    if (typeCode === "S") return "shield";
    if (r.armor === true) return "medium-armor"; // generic armor marker

    // Ammunition (5etools codes: A = arrow/bolt/bullet, AF = firearm ammo).
    // These must come before the generic weapon check because `+1 Ammunition`
    // et al. target type codes and have no bow/arrow flag.
    if (typeCode === "A" || typeCode === "AF") return "ammunition";
    if (r.arrow === true || r.bolt === true) return "ammunition";

    // Ranged weapon markers (must come before generic weaponCategory)
    if (r.bow === true || r.crossbow === true) return "ranged-weapon";
    if (typeCode === "R" || r.weaponCategory === "ranged") return "ranged-weapon";
    if (r.net === true) return "ranged-weapon";

    // Melee / generic weapon markers
    if (
      r.sword === true ||
      r.axe === true ||
      r.polearm === true ||
      r.spear === true ||
      r.weapon === true ||
      typeCode === "M" ||
      r.weaponCategory === "melee" ||
      // 2024 ruleset categorizes weapons as simple/martial (no ranged flag
      // at this level — ranged intent comes alongside `bow`/`crossbow`/…
      // which we already matched above).
      r.weaponCategory === "simple" ||
      r.weaponCategory === "martial"
    ) {
      return "melee-weapon";
    }

    // Damage type / weapon property imply a weapon target
    if (r.dmgType || r.property) return "melee-weapon";

    if (r.scfType) return "spellcasting-focus";

    // Base-item reference (e.g. `{name:"Longsword",source:"XPHB"}`). 5etools
    // uses this shape exclusively for weapon-targeting variants — armor
    // targets always use `type: "HA"/"MA"/"LA"` or `armor: true` (already
    // matched above). Falling back to melee-weapon here catches the XDMG
    // reprints of Holy Avenger, Vorpal Sword, Luck Blade, etc.
    if (typeof r.name === "string" && typeof r.source === "string") {
      return "melee-weapon";
    }
  }

  return "other";
}

function transformMagicVariant(
  raw: Record<string, unknown>,
): SrdItem | null {
  const inherits = raw.inherits as Record<string, unknown> | undefined;
  if (!inherits) return null;

  const name = String(raw.name || "Unknown");
  const source = String(inherits.source || "DMG");
  // Upstream only sets `raw.edition` for classic-ruleset variants; 2024
  // reprints (XDMG/XPHB/XMM) leave it undefined. Deriving edition from the
  // canonical source set matches how regular items are handled earlier in
  // this file and avoids XDMG variants silently landing as "classic".
  const edition: "classic" | "one" = SOURCES_2024.has(source)
    ? "one"
    : (String(raw.edition || inherits.edition || "classic") as "classic" | "one");

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `${slug}-${source.toLowerCase()}`;

  const rarity = normalizeRarity(inherits.rarity);
  const type = inferTypeFromRequires(
    raw.requires as Array<Record<string, unknown>> | undefined,
  );

  // Render entries via the same pipeline used for regular items.
  const entriesRaw = inherits.entries as unknown[] | undefined;
  const entriesStrings: string[] = [];
  if (entriesRaw && Array.isArray(entriesRaw)) {
    for (const e of entriesRaw) {
      const rendered = renderEntries(e);
      if (rendered) entriesStrings.push(rendered);
    }
  }

  // Attunement + bonuses + weight pass through
  let reqAttune: boolean | string | undefined;
  if (inherits.reqAttune === true) reqAttune = true;
  else if (typeof inherits.reqAttune === "string")
    reqAttune = stripTags(inherits.reqAttune);

  const item: SrdItem = {
    id,
    name,
    source,
    type,
    rarity,
    isMagic: true,
    entries: entriesStrings,
    edition,
  };

  if (inherits.weight != null) item.weight = Number(inherits.weight);
  if (inherits.bonusWeapon) item.bonusWeapon = String(inherits.bonusWeapon);
  if (inherits.bonusAc) item.bonusAc = String(inherits.bonusAc);
  if (inherits.charges != null) item.charges = Number(inherits.charges);
  if (typeof inherits.recharge === "string") item.recharge = inherits.recharge;
  if (inherits.wondrous === true) item.wondrous = true;
  if (inherits.curse === true) item.curse = true;
  if (reqAttune != null) item.reqAttune = reqAttune;
  if (inherits.srd === true || inherits.srd52 === true) item.srd = true;
  if (inherits.basicRules === true || inherits.basicRules2024 === true)
    item.basicRules = true;

  return item;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Fetch base items (mundane)
  console.log("Fetching base items from 5e.tools mirror...");
  const baseData = (await fetchJSON(ITEMS_BASE_URL)) as Record<string, unknown> | null;
  if (!baseData) throw new Error("Failed to fetch items-base.json");

  const baseItems = (baseData.baseitem || []) as Record<string, unknown>[];
  console.log(`  Found ${baseItems.length} base items`);

  // 2. Fetch magic/special items
  console.log("Fetching items from 5e.tools mirror...");
  const itemsData = (await fetchJSON(ITEMS_URL)) as Record<string, unknown> | null;
  if (!itemsData) throw new Error("Failed to fetch items.json");

  const magicItems = (itemsData.item || []) as Record<string, unknown>[];
  const itemGroups = (itemsData.itemGroup || []) as Record<string, unknown>[];
  console.log(`  Found ${magicItems.length} items + ${itemGroups.length} item groups`);

  // 2b. Fetch magicvariants — iconic items (Flame Tongue, Holy Avenger, Vorpal
  // Sword, Adamantine Armor, …) live here as templates, not in items.json.
  console.log("Fetching magicvariants from 5e.tools mirror...");
  const variantsData = (await fetchJSON(MAGIC_VARIANTS_URL)) as
    | Record<string, unknown>
    | null;
  const magicVariants = (variantsData?.magicvariant || []) as Record<
    string,
    unknown
  >[];
  console.log(`  Found ${magicVariants.length} magicvariants`);

  // 3. Resolve _copy inheritance chains in magic items
  console.log("\nResolving _copy inheritance...");
  const copyCount = magicItems.filter((i) => i._copy).length;
  const resolvedMagicItems = resolveCopyItems(magicItems);
  console.log(`  Resolved ${copyCount} _copy items`);

  // 4. Expand itemGroup generic variants
  console.log("Expanding item groups...");
  const expandedFromGroups = expandItemGroups(itemGroups, resolvedMagicItems);
  console.log(`  Expanded ${expandedFromGroups.length} sub-items from ${itemGroups.length} groups`);

  // 5. Transform all items
  console.log("\nTransforming items...");
  const allItems: SrdItem[] = [];
  let skipped = 0;

  // Base items
  for (const raw of baseItems) {
    const transformed = transformItem(raw, true);
    if (!transformed) { skipped++; continue; }
    allItems.push(transformed);
  }
  console.log(`  Base items: ${allItems.length} transformed`);

  // Magic items (with _copy resolved)
  const magicStart = allItems.length;
  for (const raw of resolvedMagicItems) {
    const transformed = transformItem(raw, false);
    if (!transformed) { skipped++; continue; }
    allItems.push(transformed);
  }
  console.log(`  Magic/special items: ${allItems.length - magicStart} transformed`);

  // Expanded group sub-items
  const groupStart = allItems.length;
  for (const raw of expandedFromGroups) {
    const transformed = transformItem(raw, false);
    if (!transformed) { skipped++; continue; }
    allItems.push(transformed);
  }
  console.log(`  Group sub-items: ${allItems.length - groupStart} transformed`);

  // Magic variants — iconic generics (Flame Tongue, Vorpal Sword, …)
  const variantStart = allItems.length;
  for (const raw of magicVariants) {
    const transformed = transformMagicVariant(raw);
    if (!transformed) { skipped++; continue; }
    allItems.push(transformed);
  }
  console.log(`  Magic variants: ${allItems.length - variantStart} transformed`);

  // 6. Deduplicate by id (keep first occurrence)
  // Regular items are pushed before magicvariants, so when a magicvariant
  // shares a slug+source with a concrete item from items.json the
  // (usually richer) regular entry wins. We surface collisions so a
  // meaningful quality regression doesn't slip past this step silently.
  const seen = new Map<string, SrdItem>();
  const collisions: Array<{ id: string; kept: string; dropped: string }> = [];
  for (const item of allItems) {
    const existing = seen.get(item.id);
    if (!existing) {
      seen.set(item.id, item);
    } else if (existing.name !== item.name) {
      collisions.push({ id: item.id, kept: existing.name, dropped: item.name });
    }
  }
  if (collisions.length > 0) {
    console.log(`\n  ⚠️  ${collisions.length} id collision(s) — first occurrence kept:`);
    for (const c of collisions.slice(0, 10)) {
      console.log(`      ${c.id}: "${c.kept}" kept, "${c.dropped}" dropped`);
    }
    if (collisions.length > 10) console.log(`      …and ${collisions.length - 10} more`);
  }
  const deduped = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 7. Stats
  const mundaneCount = deduped.filter((i) => !i.isMagic).length;
  const magicCount = deduped.filter((i) => i.isMagic).length;

  const rarityStats: Record<string, number> = {};
  for (const item of deduped) {
    rarityStats[item.rarity] = (rarityStats[item.rarity] || 0) + 1;
  }

  const typeStats: Record<string, number> = {};
  for (const item of deduped) {
    typeStats[item.type] = (typeStats[item.type] || 0) + 1;
  }

  // 8. Write output to data/srd/ (full) and public/srd/ (same, pre-filter)
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(join(OUTPUT_DIR, "items.json"), json);
  writeFileSync(join(PUBLIC_DIR, "items.json"), json);
  const sizeMB = (Buffer.byteLength(json) / (1024 * 1024)).toFixed(1);

  console.log(`\n  items.json: ${deduped.length} items (${sizeMB} MB)  → data/srd/ + public/srd/`);

  console.log(`\nDone!`);
  console.log(`  Total raw entries: ${baseItems.length + magicItems.length} + ${expandedFromGroups.length} from groups`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  _copy resolved: ${copyCount}`);
  console.log(`  Groups expanded: ${expandedFromGroups.length}`);
  console.log(`  Mundane items: ${mundaneCount}`);
  console.log(`  Magic items: ${magicCount}`);
  console.log(`  Total unique: ${deduped.length}`);
  console.log(`\n  Rarity breakdown:`);
  for (const [rarity, count] of Object.entries(rarityStats).sort(([, a], [, b]) => b - a)) {
    console.log(`    ${rarity}: ${count}`);
  }
  console.log(`\n  Type breakdown:`);
  for (const [type, count] of Object.entries(typeStats).sort(([, a], [, b]) => b - a)) {
    console.log(`    ${type}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
