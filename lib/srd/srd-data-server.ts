import { readFileSync } from "fs";
import { join } from "path";
import type { SrdMonster, SrdSpell } from "./srd-loader";

// ── PT-BR slug maps (EN slug → PT slug) ───────────────────────────
let monsterPtMap: Record<string, string> | null = null;
let spellPtMap: Record<string, string> | null = null;

function getMonsterPtMap(): Record<string, string> {
  if (monsterPtMap) return monsterPtMap;
  try {
    monsterPtMap = JSON.parse(readFileSync(join(process.cwd(), "public/srd/monster-names-pt.json"), "utf-8"));
  } catch {
    monsterPtMap = {};
  }
  return monsterPtMap!;
}

function getSpellPtMap(): Record<string, string> {
  if (spellPtMap) return spellPtMap;
  try {
    spellPtMap = JSON.parse(readFileSync(join(process.cwd(), "public/srd/spell-names-pt.json"), "utf-8"));
  } catch {
    spellPtMap = {};
  }
  return spellPtMap!;
}

/** Convert EN monster slug to PT-BR slug (falls back to EN slug) */
export function toMonsterSlugPt(enSlug: string): string {
  return getMonsterPtMap()[enSlug] ?? enSlug;
}

/** Convert EN spell slug to PT-BR slug (falls back to EN slug) */
export function toSpellSlugPt(enSlug: string): string {
  return getSpellPtMap()[enSlug] ?? enSlug;
}

/** Find a monster by its PT-BR slug */
export function getMonsterBySlugPt(ptSlug: string): SrdMonster | undefined {
  const reverseMap = Object.fromEntries(
    Object.entries(getMonsterPtMap()).map(([en, pt]) => [pt, en])
  );
  const enSlug = reverseMap[ptSlug] ?? ptSlug;
  return getMonsterBySlug(enSlug);
}

/** Find a spell by its PT-BR slug */
export function getSpellBySlugPt(ptSlug: string): SrdSpell | undefined {
  const reverseMap = Object.fromEntries(
    Object.entries(getSpellPtMap()).map(([en, pt]) => [pt, en])
  );
  const enSlug = reverseMap[ptSlug] ?? ptSlug;
  return getSpellBySlug(enSlug);
}

const SRD_DIR = join(process.cwd(), "public", "srd");

let monsterCache: SrdMonster[] | null = null;
let spellCache: SrdSpell[] | null = null;

/** Load all SRD monsters from static JSON (server-side only).
 *  Returns only is_srd: true entries for public pages. */
export function getSrdMonsters(): SrdMonster[] {
  if (monsterCache) return monsterCache;
  try {
    const m2014: SrdMonster[] = JSON.parse(
      readFileSync(join(SRD_DIR, "monsters-2014.json"), "utf-8")
    );
    const m2024: SrdMonster[] = JSON.parse(
      readFileSync(join(SRD_DIR, "monsters-2024.json"), "utf-8")
    );
    let mad: SrdMonster[] = [];
    try {
      mad = JSON.parse(readFileSync(join(SRD_DIR, "monsters-mad.json"), "utf-8"));
    } catch {
      // MAD file is optional
    }
    monsterCache = [...m2014, ...m2024].filter((m) => m.is_srd === true).concat(mad);
  } catch {
    monsterCache = [];
  }
  return monsterCache;
}

/** Load all SRD spells from static JSON (server-side only).
 *  Returns only is_srd: true entries for public pages. */
export function getSrdSpells(): SrdSpell[] {
  if (spellCache) return spellCache;
  try {
    const s2014: SrdSpell[] = JSON.parse(
      readFileSync(join(SRD_DIR, "spells-2014.json"), "utf-8")
    );
    const s2024: SrdSpell[] = JSON.parse(
      readFileSync(join(SRD_DIR, "spells-2024.json"), "utf-8")
    );
    spellCache = [...s2014, ...s2024].filter((s) => s.is_srd === true);
  } catch {
    spellCache = [];
  }
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

/** Deduplicate entries by slug (first wins) */
function dedupBySlug<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const slug = toSlug(item.name);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

/** Get deduplicated monster list for static generation */
export function getSrdMonstersDeduped(): SrdMonster[] {
  return dedupBySlug(getSrdMonsters());
}

/** Get deduplicated spell list for static generation */
export function getSrdSpellsDeduped(): SrdSpell[] {
  return dedupBySlug(getSrdSpells());
}

/** Find a monster by slug */
export function getMonsterBySlug(slug: string): SrdMonster | undefined {
  return getSrdMonsters().find((m) => toSlug(m.name) === slug);
}

/** Find a spell by slug */
export function getSpellBySlug(slug: string): SrdSpell | undefined {
  return getSrdSpells().find((s) => toSlug(s.name) === slug);
}
