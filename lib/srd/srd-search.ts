import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem, SrdRace } from "./srd-loader";
import type { RulesetVersion } from "@/lib/types/database";
import type { SrdAbility } from "@/lib/data/srd-abilities";

export type { SrdMonster, SrdSpell, SrdItem, SrdRace };

// ── Types for feats & backgrounds (flat search) ──────────────────
export interface SrdFeatEntry {
  id: string;
  name: string;
  /** PT-BR translated name — injected at runtime by translation-loader */
  name_pt?: string;
  description: string;
  prerequisite: string | null;
  source: string;
  ruleset_version: string;
  srd?: boolean;
}

export interface SrdBackgroundEntry {
  id: string;
  name: string;
  /** PT-BR translated name — injected at runtime by translation-loader */
  name_pt?: string;
  description: string;
  source: string;
  skill_proficiencies: string[];
  feature_name: string | null;
  feature_description: string | null;
  srd?: boolean;
}

// Singletons — built once by srd-store initializeSrd(), reused for all queries
let monsterIndex: Fuse<SrdMonster> | null = null;
let spellIndex: Fuse<SrdSpell> | null = null;
let itemIndex: Fuse<SrdItem> | null = null;
let featIndex: Fuse<SrdFeatEntry> | null = null;
let backgroundIndex: Fuse<SrdBackgroundEntry> | null = null;
let abilityIndex: Fuse<SrdAbility> | null = null;
let raceIndex: Fuse<SrdRace> | null = null;
let conditionData: SrdCondition[] = [];
// keyed by `${id}:${ruleset_version}` for O(1) lookup
let monsterMap: Map<string, SrdMonster> = new Map();
let spellMap: Map<string, SrdSpell> = new Map();
let itemMap: Map<string, SrdItem> = new Map();
let featMap: Map<string, SrdFeatEntry> = new Map();
let backgroundMap: Map<string, SrdBackgroundEntry> = new Map();
let raceMap: Map<string, SrdRace> = new Map();
// Cross-version monster ID mapping (bidirectional: 2014-id ↔ 2024-id)
let monsterCrossref: Record<string, string> = {};

const MONSTER_OPTIONS: IFuseOptions<SrdMonster> = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "name_pt", weight: 0.25 },
    { name: "type", weight: 0.2 },
    { name: "cr", weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

const ITEM_OPTIONS: IFuseOptions<SrdItem> = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "name_pt", weight: 0.25 },
    { name: "type", weight: 0.2 },
    { name: "rarity", weight: 0.1 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
};

