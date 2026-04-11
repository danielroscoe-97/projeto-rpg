#!/usr/bin/env ts-node
/**
 * fetch-5etools-spells.ts
 *
 * Crawls the complete 5e.tools spell compendium from the GitHub mirror
 * and transforms every spell into the project's SrdSpell format.
 *
 * Run:  npx ts-node scripts/fetch-5etools-spells.ts
 *   or: npm run fetch-spells
 *
 * Outputs:
 *   public/srd/spells-2014.json   (all pre-2024 sources)
 *   public/srd/spells-2024.json   (2024 revised sources: XPHB)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────

const BASE_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells";
const INDEX_URL = `${BASE_URL}/index.json`;
const OUTPUT_DIR = join(process.cwd(), "data", "srd");
const PUBLIC_DIR = join(process.cwd(), "public", "srd");

// Sources that represent the 2024 revised ruleset
const SOURCES_2024 = new Set(["XPHB", "XDMG", "XMM"]);

// School code → full name
const SCHOOL_MAP: Record<string, string> = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  V: "Evocation",
  I: "Illusion",
  N: "Necromancy",
  T: "Transmutation",
};

// ── Types ───────────────────────────────────────────────────────────

interface SrdSpell {
  id: string;
  name: string;
  source: string;
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

// ── Markup stripping (same as bestiary) ────────────────────────────

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
      const rows = obj.rows as unknown[][] | undefined;
      if (rows) {
        return caption + rows.map((row) => row.map((cell) => renderEntries(cell)).join(" | ")).join("\n");
      }
    }
    if (obj.type === "item") {
      const name = obj.name ? `${stripTags(String(obj.name))}: ` : "";
      return name + (obj.entry ? renderEntries(obj.entry) : renderEntries(obj.entries));
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

// ── Transform helpers ──────────────────────────────────────────────

function parseCastingTime(time: unknown): string {
  if (!time || !Array.isArray(time) || time.length === 0) return "1 action";
  const first = time[0] as Record<string, unknown>;
  const num = Number(first.number ?? 1);
  const unit = String(first.unit || "action");
  const condition = first.condition ? `, ${stripTags(String(first.condition))}` : "";
  if (num === 1 && unit === "action") return `1 action${condition}`;
  if (num === 1 && unit === "bonus") return `1 bonus action${condition}`;
  if (num === 1 && unit === "reaction") return `1 reaction${condition}`;
  return `${num} ${unit}${num > 1 ? "s" : ""}${condition}`;
}

function parseRange(range: unknown): string {
  if (!range || typeof range !== "object") return "Self";
  const obj = range as Record<string, unknown>;
  const type = String(obj.type || "point");

  if (type === "special") return "Special";

  const dist = obj.distance as Record<string, unknown> | undefined;
  if (!dist) return "Self";

  const distType = String(dist.type || "self");
  if (distType === "self") {
    // Check for area shape
    if (type === "radius") return `Self (${dist.amount || ""}-foot radius)`;
    if (type === "sphere") return `Self (${dist.amount || ""}-foot-radius sphere)`;
    if (type === "cone") return `Self (${dist.amount || ""}-foot cone)`;
    if (type === "line") return `Self (${dist.amount || ""}-foot line)`;
    if (type === "cube") return `Self (${dist.amount || ""}-foot cube)`;
    if (type === "hemisphere") return `Self (${dist.amount || ""}-foot-radius hemisphere)`;
    return "Self";
  }
  if (distType === "touch") return "Touch";
  if (distType === "sight") return "Sight";
  if (distType === "unlimited") return "Unlimited";

  const amount = dist.amount;
  if (amount) {
    const unit = distType === "miles" ? "mile" : "feet";
    const unitStr = distType === "miles" && Number(amount) > 1 ? "miles" : unit;
    return `${amount} ${unitStr}`;
  }

  return "Self";
}

function parseComponents(comp: unknown): string {
  if (!comp || typeof comp !== "object") return "";
  const obj = comp as Record<string, unknown>;
  const parts: string[] = [];
  if (obj.v) parts.push("V");
  if (obj.s) parts.push("S");
  if (obj.m) {
    if (typeof obj.m === "string") {
      parts.push(`M (${stripTags(obj.m)})`);
    } else if (typeof obj.m === "object" && obj.m !== null) {
      const m = obj.m as Record<string, unknown>;
      const text = m.text ? stripTags(String(m.text)) : "";
      parts.push(`M (${text})`);
    }
  }
  return parts.join(", ");
}

function parseDuration(dur: unknown): { duration: string; concentration: boolean } {
  if (!dur || !Array.isArray(dur) || dur.length === 0) {
    return { duration: "Instantaneous", concentration: false };
  }
  const first = dur[0] as Record<string, unknown>;
  const type = String(first.type || "instant");
  const concentration = Boolean(first.concentration);

  if (type === "instant") return { duration: "Instantaneous", concentration };
  if (type === "permanent") {
    const ends = first.ends as string[] | undefined;
    if (ends) {
      const endStr = ends.map((e) => {
        if (e === "dispel") return "dispelled";
        if (e === "trigger") return "triggered";
        return e;
      }).join(" or ");
      return { duration: `Until ${endStr}`, concentration };
    }
    return { duration: "Permanent", concentration };
  }
  if (type === "special") return { duration: "Special", concentration };

  if (first.duration && typeof first.duration === "object") {
    const d = first.duration as Record<string, unknown>;
    const amount = d.amount ?? 1;
    const unit = String(d.type || "minute");
    const unitStr = Number(amount) === 1 ? unit : `${unit}s`;
    const prefix = concentration ? "Concentration, up to " : "";
    return { duration: `${prefix}${amount} ${unitStr}`, concentration };
  }

  return { duration: "Instantaneous", concentration };
}

function parseClasses(raw: Record<string, unknown>): string[] {
  const classes: Set<string> = new Set();

  // From class lists in the spell itself (fromClassList)
  const fromClassList = raw.fromClassList as Array<Record<string, unknown>> | undefined;
  if (fromClassList) {
    for (const c of fromClassList) {
      classes.add(String(c.name || ""));
    }
  }

  return Array.from(classes).filter(Boolean).sort();
}

// ── Main transform ─────────────────────────────────────────────────

function transformSpell(
  raw: Record<string, unknown>,
  sourceCode: string,
  version: "2014" | "2024",
  classLookup: Map<string, string[]>
): SrdSpell | null {
  // Skip copy entries
  if (raw._copy) return null;

  const name = String(raw.name || "Unknown");
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = version === "2024"
    ? `${slug}-${sourceCode.toLowerCase()}-2024`
    : `${slug}-${sourceCode.toLowerCase()}`;

  const { duration, concentration } = parseDuration(raw.duration as unknown);

  // Description from entries
  const description = renderEntries(raw.entries);

  // Higher levels
  let higher_levels: string | null = null;
  if (raw.entriesHigherLevel) {
    const hlEntries = raw.entriesHigherLevel as unknown[];
    const rendered = hlEntries.map((e) => {
      if (typeof e === "object" && e !== null) {
        const obj = e as Record<string, unknown>;
        return renderEntries(obj.entries);
      }
      return renderEntries(e);
    }).filter(Boolean).join("\n");
    higher_levels = rendered || null;
  }

  // Classes — try from class lookup, then from spell data
  const lookupKey = `${name}|${raw.source || sourceCode}`;
  let classes = classLookup.get(lookupKey) || [];
  if (classes.length === 0) {
    // Fallback: check if spell has embedded class info
    const spellClasses = raw.classes as Record<string, unknown> | undefined;
    if (spellClasses) {
      const fromClassList = spellClasses.fromClassList as Array<Record<string, unknown>> | undefined;
      if (fromClassList) {
        classes = fromClassList.map((c) => String(c.name || "")).filter(Boolean);
      }
    }
  }

  return {
    id,
    name,
    source: sourceCode,
    ruleset_version: version,
    level: (raw.level as number) ?? 0,
    school: SCHOOL_MAP[String(raw.school || "")] || String(raw.school || ""),
    casting_time: parseCastingTime(raw.time),
    range: parseRange(raw.range),
    components: parseComponents(raw.components),
    duration,
    description,
    higher_levels,
    classes,
    ritual: Boolean(raw.meta && (raw.meta as Record<string, unknown>).ritual),
    concentration,
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

  // 1. Fetch class/spell lookup for class assignments
  console.log("Fetching class spell lists...");
  const classLookup = new Map<string, string[]>();
  try {
    const classIndex = await fetchJSON(
      "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/index.json"
    ) as Record<string, string> | null;

    if (classIndex) {
      for (const [, filename] of Object.entries(classIndex)) {
        const data = await fetchJSON(
          `https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/${filename}`
        ) as Record<string, unknown> | null;
        if (!data) continue;
        const cls = data.class as Array<Record<string, unknown>> | undefined;
        if (!cls) continue;
        // Classes don't directly list spells here, we'll rely on spell data
      }
    }
  } catch {
    console.warn("  Could not fetch class data, using spell-embedded class info");
  }

  // 2. Fetch spell index
  console.log("Fetching spell index from 5e.tools mirror...");
  const index = (await fetchJSON(INDEX_URL)) as Record<string, string>;
  if (!index) throw new Error("Failed to fetch spell index.json");

  const sourceEntries = Object.entries(index);
  console.log(`  Found ${sourceEntries.length} spell sources`);

  // 3. Also fetch the class-spell association file
  try {
    const classSpells = (await fetchJSON(
      "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/sources.json"
    )) as Record<string, unknown> | null;

    if (!classSpells) {
      // Try alternative: the generated lookup
      console.log("  No sources.json found, using embedded class data in spells");
    }
  } catch {
    // Not critical
  }

  // 4. Fetch all spell files
  const spells2014: SrdSpell[] = [];
  const spells2024: SrdSpell[] = [];
  let totalRaw = 0;
  let skippedCopies = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < sourceEntries.length; i += BATCH_SIZE) {
    const batch = sourceEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ([sourceCode, filename]) => {
        const url = `${BASE_URL}/${filename}`;
        const data = (await fetchJSON(url)) as Record<string, unknown> | null;
        if (!data) {
          console.warn(`  Skipping ${sourceCode}: failed to fetch ${filename}`);
          return { sourceCode, spells: [] as Record<string, unknown>[] };
        }
        const spellArray = (data.spell || []) as Record<string, unknown>[];
        return { sourceCode, spells: spellArray };
      })
    );

    for (const { sourceCode, spells } of results) {
      if (spells.length === 0) continue;
      totalRaw += spells.length;

      const is2024 = SOURCES_2024.has(sourceCode);
      const version = is2024 ? "2024" : "2014";

      for (const raw of spells) {
        const transformed = transformSpell(raw, sourceCode, version, classLookup);
        if (!transformed) {
          skippedCopies++;
          continue;
        }

        if (is2024) {
          spells2024.push(transformed);
        } else {
          spells2014.push(transformed);
        }
      }

      console.log(
        `  [${String(i + results.indexOf(results.find((r) => r.sourceCode === sourceCode)!) + 1).padStart(2)}/${sourceEntries.length}] ${sourceCode.padEnd(12)} → ${spells.length} spells (${version})`
      );
    }
  }

  // 5. Sort and deduplicate
  const dedup = (arr: SrdSpell[]): SrdSpell[] => {
    const seen = new Map<string, SrdSpell>();
    for (const s of arr) {
      const key = s.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, s);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const final2014 = dedup(spells2014);
  const final2024 = dedup(spells2024);

  // 6. Write output to data/srd/ (full) and public/srd/ (same, pre-filter)
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const files = [
    { name: "spells-2014.json", data: final2014 },
    { name: "spells-2024.json", data: final2024 },
  ];

  for (const f of files) {
    const json = JSON.stringify(f.data, null, 2);
    writeFileSync(join(OUTPUT_DIR, f.name), json);
    writeFileSync(join(PUBLIC_DIR, f.name), json);
    const sizeMB = (Buffer.byteLength(json) / (1024 * 1024)).toFixed(1);
    console.log(`  ${f.name}: ${f.data.length} spells (${sizeMB} MB) → data/srd/ + public/srd/`);
  }

  console.log(`\nDone!`);
  console.log(`  Total raw entries: ${totalRaw}`);
  console.log(`  Skipped (copies): ${skippedCopies}`);
  console.log(`  2014 spells: ${final2014.length}`);
  console.log(`  2024 spells: ${final2024.length}`);
  console.log(`  Combined unique: ${final2014.length + final2024.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
