import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HubContent } from "./hub-types";

const HUBS_DIR = join(process.cwd(), "content/hubs");

/**
 * Read every content/hubs/*.json (excluding _prefixed scaffolding).
 * Called at build time by generateStaticParams / sitemap / metadata.
 *
 * Fault-tolerant on purpose: a malformed JSON file or a missing HUBS_DIR
 * (e.g. wrong CWD in serverless) MUST NOT crash the caller. The sitemap
 * imports this; a thrown error here would 500 the sitemap for the whole
 * site. We log a warning and skip bad files instead.
 */
export function loadAllHubs(): HubContent[] {
  if (!existsSync(HUBS_DIR)) {
    console.warn(`[hub-loader] content/hubs/ not found at ${HUBS_DIR}`);
    return [];
  }
  const files = readdirSync(HUBS_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_"),
  );
  const hubs: HubContent[] = [];
  for (const f of files) {
    try {
      const hub = JSON.parse(
        readFileSync(join(HUBS_DIR, f), "utf8"),
      ) as HubContent;
      hubs.push(hub);
    } catch (err) {
      console.warn(
        `[hub-loader] skipping ${f}: ${(err as Error).message}`,
      );
    }
  }
  return hubs;
}

export function loadHub(
  slug: string,
  locale: "pt-BR" | "en",
): HubContent | null {
  return (
    loadAllHubs().find((h) => h.slug === slug && h.locale === locale) ?? null
  );
}

export function hubSlugsForLocale(locale: "pt-BR" | "en"): string[] {
  return loadAllHubs()
    .filter((h) => h.locale === locale)
    .map((h) => h.slug);
}
