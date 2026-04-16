/**
 * Centralized lazy-loaders for PT-BR translation data.
 * Each loader fetches a JSON file on first call, caches the result, and returns
 * a Record<slug, name_pt> map. All loaders are fire-and-forget safe.
 */

// ── Monster names ─────────────────────────────────────────────────────
type MonsterTranslationEntry = { name?: string };
type MonsterTranslationData = Record<string, MonsterTranslationEntry>;

let monsterNamesCache: Record<string, string> | null = null;
let monsterNamesPromise: Promise<Record<string, string>> | null = null;

export function loadMonsterNamesPt(): Promise<Record<string, string>> {
  if (monsterNamesCache) return Promise.resolve(monsterNamesCache);
  if (monsterNamesPromise) return monsterNamesPromise;
  monsterNamesPromise = import("@/data/srd/monster-descriptions-pt.json")
    .then((mod) => {
      const raw = mod.default as MonsterTranslationData;
      const map: Record<string, string> = {};
      for (const [slug, entry] of Object.entries(raw)) {
        if (entry.name) map[slug] = entry.name;
      }
      monsterNamesCache = map;
      return map;
    })
    .catch(() => {
      monsterNamesPromise = null;
      return {};
    });
  return monsterNamesPromise;
}

export function getMonsterNamesPtSync(): Record<string, string> | null {
  return monsterNamesCache;
}

// ── Spell names ───────────────────────────────────────────────────────
type SpellTranslationEntry = { name_pt?: string };
type SpellTranslationData = Record<string, SpellTranslationEntry>;

let spellNamesCache: Record<string, string> | null = null;
let spellNamesPromise: Promise<Record<string, string>> | null = null;

export function loadSpellNamesPt(): Promise<Record<string, string>> {
  if (spellNamesCache) return Promise.resolve(spellNamesCache);
  if (spellNamesPromise) return spellNamesPromise;
  spellNamesPromise = import("@/data/srd/spell-descriptions-pt.json")
    .then((mod) => {
      const raw = mod.default as SpellTranslationData;
      const map: Record<string, string> = {};
      for (const [slug, entry] of Object.entries(raw)) {
        if (entry.name_pt) map[slug] = entry.name_pt;
      }
      spellNamesCache = map;
      return map;
    })
    .catch(() => {
      spellNamesPromise = null;
      return {};
    });
  return spellNamesPromise;
}

export function getSpellNamesPtSync(): Record<string, string> | null {
  return spellNamesCache;
}

// ── Item names ────────────────────────────────────────────────────────
type ItemTranslationEntry = { name_pt?: string };
type ItemTranslationData = Record<string, ItemTranslationEntry>;

let itemNamesCache: Record<string, string> | null = null;
let itemNamesPromise: Promise<Record<string, string>> | null = null;

export function loadItemNamesPt(): Promise<Record<string, string>> {
  if (itemNamesCache) return Promise.resolve(itemNamesCache);
  if (itemNamesPromise) return itemNamesPromise;
  itemNamesPromise = import("@/data/srd/item-descriptions-pt.json")
    .then((mod) => {
      const raw = mod.default as ItemTranslationData;
      const map: Record<string, string> = {};
      for (const [slug, entry] of Object.entries(raw)) {
        if (entry.name_pt) map[slug] = entry.name_pt;
      }
      itemNamesCache = map;
      return map;
    })
    .catch(() => {
      itemNamesPromise = null;
      return {};
    });
  return itemNamesPromise;
}

export function getItemNamesPtSync(): Record<string, string> | null {
  return itemNamesCache;
}

// ── Feat names ────────────────────────────────────────────────────────
let featNamesCache: Record<string, string> | null = null;
let featNamesPromise: Promise<Record<string, string>> | null = null;

export function loadFeatNamesPt(): Promise<Record<string, string>> {
  if (featNamesCache) return Promise.resolve(featNamesCache);
  if (featNamesPromise) return featNamesPromise;
  featNamesPromise = import("@/data/srd/feat-descriptions-pt.json")
    .then((mod) => {
      const raw = mod.default as Record<string, { name_pt?: string }>;
      const map: Record<string, string> = {};
      for (const [slug, entry] of Object.entries(raw)) {
        if (entry.name_pt) map[slug] = entry.name_pt;
      }
      featNamesCache = map;
      return map;
    })
    .catch(() => {
      featNamesPromise = null;
      return {};
    });
  return featNamesPromise;
}

export function getFeatNamesPtSync(): Record<string, string> | null {
  return featNamesCache;
}

// ── Background names ──────────────────────────────────────────────────
let bgNamesCache: Record<string, string> | null = null;
let bgNamesPromise: Promise<Record<string, string>> | null = null;

export function loadBackgroundNamesPt(): Promise<Record<string, string>> {
  if (bgNamesCache) return Promise.resolve(bgNamesCache);
  if (bgNamesPromise) return bgNamesPromise;
  bgNamesPromise = import("@/data/srd/background-descriptions-pt.json")
    .then((mod) => {
      const raw = mod.default as Record<string, { name_pt?: string }>;
      const map: Record<string, string> = {};
      for (const [slug, entry] of Object.entries(raw)) {
        if (entry.name_pt) map[slug] = entry.name_pt;
      }
      bgNamesCache = map;
      return map;
    })
    .catch(() => {
      bgNamesPromise = null;
      return {};
    });
  return bgNamesPromise;
}

export function getBackgroundNamesPtSync(): Record<string, string> | null {
  return bgNamesCache;
}

// ── Generic helper ────────────────────────────────────────────────────
/** Resolve a PT-BR name from a translation map, with English fallback */
export function getNamePt(
  map: Record<string, string> | null,
  slug: string,
  fallback: string,
): string {
  if (!map) return fallback;
  return map[slug] ?? fallback;
}
