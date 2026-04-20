import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HubContent } from "./hub-types";

const HUBS_DIR = join(process.cwd(), "content/hubs");

/**
 * Read every content/hubs/*.json (excluding _prefixed scaffolding).
 * Called at build time by generateStaticParams / sitemap / metadata.
 */
export function loadAllHubs(): HubContent[] {
  return readdirSync(HUBS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(HUBS_DIR, f), "utf8")) as HubContent;
      } catch (err) {
        throw new Error(`Failed to parse ${f}: ${(err as Error).message}`);
      }
    });
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
