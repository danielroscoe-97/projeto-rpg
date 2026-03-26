#!/usr/bin/env ts-node
/**
 * fetch-5etools-conditions.ts
 *
 * Crawls the 5e.tools conditions & diseases data from the GitHub mirror
 * and outputs conditions.json with the full compendium.
 *
 * Run:  npx ts-node scripts/fetch-5etools-conditions.ts
 *   or: npm run fetch-conditions
 *
 * Outputs:
 *   public/srd/conditions.json
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────

const DATA_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/conditionsdiseases.json";
const OUTPUT_DIR = join(process.cwd(), "public", "srd");

// ── Types ───────────────────────────────────────────────────────────

interface SrdCondition {
  id: string;
  name: string;
  description: string;
  source: string;
  ruleset_version: "2014" | "2024";
  created_at: string;
}

// Sources that represent the 2024 revised ruleset
const SOURCES_2024 = new Set(["XPHB", "XDMG", "XMM"]);

// ── Markup stripping ───────────────────────────────────────────────

function stripTags(text: string): string {
  if (typeof text !== "string") return String(text ?? "");

  let result = text;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(/\{@([a-zA-Z]+)\s([^{}]*?)\}/g, (_match, tag: string, content: string) => {
      const lower = tag.toLowerCase();
      if (lower === "dc") return `DC ${content.trim()}`;
      if (lower === "damage" || lower === "dice") return content.split("|")[0].trim();
      if (lower === "hit") return `+${content.trim()}`;
      if (
        ["condition", "spell", "creature", "item", "skill", "action",
         "status", "sense", "hazard", "disease", "variantrule",
         "quickref", "book", "filter"].includes(lower)
      ) {
        return content.split("|")[0].trim();
      }
      if (lower === "b" || lower === "bold") return content;
      if (lower === "i" || lower === "italic") return content;
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
            if (typeof item === "string") return stripTags(item);
            if (typeof item === "object" && item !== null) {
              const li = item as Record<string, unknown>;
              if (li.name && li.entries) return `${stripTags(String(li.name))}: ${renderEntries(li.entries)}`;
              if (li.entry) return renderEntries(li.entry);
              if (li.entries) return renderEntries(li.entries);
            }
            return renderEntries(item);
          })
          .join(" ");
      }
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

// ── Fetch with retry ───────────────────────────────────────────────

async function fetchJSON(url: string, retries = 3): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`  Retry ${i + 1}/${retries}: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Fetching conditions & diseases from 5e.tools mirror...");
  const data = (await fetchJSON(DATA_URL)) as Record<string, unknown>;
  if (!data) throw new Error("Failed to fetch conditionsdiseases.json");

  const conditions: SrdCondition[] = [];
  const now = new Date().toISOString().split("T")[0] + "T00:00:00Z";

  // Process conditions
  const rawConditions = (data.condition || []) as Array<Record<string, unknown>>;
  console.log(`  Found ${rawConditions.length} condition entries`);

  for (const raw of rawConditions) {
    const name = String(raw.name || "");
    const source = String(raw.source || "PHB");
    const is2024 = SOURCES_2024.has(source);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = is2024 ? `${slug}-2024` : slug;

    const description = renderEntries(raw.entries);

    conditions.push({
      id,
      name,
      description,
      source,
      ruleset_version: is2024 ? "2024" : "2014",
      created_at: now,
    });
  }

  // Process diseases
  const rawDiseases = (data.disease || []) as Array<Record<string, unknown>>;
  console.log(`  Found ${rawDiseases.length} disease entries`);

  for (const raw of rawDiseases) {
    const name = String(raw.name || "");
    const source = String(raw.source || "DMG");
    const is2024 = SOURCES_2024.has(source);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = is2024 ? `disease-${slug}-2024` : `disease-${slug}`;

    const description = renderEntries(raw.entries);

    conditions.push({
      id,
      name: `[Disease] ${name}`,
      description,
      source,
      ruleset_version: is2024 ? "2024" : "2014",
      created_at: now,
    });
  }

  // Process statuses (Concentration, Surprised, etc.)
  const rawStatuses = (data.status || []) as Array<Record<string, unknown>>;
  console.log(`  Found ${rawStatuses.length} status entries`);

  for (const raw of rawStatuses) {
    const name = String(raw.name || "");
    const source = String(raw.source || "PHB");
    const is2024 = SOURCES_2024.has(source);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = is2024 ? `status-${slug}-2024` : `status-${slug}`;

    const description = renderEntries(raw.entries);

    conditions.push({
      id,
      name: `[Status] ${name}`,
      description,
      source,
      ruleset_version: is2024 ? "2024" : "2014",
      created_at: now,
    });
  }

  // Sort by name
  conditions.sort((a, b) => a.name.localeCompare(b.name));

  // Write output
  const path = join(OUTPUT_DIR, "conditions.json");
  const json = JSON.stringify(conditions, null, 2);
  writeFileSync(path, json);
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);

  console.log(`\nDone!`);
  console.log(`  conditions.json: ${conditions.length} entries (${sizeKB} KB)`);
  console.log(`    Conditions: ${rawConditions.length}`);
  console.log(`    Diseases: ${rawDiseases.length}`);
  console.log(`    Statuses: ${rawStatuses.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
