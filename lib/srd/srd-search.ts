import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";
import type { SrdMonster, SrdSpell, SrdCondition } from "./srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

export type { SrdMonster };

// Singletons — built once by srd-store initializeSrd(), reused for all queries
let monsterIndex: Fuse<SrdMonster> | null = null;
let spellIndex: Fuse<SrdSpell> | null = null;
let conditionData: SrdCondition[] = [];

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
}

export function buildSpellIndex(data: SrdSpell[]): void {
  spellIndex = new Fuse(data, SPELL_OPTIONS);
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

/** Resets singleton indexes — for testing only. */
export function resetSrdIndexes(): void {
  monsterIndex = null;
  spellIndex = null;
  conditionData = [];
}
