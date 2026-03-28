import { readFileSync } from "fs";
import { join } from "path";
import type { SrdMonster, SrdSpell } from "./srd-loader";

const SRD_DIR = join(process.cwd(), "public", "srd");

let monsterCache: SrdMonster[] | null = null;
let spellCache: SrdSpell[] | null = null;

/** Load all SRD monsters from static JSON (server-side only).
 *  Returns only is_srd: true entries for public pages. */
export function getSrdMonsters(): SrdMonster[] {
  if (monsterCache) return monsterCache;
  const m2014: SrdMonster[] = JSON.parse(
    readFileSync(join(SRD_DIR, "monsters-2014.json"), "utf-8")
  );
  const m2024: SrdMonster[] = JSON.parse(
    readFileSync(join(SRD_DIR, "monsters-2024.json"), "utf-8")
  );
  monsterCache = [...m2014, ...m2024].filter((m) => m.is_srd === true);
  return monsterCache;
}

/** Load all SRD spells from static JSON (server-side only).
 *  Returns only is_srd: true entries for public pages. */
export function getSrdSpells(): SrdSpell[] {
  if (spellCache) return spellCache;
  const s2014: SrdSpell[] = JSON.parse(
    readFileSync(join(SRD_DIR, "spells-2014.json"), "utf-8")
  );
  const s2024: SrdSpell[] = JSON.parse(
    readFileSync(join(SRD_DIR, "spells-2024.json"), "utf-8")
  );
  spellCache = [...s2014, ...s2024].filter((s) => s.is_srd === true);
  return spellCache;
}

/** Generate a URL-safe slug from a monster/spell name */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Find a monster by slug */
export function getMonsterBySlug(slug: string): SrdMonster | undefined {
  return getSrdMonsters().find((m) => toSlug(m.name) === slug);
}

/** Find a spell by slug */
export function getSpellBySlug(slug: string): SrdSpell | undefined {
  return getSrdSpells().find((s) => toSlug(s.name) === slug);
}
