#!/usr/bin/env ts-node
/**
 * fetch-5etools-subclasses.ts
 *
 * Fetches ALL subclass data from the 5e.tools GitHub mirror.
 * Subclass data is embedded within class files, so we:
 *   1. Fetch the class index to discover all class file names
 *   2. Fetch each class file and extract subclass + subclassFeature arrays
 *   3. Transform into SrdSubclass format
 *
 * Run:  npx tsx scripts/fetch-5etools-subclasses.ts
 *
 * Outputs:
 *   data/srd/subclasses-full.json  (all subclasses, full dataset)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class";
const INDEX_URL = `${BASE_URL}/index.json`;
const OUTPUT_DIR = join(process.cwd(), "data", "srd");

const SOURCES_2024 = new Set(["XPHB", "XDMG", "XMM"]);

// ── Markup stripping ──────────────────────────────────────────────

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
        if (lower === "dice" || lower === "damage" || lower === "d20")
          return content.split("|")[0].trim();
        if (lower === "dc") return `DC ${content.trim()}`;
        if (lower === "hit") return `+${content.trim()}`;
        if (lower === "scaledamage" || lower === "scaledice")
          return content.split("|")[2]?.trim() || content.split("|")[0].trim();
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
        )
          return content.split("|")[0].trim();
        if (["b", "bold", "i", "italic", "s", "strike", "u", "underline", "note", "h"].includes(lower))
          return content;
        if (lower === "font") return content.split("|").pop()?.trim() || content;
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
  if (Array.isArray(entries))
    return entries.map((e) => renderEntries(e)).filter(Boolean).join("\n");
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
      if (colLabels) tableStr += colLabels.map((l) => stripTags(l)).join(" | ") + "\n";
      if (rows) tableStr += rows.map((row) => row.map((cell) => renderEntries(cell)).join(" | ")).join("\n");
      return tableStr;
    }
    if (obj.type === "item") {
      const name = obj.name ? `${stripTags(String(obj.name))}: ` : "";
      return name + (obj.entry ? renderEntries(obj.entry) : renderEntries(obj.entries));
    }
    if (obj.entries) {
      const header = obj.name ? `${stripTags(String(obj.name))}. ` : "";
      return header + renderEntries(obj.entries);
    }
    if (obj.entry) return renderEntries(obj.entry);
  }
  return "";
}

// ── Types ────────────────────────────────────────────────────────

interface SrdSubclass {
  id: string;
  name: string;
  short_name: string;
  class_id: string;
  class_source: string;
  source: string;
  ruleset_version: "2014" | "2024";
  srd?: boolean;
  basicRules?: boolean;
  description: string;
  features: Array<{
    name: string;
    level: number;
    description: string;
  }>;
}

// ── Transform ─────────────────────────────────────────────────────

function transformSubclass(
  raw: Record<string, unknown>,
  subclassFeatures: Record<string, unknown>[]
): SrdSubclass | null {
  if (raw._copy) return null;

  const name = String(raw.name || "Unknown");
  const shortName = String(raw.shortName || name);
  const sourceCode = String(raw.source || "PHB");
  const className = String(raw.className || "Unknown");
  const classSource = String(raw.classSource || "PHB");
  const is2024 = SOURCES_2024.has(sourceCode);

  const slug = shortName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = is2024
    ? `${slug}-${sourceCode.toLowerCase()}-2024`
    : `${slug}-${sourceCode.toLowerCase()}`;

  const classId = className
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Extract description from the first entry in subclassFeatures for this subclass
  // or fall back to raw.entries if present
  let description = "";
  if (raw.entries) {
    description = renderEntries(raw.entries);
  }
  if (!description) {
    // Try to get description from the first subclassFeature (level 3 typically)
    const firstFeature = subclassFeatures
      .filter(
        (f) =>
          String(f.className).toLowerCase() === className.toLowerCase() &&
          String(f.subclassShortName) === shortName &&
          String(f.subclassSource) === sourceCode
      )
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0))[0];
    if (firstFeature?.entries) {
      description = renderEntries(firstFeature.entries);
    }
  }

  // Build features array from matching subclassFeature entries
  const features = subclassFeatures
    .filter(
      (f) =>
        String(f.className).toLowerCase() === className.toLowerCase() &&
        String(f.subclassShortName) === shortName &&
        String(f.subclassSource) === sourceCode
    )
    .sort((a, b) => Number(a.level || 0) - Number(b.level || 0))
    .map((f) => ({
      name: String(f.name || "Unknown"),
      level: Number(f.level || 0),
      description: renderEntries(f.entries),
    }));

  const subclass: SrdSubclass = {
    id,
    name,
    short_name: shortName,
    class_id: classId,
    class_source: classSource,
    source: sourceCode,
    ruleset_version: is2024 ? "2024" : "2014",
    description,
    features,
  };

  if (raw.srd === true || raw.srd52 === true) subclass.srd = true;
  if (raw.basicRules === true || raw.basicRules2024 === true) subclass.basicRules = true;

  return subclass;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching class index from 5e.tools mirror...");
  const indexRes = await fetch(INDEX_URL);
  if (!indexRes.ok) throw new Error(`Failed to fetch index.json: ${indexRes.status}`);
  const index = (await indexRes.json()) as Record<string, string>;

  // index maps class name -> filename, e.g. "barbarian": "class-barbarian.json"
  const classFiles = Object.values(index);
  console.log(`  Found ${classFiles.length} class files in index`);

  const allSubclasses: SrdSubclass[] = [];
  let skipped = 0;
  let totalRawSubclasses = 0;

  for (const filename of classFiles) {
    const url = `${BASE_URL}/${filename}`;
    console.log(`  Fetching ${filename}...`);

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`    WARN: Failed to fetch ${filename}: ${res.status}, skipping`);
      continue;
    }

    const data = (await res.json()) as Record<string, unknown>;

    const rawSubclasses = (data.subclass || []) as Record<string, unknown>[];
    const rawSubclassFeatures = (data.subclassFeature || []) as Record<string, unknown>[];

    totalRawSubclasses += rawSubclasses.length;
    console.log(`    ${rawSubclasses.length} subclasses, ${rawSubclassFeatures.length} subclass features`);

    for (const raw of rawSubclasses) {
      const transformed = transformSubclass(raw, rawSubclassFeatures);
      if (!transformed) {
        skipped++;
        continue;
      }
      allSubclasses.push(transformed);
    }
  }

  // Deduplicate by id
  const seen = new Map<string, SrdSubclass>();
  for (const sc of allSubclasses) {
    if (!seen.has(sc.id)) seen.set(sc.id, sc);
  }

  // Sort by class_id then name
  const deduped = Array.from(seen.values()).sort((a, b) => {
    const classCompare = a.class_id.localeCompare(b.class_id);
    if (classCompare !== 0) return classCompare;
    return a.name.localeCompare(b.name);
  });

  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(join(OUTPUT_DIR, "subclasses-full.json"), json);

  // Stats
  const byClass: Record<string, number> = {};
  const bySrc: Record<string, number> = {};
  for (const sc of deduped) {
    byClass[sc.class_id] = (byClass[sc.class_id] || 0) + 1;
    bySrc[sc.source] = (bySrc[sc.source] || 0) + 1;
  }

  console.log(`\n  subclasses-full.json: ${deduped.length} subclasses → data/srd/`);
  console.log(`  Raw total: ${totalRawSubclasses}, Skipped: ${skipped}, Duplicates: ${allSubclasses.length - deduped.length}`);
  console.log(`\n  By class:`);
  Object.entries(byClass)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([cls, c]) => console.log(`    ${cls}: ${c}`));
  console.log(`\n  By source:`);
  Object.entries(bySrc)
    .sort(([, a], [, b]) => b - a)
    .forEach(([s, c]) => console.log(`    ${s}: ${c}`));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
