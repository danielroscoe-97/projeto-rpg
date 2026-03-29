import type { SrdMonster } from "@/lib/srd/srd-loader";
import { normalize5etools } from "./normalizers/5etools";
import { normalizeOpen5e } from "./normalizers/open5e";
import { normalize5eDatabase } from "./normalizers/5e-database";

export type ParseResult =
  | { success: true; monsters: SrdMonster[]; format: string; warnings: string[] }
  | { success: false; error: string; supportedFormats: string[] };

const SUPPORTED_FORMATS = ["5etools", "Open5e", "5e-database"];

/**
 * Auto-detect format and normalize monster JSON data from various sources.
 * Handles partial failures — returns valid entries + warnings for failures.
 */
export function parseMonsterData(json: unknown): ParseResult {
  if (!json || typeof json !== "object") {
    return { success: false, error: "FORMAT_UNKNOWN", supportedFormats: SUPPORTED_FORMATS };
  }

  const data = json as Record<string, unknown>;

  // 5etools: { monster: [...] }
  if (Array.isArray(data.monster)) {
    return normalizeArray(data.monster, normalize5etools, "5etools");
  }

  // Open5e: { results: [...] } (paginated API)
  if (Array.isArray(data.results)) {
    return normalizeArray(data.results, normalizeOpen5e, "Open5e");
  }

  // 5e-database: single object with "index" field
  if (typeof data.index === "string" && typeof data.name === "string") {
    return normalizeArray([data], normalize5eDatabase, "5e-database");
  }

  // 5e-database: array at root level (check first item for index field)
  if (Array.isArray(json)) {
    const first = json[0];
    if (first && typeof first === "object" && "index" in first) {
      return normalizeArray(json, normalize5eDatabase, "5e-database");
    }
    // Try Open5e format (array of monsters with slug)
    if (first && typeof first === "object" && "slug" in first) {
      return normalizeArray(json, normalizeOpen5e, "Open5e");
    }
    // Try 5etools format (array of monsters with hp.average)
    if (first && typeof first === "object" && "hp" in first) {
      return normalizeArray(json, normalize5etools, "5etools");
    }
  }

  return { success: false, error: "FORMAT_UNKNOWN", supportedFormats: SUPPORTED_FORMATS };
}

function normalizeArray(
  items: unknown[],
  normalizer: (raw: never) => SrdMonster | null,
  format: string
): ParseResult {
  const monsters: SrdMonster[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const result = normalizer(items[i] as never);
      if (result) {
        monsters.push(result);
      } else {
        const name = (items[i] as Record<string, unknown>)?.name;
        warnings.push(`Entry ${i}${name ? ` (${name})` : ""}: could not normalize`);
      }
    } catch (err) {
      const name = (items[i] as Record<string, unknown>)?.name;
      warnings.push(
        `Entry ${i}${name ? ` (${name})` : ""}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  if (monsters.length === 0) {
    return { success: false, error: "NO_VALID_ENTRIES", supportedFormats: SUPPORTED_FORMATS };
  }

  return { success: true, monsters, format, warnings };
}
