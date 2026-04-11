#!/usr/bin/env ts-node
/**
 * fetch-5etools-feats.ts
 *
 * Fetches the complete 5e.tools feat compendium and transforms every feat
 * into the project's SrdFeat format.
 *
 * Run:  npx tsx scripts/fetch-5etools-feats.ts
 *
 * Outputs:
 *   data/srd/feats.json    (all feats, full dataset)
 *   public/srd/feats.json  (same, pre-filter — filter-srd-public.ts handles SRD split)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/feats.json";
const OUTPUT_DIR = join(process.cwd(), "data", "srd");
const PUBLIC_DIR = join(process.cwd(), "public", "srd");

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

// ── Prerequisite parsing ──────────────────────────────────────────

function parsePrerequisite(prereq: unknown): string | null {
  if (!prereq) return null;
  if (!Array.isArray(prereq)) return null;

  const parts: string[] = [];
  for (const p of prereq) {
    if (typeof p !== "object" || p === null) continue;
    const obj = p as Record<string, unknown>;

    // Ability score prereqs
    if (obj.ability) {
      const abilities = obj.ability as Record<string, number>[];
      for (const ab of abilities) {
        const abParts = Object.entries(ab).map(
          ([stat, val]) => `${stat.toUpperCase()} ${val}`
        );
        parts.push(abParts.join(" or "));
      }
    }
    // Level prereq
    if (obj.level) {
      const lvl = obj.level as Record<string, unknown>;
      if (lvl.level) parts.push(`Level ${lvl.level}`);
    }
    // Race prereq
    if (obj.race) {
      const races = obj.race as Array<Record<string, unknown>>;
      const raceNames = races.map((r) => String(r.name || "")).filter(Boolean);
      if (raceNames.length > 0) parts.push(raceNames.join(" or "));
    }
    // Spellcasting
    if (obj.spellcasting === true || obj.spellcasting2020 === true) {
      parts.push("Spellcasting");
    }
    // Proficiency
    if (obj.proficiency) {
      const profs = obj.proficiency as Array<Record<string, boolean>>;
      for (const prof of profs) {
        parts.push(...Object.keys(prof).map((k) => `${k} proficiency`));
      }
    }
    // Feat prereq
    if (obj.feat) {
      const feats = obj.feat as Array<Record<string, unknown>>;
      parts.push(...feats.map((f) => String(f.name || "")).filter(Boolean));
    }
    // Other/text
    if (obj.other) parts.push(stripTags(String(obj.other)));
  }

  return parts.length > 0 ? parts.join("; ") : null;
}

// ── Transform ─────────────────────────────────────────────────────

interface SrdFeat {
  id: string;
  name: string;
  description: string;
  prerequisite: string | null;
  source: string;
  ruleset_version: string;
  srd?: boolean;
  basicRules?: boolean;
}

function transformFeat(raw: Record<string, unknown>): SrdFeat | null {
  if (raw._copy) return null; // 0 _copy feats in 5e.tools, but guard anyway

  const name = String(raw.name || "Unknown");
  const sourceCode = String(raw.source || "PHB");
  const is2024 = SOURCES_2024.has(sourceCode);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = is2024 ? `${slug}-${sourceCode.toLowerCase()}-2024` : `${slug}-${sourceCode.toLowerCase()}`;

  const description = renderEntries(raw.entries);

  const feat: SrdFeat = {
    id,
    name,
    description,
    prerequisite: parsePrerequisite(raw.prerequisite),
    source: sourceCode,
    ruleset_version: is2024 ? "2024" : "2014",
  };

  if (raw.srd === true || raw.srd52 === true) feat.srd = true;
  if (raw.basicRules === true || raw.basicRules2024 === true) feat.basicRules = true;

  return feat;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  console.log("Fetching feats from 5e.tools mirror...");
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to fetch feats.json: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;

  const rawFeats = (data.feat || []) as Record<string, unknown>[];
  console.log(`  Found ${rawFeats.length} feats`);

  const allFeats: SrdFeat[] = [];
  let skipped = 0;

  for (const raw of rawFeats) {
    const transformed = transformFeat(raw);
    if (!transformed) { skipped++; continue; }
    allFeats.push(transformed);
  }

  // Deduplicate by id
  const seen = new Map<string, SrdFeat>();
  for (const feat of allFeats) {
    if (!seen.has(feat.id)) seen.set(feat.id, feat);
  }
  const deduped = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(join(OUTPUT_DIR, "feats.json"), json);
  writeFileSync(join(PUBLIC_DIR, "feats.json"), json);

  // Stats
  const sources: Record<string, number> = {};
  for (const f of deduped) sources[f.source] = (sources[f.source] || 0) + 1;

  console.log(`\n  feats.json: ${deduped.length} feats → data/srd/ + public/srd/`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`\n  By source:`);
  Object.entries(sources)
    .sort(([, a], [, b]) => b - a)
    .forEach(([s, c]) => console.log(`    ${s}: ${c}`));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
