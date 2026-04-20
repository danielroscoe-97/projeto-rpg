import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { HubContent } from "./hub-types";

const HUBS_DIR = join(process.cwd(), "content/hubs");

/**
 * Hand-rolled validator for hub JSON files. Keeps hub source honest:
 * TS cast on JSON.parse is a fiction — this catches real violations
 * (missing required fields, wrong types, empty breadcrumbs) at load
 * time so bad hubs fail loudly in dev/CI instead of rendering broken
 * or crashing at runtime.
 */
function validateHub(raw: unknown, file: string): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return [`${file}: root must be an object`];
  }
  const h = raw as Record<string, unknown>;

  if (typeof h.slug !== "string" || !h.slug) errors.push("slug (string, non-empty)");
  if (h.locale !== "pt-BR" && h.locale !== "en") errors.push('locale ("pt-BR" | "en")');
  if (typeof h.metaTitle !== "string" || !h.metaTitle) errors.push("metaTitle");
  if (typeof h.metaDescription !== "string" || !h.metaDescription) errors.push("metaDescription");
  if (typeof h.kicker !== "string") errors.push("kicker");
  if (typeof h.h1 !== "string" || !h.h1) errors.push("h1");

  if (!h.lead || typeof (h.lead as { text?: unknown }).text !== "string" || !(h.lead as { text: string }).text) {
    errors.push("lead.text");
  }

  if (!Array.isArray(h.sections) || h.sections.length === 0) {
    errors.push("sections (array, non-empty)");
  } else {
    h.sections.forEach((s, i) => {
      const sec = s as Record<string, unknown>;
      if (typeof sec.label !== "string") errors.push(`sections[${i}].label`);
      if (typeof sec.linkPath !== "string") errors.push(`sections[${i}].linkPath`);
      if (!Array.isArray(sec.items)) errors.push(`sections[${i}].items (array)`);
    });
  }

  if (!Array.isArray(h.breadcrumbs) || h.breadcrumbs.length < 2) {
    errors.push("breadcrumbs (array, ≥2 entries)");
  }

  if (typeof h.ctaHeadline !== "string") errors.push("ctaHeadline");
  if (typeof h.ctaSub !== "string") errors.push("ctaSub");
  if (typeof h.ctaPrimaryHref !== "string") errors.push("ctaPrimaryHref");
  if (typeof h.ctaPrimaryLabel !== "string") errors.push("ctaPrimaryLabel");

  if (!Array.isArray(h.tracked_queries)) errors.push("tracked_queries (array)");

  return errors.map((e) => `${file}: missing/invalid ${e}`);
}

export interface LoadedHub extends HubContent {
  /** mtime of the source JSON file, populated by the loader. Used by the
   *  sitemap for lastModified instead of BUILD_TIME (so unchanged hubs
   *  don't signal false freshness to search engines each deploy). */
  _mtime: Date;
}

/**
 * Read every content/hubs/*.json (excluding _prefixed scaffolding).
 * Called at build time by generateStaticParams / sitemap / metadata.
 *
 * Fault-tolerant on purpose: a malformed JSON file or a missing HUBS_DIR
 * (e.g. wrong CWD in serverless) MUST NOT crash the caller. The sitemap
 * imports this; a thrown error here would 500 the sitemap for the whole
 * site. We log a warning and skip bad files instead.
 *
 * Hubs that fail schema validation are also skipped with a warning.
 */
export function loadAllHubs(): LoadedHub[] {
  if (!existsSync(HUBS_DIR)) {
    console.warn(`[hub-loader] content/hubs/ not found at ${HUBS_DIR}`);
    return [];
  }
  const files = readdirSync(HUBS_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  const hubs: LoadedHub[] = [];
  for (const f of files) {
    const filePath = join(HUBS_DIR, f);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
      console.warn(`[hub-loader] ${f}: invalid JSON — ${(err as Error).message}`);
      continue;
    }
    const errors = validateHub(raw, f);
    if (errors.length > 0) {
      console.warn(`[hub-loader] ${f}: schema invalid\n  ${errors.join("\n  ")}`);
      continue;
    }
    try {
      hubs.push({
        ...(raw as HubContent),
        _mtime: statSync(filePath).mtime,
      });
    } catch (err) {
      console.warn(`[hub-loader] ${f}: stat failed — ${(err as Error).message}`);
    }
  }
  return hubs;
}

export function loadHub(
  slug: string,
  locale: "pt-BR" | "en",
): LoadedHub | null {
  return (
    loadAllHubs().find((h) => h.slug === slug && h.locale === locale) ?? null
  );
}

export function hubSlugsForLocale(locale: "pt-BR" | "en"): string[] {
  return loadAllHubs()
    .filter((h) => h.locale === locale)
    .map((h) => h.slug);
}
