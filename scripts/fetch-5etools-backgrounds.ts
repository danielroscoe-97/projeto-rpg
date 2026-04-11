#!/usr/bin/env ts-node
/**
 * fetch-5etools-backgrounds.ts
 *
 * Fetches the complete 5e.tools background compendium and transforms every
 * background into the project's format.
 *
 * Run:  npx tsx scripts/fetch-5etools-backgrounds.ts
 *
 * Outputs:
 *   data/srd/backgrounds.json    (all backgrounds, full dataset)
 *   public/srd/backgrounds.json  (same, pre-filter)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/backgrounds.json";
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

// ── Types ─────────────────────────────────────────────────────────

interface SrdBackground {
  id: string;
  name: string;
  source: string;
  ruleset_version: "2014" | "2024";
  description: string;
  skill_proficiencies: string[];
  tool_proficiencies: string[];
  languages: string[];
  equipment: string;
  feature_name: string | null;
  feature_description: string | null;
  srd?: boolean;
  basicRules?: boolean;
}

// ── _copy resolution ──────────────────────────────────────────────

function bgKey(name: string, source: string): string {
  return `${name}|||${source}`;
}

function resolveCopyBackgrounds(
  backgrounds: Record<string, unknown>[]
): Record<string, unknown>[] {
  const lookup = new Map<string, Record<string, unknown>>();
  for (const bg of backgrounds) {
    if (!bg._copy) lookup.set(bgKey(String(bg.name), String(bg.source)), bg);
  }

  const resolved: Record<string, unknown>[] = [];
  let resolvedCount = 0;

  for (const bg of backgrounds) {
    if (!bg._copy) {
      resolved.push(bg);
      continue;
    }

    const copyRef = bg._copy as Record<string, unknown>;
    const parent = lookup.get(bgKey(String(copyRef.name), String(copyRef.source)));
    if (!parent) continue; // parent not found

    const merged = JSON.parse(JSON.stringify(parent)) as Record<string, unknown>;
    for (const [k, v] of Object.entries(bg)) {
      if (k === "_copy") continue;
      merged[k] = v;
    }

    resolved.push(merged);
    resolvedCount++;
  }

  if (resolvedCount > 0) console.log(`  Resolved ${resolvedCount} _copy backgrounds`);
  return resolved;
}

// ── Parsing helpers ───────────────────────────────────────────────

function parseSkillProficiencies(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const skills: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "object" && entry !== null) {
      const obj = entry as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        if (key === "choose") continue; // skip choose blocks for simplicity
        if (val === true) {
          skills.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
      }
      // Handle choose
      if (obj.choose) {
        const choose = obj.choose as Record<string, unknown>;
        const from = choose.from as string[] | undefined;
        const count = (choose.count as number) || 1;
        if (from) {
          skills.push(`Choose ${count} from ${from.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}`);
        }
      }
    }
  }
  return skills;
}

function parseToolProficiencies(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const tools: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "object" && entry !== null) {
      for (const [key, val] of Object.entries(entry as Record<string, unknown>)) {
        if (key === "choose") continue;
        if (val === true) {
          tools.push(key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1").trim());
        }
      }
    }
  }
  return tools;
}

function parseLanguages(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const langs: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "object" && entry !== null) {
      const obj = entry as Record<string, unknown>;
      if (obj.anyStandard) langs.push(`Any ${obj.anyStandard} standard language(s)`);
      for (const [key, val] of Object.entries(obj)) {
        if (key === "anyStandard" || key === "choose") continue;
        if (val === true) langs.push(key.charAt(0).toUpperCase() + key.slice(1));
      }
    }
  }
  return langs;
}

function parseEquipment(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return stripTags(raw);
  // startingEquipment can be complex — render as best effort
  return renderEntries(raw);
}

// ── Transform ─────────────────────────────────────────────────────

function transformBackground(raw: Record<string, unknown>): SrdBackground | null {
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

  const description = renderEntries(raw.entries);

  // Extract feature (usually the last entries section with a name)
  let featureName: string | null = null;
  let featureDesc: string | null = null;
  if (raw.entries && Array.isArray(raw.entries)) {
    for (const entry of raw.entries as unknown[]) {
      if (typeof entry === "object" && entry !== null) {
        const obj = entry as Record<string, unknown>;
        if ((obj.type === "entries" || obj.type === "section") && obj.name) {
          const n = String(obj.name);
          if (n.startsWith("Feature:") || n.includes("Feature")) {
            featureName = stripTags(n.replace(/^Feature:\s*/, ""));
            featureDesc = renderEntries(obj.entries);
          }
        }
      }
    }
  }

  const bg: SrdBackground = {
    id,
    name,
    source: sourceCode,
    ruleset_version: is2024 ? "2024" : "2014",
    description,
    skill_proficiencies: parseSkillProficiencies(raw.skillProficiencies),
    tool_proficiencies: parseToolProficiencies(raw.toolProficiencies),
    languages: parseLanguages(raw.languageProficiencies),
    equipment: parseEquipment(raw.startingEquipment),
    feature_name: featureName,
    feature_description: featureDesc,
  };

  if (raw.srd === true || raw.srd52 === true) bg.srd = true;
  if (raw.basicRules === true || raw.basicRules2024 === true) bg.basicRules = true;

  return bg;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  console.log("Fetching backgrounds from 5e.tools mirror...");
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to fetch backgrounds.json: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;

  const rawBgs = (data.background || []) as Record<string, unknown>[];
  const copyCount = rawBgs.filter((b) => b._copy).length;
  console.log(`  Found ${rawBgs.length} backgrounds (${copyCount} _copy)`);

  // Resolve _copy inheritance
  const resolved = resolveCopyBackgrounds(rawBgs);

  const allBgs: SrdBackground[] = [];
  let skipped = 0;

  for (const raw of resolved) {
    const transformed = transformBackground(raw);
    if (!transformed) { skipped++; continue; }
    allBgs.push(transformed);
  }

  // Deduplicate by id
  const seen = new Map<string, SrdBackground>();
  for (const bg of allBgs) {
    if (!seen.has(bg.id)) seen.set(bg.id, bg);
  }
  const deduped = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

  const json = JSON.stringify(deduped, null, 2);
  writeFileSync(join(OUTPUT_DIR, "backgrounds.json"), json);
  writeFileSync(join(PUBLIC_DIR, "backgrounds.json"), json);

  // Stats
  const sources: Record<string, number> = {};
  for (const bg of deduped) sources[bg.source] = (sources[bg.source] || 0) + 1;

  console.log(`\n  backgrounds.json: ${deduped.length} backgrounds → data/srd/ + public/srd/`);
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
