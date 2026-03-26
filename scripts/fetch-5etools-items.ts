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
const OUTPUT_DIR = join(process.cwd(), "public", "srd");

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
  // Skip copy entries
  if (raw._copy) return null;

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
  console.log(`  Found ${magicItems.length} items`);

  // 3. Transform all items
  console.log("\nTransforming items...");
  const allItems: SrdItem[] = [];
  let skippedCopies = 0;

  // Base items
  for (const raw of baseItems) {
    const transformed = transformItem(raw, true);
    if (!transformed) {
      skippedCopies++;
      continue;
    }
    allItems.push(transformed);
  }
  console.log(`  Base items: ${allItems.length} transformed`);

  // Magic items
  const magicStart = allItems.length;
  for (const raw of magicItems) {
    const transformed = transformItem(raw, false);
    if (!transformed) {
      skippedCopies++;
      continue;
    }
    allItems.push(transformed);
  }
  console.log(`  Magic/special items: ${allItems.length - magicStart} transformed`);

  // 4. Deduplicate by id (keep first occurrence)
  const seen = new Map<string, SrdItem>();
  for (const item of allItems) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }
  const deduped = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 5. Stats
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

  // 6. Write output
  const path = join(OUTPUT_DIR, "items.json");
  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(path, json);
  const sizeMB = (Buffer.byteLength(json) / (1024 * 1024)).toFixed(1);

  console.log(`\n  items.json: ${deduped.length} items (${sizeMB} MB)`);

  console.log(`\nDone!`);
  console.log(`  Total raw entries: ${baseItems.length + magicItems.length}`);
  console.log(`  Skipped (copies): ${skippedCopies}`);
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