const SPELL_OPTIONS: IFuseOptions<SrdSpell> = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "name_pt", weight: 0.25 },
    { name: "classes", weight: 0.15 },
    { name: "school", weight: 0.15 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

const FEAT_OPTIONS: IFuseOptions<SrdFeatEntry> = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "name_pt", weight: 0.25 },
    { name: "description", weight: 0.2 },
    { name: "source", weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

const BACKGROUND_OPTIONS: IFuseOptions<SrdBackgroundEntry> = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "name_pt", weight: 0.25 },
    { name: "skill_proficiencies", weight: 0.2 },
    { name: "source", weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

const RACE_OPTIONS: IFuseOptions<SrdRace> = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "namePt", weight: 0.25 },
    { name: "ability_bonuses", weight: 0.15 },
    { name: "source", weight: 0.1 },
    { name: "languages", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

const ABILITY_OPTIONS: IFuseOptions<SrdAbility> = {
  keys: [
    { name: "name", weight: 0.5 },
    { name: "name_pt", weight: 0.2 },
    { name: "source_class", weight: 0.15 },
    { name: "source_race", weight: 0.15 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

export function buildMonsterIndex(data: SrdMonster[]): void {
  monsterIndex = new Fuse(data, MONSTER_OPTIONS);
  monsterMap = new Map(data.map((m) => [`${m.id}:${m.ruleset_version}`, m]));
}

export function buildSpellIndex(data: SrdSpell[]): void {
  spellIndex = new Fuse(data, SPELL_OPTIONS);
  spellMap = new Map(data.map((s) => [`${s.id}:${s.ruleset_version}`, s]));
}

export function buildItemIndex(data: SrdItem[]): void {
  itemIndex = new Fuse(data, ITEM_OPTIONS);
  itemMap = new Map(data.map((i) => [i.id, i]));
}

export function setConditionData(data: SrdCondition[]): void {
  conditionData = data;
}

export function searchMonsters(
  query: string,
  version?: RulesetVersion
): FuseResult<SrdMonster>[] {
  if (!monsterIndex || !query) return [];
  const results = monsterIndex.search(query);
  if (version) return results.filter((r) => r.item.ruleset_version === version);
  return results;
}

export function searchSpells(
  query: string,
  version?: RulesetVersion
): FuseResult<SrdSpell>[] {
  if (!spellIndex || !query) return [];
  const results = spellIndex.search(query);
  if (version) return results.filter((r) => r.item.ruleset_version === version);
  return results;
}

/** Exact match by name (case-insensitive). Conditions is a small dataset. */
export function findCondition(name: string): SrdCondition | undefined {
  return conditionData.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}

export function getAllConditions(): SrdCondition[] {
  return conditionData;
}

/** Returns only core conditions (not diseases or statuses). */
export function getCoreConditions(): SrdCondition[] {
  return conditionData.filter((c) => !c.category || c.category === "condition");
}

/** Returns conditions filtered by category. */
export function getConditionsByCategory(
  category: "condition" | "disease" | "status"
): SrdCondition[] {
  return conditionData.filter((c) => c.category === category);
}

/** Look up a single spell by SRD id and ruleset version. O(1) map lookup. */
export function getSpellById(
  id: string,
  version: RulesetVersion
): SrdSpell | undefined {
  return spellMap.get(`${id}:${version}`);
}

/** Look up a single monster by SRD id and ruleset version. O(1) map lookup. */
export function getMonsterById(
  id: string,
  version: RulesetVersion
): SrdMonster | undefined {
  return monsterMap.get(`${id}:${version}`);
}

/** Set the cross-version monster ID mapping. Called by srd-store after loading. */
export function setMonsterCrossref(data: Record<string, string>): void {
  monsterCrossref = data;
}

/** Get the equivalent monster ID in the other ruleset version.
 *  Returns undefined if no cross-version equivalent exists. */
export function getCrossVersionMonsterId(monsterId: string): string | undefined {
  return monsterCrossref[monsterId];
}

/** Returns all loaded spells (both versions). Used by LinkedText for cross-referencing. */
export function getAllSpells(): SrdSpell[] {
  return Array.from(spellMap.values());
}

export function searchItems(
  query: string,
): FuseResult<SrdItem>[] {
  if (!itemIndex || !query) return [];
  return itemIndex.search(query);
}

/** Look up a single item by SRD id. O(1) map lookup. */
export function getItemById(id: string): SrdItem | undefined {
  return itemMap.get(id);
}

/** Returns all loaded items. */
export function getAllItems(): SrdItem[] {
  return Array.from(itemMap.values());
}

// ── Feats ────────────────────────────────────────────────────────────────────

export function buildFeatIndex(data: SrdFeatEntry[]): void {
  featIndex = new Fuse(data, FEAT_OPTIONS);
  featMap = new Map(data.map((f) => [f.id, f]));
}

export function searchFeats(query: string): FuseResult<SrdFeatEntry>[] {
  if (!featIndex || !query) return [];
  return featIndex.search(query);
}

export function getAllFeats(): SrdFeatEntry[] {
  return Array.from(featMap.values());
}

export function getFeatById(id: string): SrdFeatEntry | undefined {
  return featMap.get(id);
}

// ── Backgrounds ──────────────────────────────────────────────────────────────

export function buildBackgroundIndex(data: SrdBackgroundEntry[]): void {
  backgroundIndex = new Fuse(data, BACKGROUND_OPTIONS);
  backgroundMap = new Map(data.map((b) => [b.id, b]));
}

export function searchBackgrounds(query: string): FuseResult<SrdBackgroundEntry>[] {
  if (!backgroundIndex || !query) return [];
  return backgroundIndex.search(query);
}

export function getAllBackgrounds(): SrdBackgroundEntry[] {
  return Array.from(backgroundMap.values());
}

// ── Races ─────────────────────────────────────────────────────────────────────

export function buildRaceIndex(data: SrdRace[]): void {
  raceIndex = new Fuse(data, RACE_OPTIONS);
  raceMap = new Map(data.map((r) => [r.id, r]));
}

export function searchRaces(query: string): FuseResult<SrdRace>[] {
  if (!raceIndex || !query) return [];
  return raceIndex.search(query);
}

export function getAllRaces(): SrdRace[] {
  return Array.from(raceMap.values());
}

export function getRaceById(id: string): SrdRace | undefined {
  return raceMap.get(id);
}

// ── Abilities (class features, racial traits, feats, subclass features) ──────

export function buildAbilityIndex(data: SrdAbility[]): void {
  abilityIndex = new Fuse(data, ABILITY_OPTIONS);
}

export function searchAbilities(query: string): FuseResult<SrdAbility>[] {
  if (!abilityIndex || !query) return [];
  return abilityIndex.search(query);
}

// ── Homebrew merge ────────────────────────────────────────────────────────────

/**
 * Merge homebrew monsters into the existing Fuse.js index.
 * Call after loading homebrew from Supabase.
 * Homebrew entries get `is_homebrew: true` for badge rendering.
 */
export function mergeHomebrewMonsters(homebrew: SrdMonster[]): void {
  homebrew.forEach((m) => monsterMap.set(`${m.id}:${m.ruleset_version}`, m));
  monsterIndex = new Fuse(Array.from(monsterMap.values()), MONSTER_OPTIONS);
}

export function mergeHomebrewSpells(homebrew: SrdSpell[]): void {
  homebrew.forEach((s) => spellMap.set(`${s.id}:${s.ruleset_version}`, s));
  spellIndex = new Fuse(Array.from(spellMap.values()), SPELL_OPTIONS);
}

export function mergeHomebrewItems(homebrew: SrdItem[]): void {
  homebrew.forEach((i) => itemMap.set(i.id, i));
  itemIndex = new Fuse(Array.from(itemMap.values()), ITEM_OPTIONS);
}

// ── Imported content merge ──────────────────────────────────────────────────

/**
 * Merge imported monsters into the existing Fuse.js index.
 * Call after loading imported content from IndexedDB.
 */
export function mergeImportedMonsters(imported: SrdMonster[]): void {
  imported.forEach((m) => monsterMap.set(`${m.id}:${m.ruleset_version}`, m));
  monsterIndex = new Fuse(Array.from(monsterMap.values()), MONSTER_OPTIONS);
}

export function mergeImportedSpells(imported: SrdSpell[]): void {
  imported.forEach((s) => spellMap.set(`${s.id}:${s.ruleset_version}`, s));
  spellIndex = new Fuse(Array.from(spellMap.values()), SPELL_OPTIONS);
}

// ── PT-BR translation injection ──────────────────────────────────────────────

/**
 * Inject name_pt into existing data objects and rebuild Fuse indexes.
 * Called from srd-store Phase 2 after translation files load.
 * name_pt fields are added in-place (mutating) for zero-copy efficiency.
 */
export function injectTranslationsAndRebuild(translations: {
  monsters?: Record<string, string>;
  spells?: Record<string, string>;
  items?: Record<string, string>;
  feats?: Record<string, string>;
  backgrounds?: Record<string, string>;
}): void {
  if (translations.monsters && monsterMap.size > 0) {
    for (const m of monsterMap.values()) {
      const pt = translations.monsters[m.id];
      if (pt) m.name_pt = pt;
    }
    monsterIndex = new Fuse(Array.from(monsterMap.values()), MONSTER_OPTIONS);
  }
  if (translations.spells && spellMap.size > 0) {
    for (const s of spellMap.values()) {
      const pt = translations.spells[s.id];
      if (pt) s.name_pt = pt;
    }
    spellIndex = new Fuse(Array.from(spellMap.values()), SPELL_OPTIONS);
  }
  if (translations.items && itemMap.size > 0) {
    for (const i of itemMap.values()) {
      const pt = translations.items[i.id];
      if (pt) i.name_pt = pt;
    }
    itemIndex = new Fuse(Array.from(itemMap.values()), ITEM_OPTIONS);
  }
  if (translations.feats && featMap.size > 0) {
    for (const f of featMap.values()) {
      const pt = translations.feats[f.id];
      if (pt) f.name_pt = pt;
    }
    featIndex = new Fuse(Array.from(featMap.values()), FEAT_OPTIONS);
  }
  if (translations.backgrounds && backgroundMap.size > 0) {
    for (const b of backgroundMap.values()) {
      const pt = translations.backgrounds[b.id];
      if (pt) b.name_pt = pt;
    }
    backgroundIndex = new Fuse(Array.from(backgroundMap.values()), BACKGROUND_OPTIONS);
  }
}

/** Resets singleton indexes — for testing only. */
export function resetSrdIndexes(): void {
  monsterIndex = null;
  spellIndex = null;
  itemIndex = null;
  featIndex = null;
  backgroundIndex = null;
  abilityIndex = null;
  raceIndex = null;
  conditionData = [];
  monsterMap = new Map();
  spellMap = new Map();
  itemMap = new Map();
  featMap = new Map();
  backgroundMap = new Map();
  raceMap = new Map();
}
