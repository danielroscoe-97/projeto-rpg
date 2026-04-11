import type { SrdSearchProvider, SearchOptions } from "./search-provider";
import type { FuseResult } from "fuse.js";
import type { SrdMonster, SrdSpell, SrdItem, SrdCondition } from "./srd-loader";
import type { SrdFeatEntry, SrdBackgroundEntry } from "./srd-search";
import type { SrdAbility } from "@/lib/data/srd-abilities";
import type { RulesetVersion } from "@/lib/types/database";
import * as search from "./srd-search";

/**
 * Fuse.js-backed search provider.
 * Delegates to the existing srd-search.ts singleton functions.
 *
 * Future: HybridSearchProvider can implement the same interface
 * using Fuse.js for cache hits + Supabase full-text search for cold queries.
 */
export class FuseSearchProvider implements SrdSearchProvider {
  searchMonsters(query: string, options?: SearchOptions): FuseResult<SrdMonster>[] {
    return search.searchMonsters(query, options?.version);
  }

  searchSpells(query: string, options?: SearchOptions): FuseResult<SrdSpell>[] {
    return search.searchSpells(query, options?.version);
  }

  searchItems(query: string): FuseResult<SrdItem>[] {
    return search.searchItems(query);
  }

  getMonsterById(id: string, version: RulesetVersion): SrdMonster | undefined {
    return search.getMonsterById(id, version);
  }

  getSpellById(id: string, version: RulesetVersion): SrdSpell | undefined {
    return search.getSpellById(id, version);
  }

  getItemById(id: string): SrdItem | undefined {
    return search.getItemById(id);
  }

  getAllSpells(): SrdSpell[] {
    return search.getAllSpells();
  }

  getAllItems(): SrdItem[] {
    return search.getAllItems();
  }

  getAllConditions(): SrdCondition[] {
    return search.getAllConditions();
  }

  getCoreConditions(): SrdCondition[] {
    return search.getCoreConditions();
  }

  findCondition(name: string): SrdCondition | undefined {
    return search.findCondition(name);
  }

  buildMonsterIndex(data: SrdMonster[]): void {
    search.buildMonsterIndex(data);
  }

  buildSpellIndex(data: SrdSpell[]): void {
    search.buildSpellIndex(data);
  }

  buildItemIndex(data: SrdItem[]): void {
    search.buildItemIndex(data);
  }

  setConditionData(data: SrdCondition[]): void {
    search.setConditionData(data);
  }

  mergeHomebrewMonsters(data: SrdMonster[]): void {
    search.mergeHomebrewMonsters(data);
  }

  mergeHomebrewSpells(data: SrdSpell[]): void {
    search.mergeHomebrewSpells(data);
  }

  mergeHomebrewItems(data: SrdItem[]): void {
    search.mergeHomebrewItems(data);
  }

  mergeImportedMonsters(data: SrdMonster[]): void {
    search.mergeImportedMonsters(data);
  }

  mergeImportedSpells(data: SrdSpell[]): void {
    search.mergeImportedSpells(data);
  }

  // ── Feats, Backgrounds, Abilities ──────────────────────────────

  buildFeatIndex(data: SrdFeatEntry[]): void {
    search.buildFeatIndex(data);
  }

  searchFeats(query: string): FuseResult<SrdFeatEntry>[] {
    return search.searchFeats(query);
  }

  buildBackgroundIndex(data: SrdBackgroundEntry[]): void {
    search.buildBackgroundIndex(data);
  }

  searchBackgrounds(query: string): FuseResult<SrdBackgroundEntry>[] {
    return search.searchBackgrounds(query);
  }

  buildAbilityIndex(data: SrdAbility[]): void {
    search.buildAbilityIndex(data);
  }

  searchAbilities(query: string): FuseResult<SrdAbility>[] {
    return search.searchAbilities(query);
  }

  isReady(): boolean {
    // Fuse provider is ready as soon as indexes are built.
    // We proxy to getAllConditions as a simple readiness check —
    // conditions are always loaded if SRD init completed.
    return search.getAllConditions().length > 0;
  }
}

/** Singleton instance — swap this for HybridSearchProvider when bundles exceed 5MB. */
export const srdSearchProvider = new FuseSearchProvider();
