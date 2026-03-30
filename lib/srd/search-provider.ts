import type { FuseResult } from "fuse.js";
import type { SrdMonster, SrdSpell, SrdItem, SrdCondition } from "./srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

export interface SearchOptions {
  version?: RulesetVersion;
}

export interface SrdSearchProvider {
  /** Search monsters by query string. */
  searchMonsters(query: string, options?: SearchOptions): FuseResult<SrdMonster>[];
  /** Search spells by query string. */
  searchSpells(query: string, options?: SearchOptions): FuseResult<SrdSpell>[];
  /** Search items by query string. */
  searchItems(query: string): FuseResult<SrdItem>[];

  /** O(1) lookups */
  getMonsterById(id: string, version: RulesetVersion): SrdMonster | undefined;
  getSpellById(id: string, version: RulesetVersion): SrdSpell | undefined;
  getItemById(id: string): SrdItem | undefined;

  /** Bulk accessors */
  getAllSpells(): SrdSpell[];
  getAllItems(): SrdItem[];
  getAllConditions(): SrdCondition[];
  getCoreConditions(): SrdCondition[];
  findCondition(name: string): SrdCondition | undefined;

  /** Index management */
  buildMonsterIndex(data: SrdMonster[]): void;
  buildSpellIndex(data: SrdSpell[]): void;
  buildItemIndex(data: SrdItem[]): void;
  setConditionData(data: SrdCondition[]): void;

  /** Merge external content */
  mergeHomebrewMonsters(data: SrdMonster[]): void;
  mergeHomebrewSpells(data: SrdSpell[]): void;
  mergeHomebrewItems(data: SrdItem[]): void;
  mergeImportedMonsters(data: SrdMonster[]): void;
  mergeImportedSpells(data: SrdSpell[]): void;

  /** Whether the provider is ready to serve queries. */
  isReady(): boolean;
}
