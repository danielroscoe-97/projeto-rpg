import { readFileSync } from "fs";
import { join } from "path";
import type { SrdMonster, SrdSpell, SrdItem } from "./srd-loader";

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

// ── PT-BR display names + descriptions ─────────────────────────
let spellDescPtMap: Record<string, { name_pt: string; description: string; higher_levels?: string | null }> | null = null;

function getSpellDescPtMap() {
  if (spellDescPtMap) return spellDescPtMap;
  try {
    spellDescPtMap = JSON.parse(readFileSync(join(process.cwd(), "public/srd/spell-descriptions-pt.json"), "utf-8"));
  } catch {
    spellDescPtMap = {};
  }
  return spellDescPtMap!;
}

/** Get PT-BR display name for a spell (by EN slug). Falls back to original name. */
export function getSpellNamePt(enSlug: string, fallback: string): string {
  return getSpellDescPtMap()[enSlug]?.name_pt ?? fallback;
}

/** Get PT-BR description for a spell (by EN slug). */
export function getSpellDescriptionPt(enSlug: string): string | undefined {
  return getSpellDescPtMap()[enSlug]?.description;
}

/** Get PT-BR higher-levels text for a spell (by EN slug). */
export function getSpellHigherLevelsPt(enSlug: string): string | undefined {
  return getSpellDescPtMap()[enSlug]?.higher_levels ?? undefined;
}

const SRD_DIR = join(process.cwd(), "public", "srd");

// ── SRD whitelists (slug-based) ─────────────────────────────────
// Only monsters/spells in these whitelists are exposed on public pages.
// MAD (Monster-a-Day) monsters are CC-licensed and always allowed.
let srdMonsterWhitelist: Set<string> | null = null;
let srdSpellWhitelist: Set<string> | null = null;
let srdItemWhitelist: Set<string> | null = null;

function getSrdMonsterWhitelist(): Set<string> {
  if (srdMonsterWhitelist) return srdMonsterWhitelist;
  try {
    const slugs: string[] = JSON.parse(readFileSync(join(SRD_DIR, "srd-monster-whitelist.json"), "utf-8"));
    srdMonsterWhitelist = new Set(slugs);
  } catch {
    srdMonsterWhitelist = new Set();
  }
  return srdMonsterWhitelist;
}

function getSrdSpellWhitelist(): Set<string> {
  if (srdSpellWhitelist) return srdSpellWhitelist;
  try {
    const slugs: string[] = JSON.parse(readFileSync(join(SRD_DIR, "srd-spell-whitelist.json"), "utf-8"));
    srdSpellWhitelist = new Set(slugs);
  } catch {
    srdSpellWhitelist = new Set();
  }
  return srdSpellWhitelist;
}

function getSrdItemWhitelist(): Set<string> {
  if (srdItemWhitelist) return srdItemWhitelist;
  try {
    const slugs: string[] = JSON.parse(readFileSync(join(SRD_DIR, "srd-item-whitelist.json"), "utf-8"));
    srdItemWhitelist = new Set(slugs);
  } catch {
    srdItemWhitelist = new Set();
  }
  return srdItemWhitelist;
}

let monsterCache: SrdMonster[] | null = null;
let spellCache: SrdSpell[] | null = null;
let itemCache: SrdItem[] | null = null;

/** Load SRD-licensed monsters only (CC-BY-4.0).
 *  Filters 2014/2024 by srd-monster-whitelist.json; MAD are CC and always included. */
export function getSrdMonsters(): SrdMonster[] {
  if (monsterCache) return monsterCache;
  try {
    const whitelist = getSrdMonsterWhitelist();
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
    // Filter WotC content by SRD whitelist; MAD is CC-licensed, include all
    const srd2014 = m2014.filter((m) => whitelist.has(toSlug(m.name)));
    const srd2024 = m2024.filter((m) => whitelist.has(toSlug(m.name)));
    monsterCache = [...srd2014, ...srd2024, ...mad];
  } catch {
    monsterCache = [];
  }
  return monsterCache;
}

/** Load SRD-licensed spells only (CC-BY-4.0).
 *  Filters by srd-spell-whitelist.json to exclude non-SRD content. */
export function getSrdSpells(): SrdSpell[] {
  if (spellCache) return spellCache;
  try {
    const whitelist = getSrdSpellWhitelist();
    const s2014: SrdSpell[] = JSON.parse(
      readFileSync(join(SRD_DIR, "spells-2014.json"), "utf-8")
    );
    const s2024: SrdSpell[] = JSON.parse(
      readFileSync(join(SRD_DIR, "spells-2024.json"), "utf-8")
    );
    spellCache = [...s2014, ...s2024].filter((s) => whitelist.has(toSlug(s.name)));
  } catch {
    spellCache = [];
  }
  return spellCache;
}

/** Load SRD-licensed items only (CC-BY-4.0).
 *  Filters by srd-item-whitelist.json to exclude non-SRD content. */
export function getSrdItems(): SrdItem[] {
  if (itemCache) return itemCache;
  try {
    const whitelist = getSrdItemWhitelist();
    const items: SrdItem[] = JSON.parse(
      readFileSync(join(SRD_DIR, "items.json"), "utf-8")
    );
    itemCache = items.filter((i) => whitelist.has(i.id));
  } catch {
    itemCache = [];
  }
  return itemCache;
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
