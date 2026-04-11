#!/usr/bin/env ts-node
/**
 * fetch-5etools-class-features.ts
 *
 * Fetches ALL class features from every class file in the 5e.tools GitHub
 * mirror and transforms them into the project's SrdClassFeature format.
 *
 * Data source:
 *   - index.json maps class names to file names
 *   - Each class file contains `classFeature[]` entries
 *
 * Run:  npx tsx scripts/fetch-5etools-class-features.ts
 *
 * Outputs:
 *   data/srd/class-features-full.json  (all class features, full dataset)
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

// ── Transform ─────────────────────────────────────────────────────

interface SrdClassFeature {
  id: string;
  name: string;
  class_id: string;
  class_source: string;
  source: string;
  level: number;
  ruleset_version: "2014" | "2024";
  srd?: boolean;
  basicRules?: boolean;
  description: string;
}

function isGenericASI(raw: Record<string, unknown>): boolean {
  const name = String(raw.name || "").toLowerCase();
  // Skip generic "Ability Score Improvement" entries that carry no unique content
  if (
    name === "ability score improvement" ||
    name === "ability score improvements"
  ) {
    const desc = renderEntries(raw.entries);
    // If the description is very short or purely boilerplate, skip it
    if (desc.length < 200) return true;
  }
  return false;
}

function transformClassFeature(raw: Record<string, unknown>): SrdClassFeature | null {
  if (raw._copy) return null;
  if (isGenericASI(raw)) return null;

  const name = String(raw.name || "Unknown");
  const className = String(raw.className || "Unknown");
  const classSource = String(raw.classSource || "PHB");
  const sourceCode = String(raw.source || classSource);
  const level = Number(raw.level || 0);
  const is2024 = SOURCES_2024.has(sourceCode);

  const classSlug = className
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const id = is2024
    ? `${classSlug}-${nameSlug}-${sourceCode.toLowerCase()}-2024`
    : `${classSlug}-${nameSlug}-${sourceCode.toLowerCase()}`;

  const description = renderEntries(raw.entries);

  const feature: SrdClassFeature = {
    id,
    name,
    class_id: classSlug,
    class_source: classSource,
    source: sourceCode,
    level,
    ruleset_version: is2024 ? "2024" : "2014",
    description,
  };

  if (raw.srd === true || raw.srd52 === true) feature.srd = true;
  if (raw.basicRules === true || raw.basicRules2024 === true) feature.basicRules = true;

  return feature;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching class index from 5e.tools mirror...");
  const indexRes = await fetch(INDEX_URL);
  if (!indexRes.ok) throw new Error(`Failed to fetch index.json: ${indexRes.status}`);
  const index = (await indexRes.json()) as Record<string, string>;

  // The index maps keys to file names, e.g. "barbarian": "class-barbarian.json"
  const classFiles = Object.values(index);
  console.log(`  Found ${classFiles.length} class files in index`);

  const allFeatures: SrdClassFeature[] = [];
  let skipped = 0;
  let filesProcessed = 0;

  for (const fileName of classFiles) {
    const fileUrl = `${BASE_URL}/${fileName}`;
    console.log(`  Fetching ${fileName}...`);

    try {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        console.warn(`    WARN: Failed to fetch ${fileName}: ${res.status}, skipping`);
        continue;
      }
      const data = (await res.json()) as Record<string, unknown>;
      filesProcessed++;

      const rawFeatures = (data.classFeature || []) as Record<string, unknown>[];
      let fileCount = 0;

      for (const raw of rawFeatures) {
        const transformed = transformClassFeature(raw);
        if (!transformed) { skipped++; continue; }
        allFeatures.push(transformed);
        fileCount++;
      }

      console.log(`    ${fileCount} class features extracted`);
    } catch (err) {
      console.warn(`    WARN: Error processing ${fileName}:`, err);
    }
  }

  // Deduplicate by id
  const seen = new Map<string, SrdClassFeature>();
  for (const feature of allFeatures) {
    if (!seen.has(feature.id)) seen.set(feature.id, feature);
  }

  // Sort by class, then level, then name
  const deduped = Array.from(seen.values()).sort((a, b) => {
    const classComp = a.class_id.localeCompare(b.class_id);
    if (classComp !== 0) return classComp;
    const levelComp = a.level - b.level;
    if (levelComp !== 0) return levelComp;
    return a.name.localeCompare(b.name);
  });

  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(join(OUTPUT_DIR, "class-features-full.json"), json);

  // Stats
  const byClass: Record<string, number> = {};
  const bySrc: Record<string, number> = {};
  for (const f of deduped) {
    byClass[f.class_id] = (byClass[f.class_id] || 0) + 1;
    bySrc[f.source] = (bySrc[f.source] || 0) + 1;
  }

  console.log(`\n  class-features-full.json: ${deduped.length} class features → data/srd/`);
  console.log(`  Files processed: ${filesProcessed}`);
  console.log(`  Skipped: ${skipped} (copies + generic ASI)`);
  console.log(`  Duplicates removed: ${allFeatures.length - deduped.length}`);
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
