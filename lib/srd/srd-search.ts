import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";
import type { SrdMonster, SrdSpell, SrdCondition } from "./srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

export type { SrdMonster, SrdSpell };

// Singletons — built once by srd-store initializeSrd(), reused for all queries
let monsterIndex: Fuse<SrdMonster> | null = null;
let spellIndex: Fuse<SrdSpell> | null = null;
let conditionData: SrdCondition[] = [];
// keyed by `${id}:${ruleset_version}` for O(1) lookup
let monsterMap: Map<string, SrdMonster> = new Map();
let spellMap: Map<string, SrdSpell> = new Map();

const MONSTER_OPTIONS: IFuseOptions<SrdMonster> = {
  keys: [
    { name: "name", weight: 0.5 },
    { name: "type", weight: 0.3 },
    { name: "cr", weight: 0.2 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
};

const SPELL_OPTIONS: IFuseOptions<SrdSpell> = {
  keys: [
    { name: "name", weight: 0.6 },
    { name: "classes", weight: 0.2 },
    { name: "school", weight: 0.2 },
  ],
  threshold: 0.3,
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

/** Returns all loaded spells (both versions). Used by LinkedText for cross-referencing. */
export function getAllSpells(): SrdSpell[] {
  return Array.from(spellMap.values());
}

/** Resets singleton indexes — for testing only. */
export function resetSrdIndexes(): void {
  monsterIndex = null;
  spellIndex = null;
  conditionData = [];
  monsterMap = new Map();
  spellMap = new Map();
}
