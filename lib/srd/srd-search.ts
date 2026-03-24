import Fuse, { type IFuseOptions } from "fuse.js";
import type { RulesetVersion } from "@/lib/types/database";
import { loadMonsters, type SrdMonster } from "./srd-loader";

export type { SrdMonster };

/** Singleton indexes keyed by ruleset version. Built once per session. */
const indexes: Partial<Record<RulesetVersion, Fuse<SrdMonster>>> = {};
/** Raw data cache so we can run programmatic lookups. */
const monsterData: Partial<Record<RulesetVersion, SrdMonster[]>> = {};

const FUSE_OPTIONS: IFuseOptions<SrdMonster> = {
  keys: ["name", "type"],
  threshold: 0.35,
  minMatchCharLength: 1,
};

async function getIndex(version: RulesetVersion): Promise<Fuse<SrdMonster>> {
  if (!indexes[version]) {
    const monsters = await loadMonsters(version);
    monsterData[version] = monsters;
    indexes[version] = new Fuse(monsters, FUSE_OPTIONS);
  }
  return indexes[version]!;
}

/** Search SRD monsters by name or type using Fuse.js.
 *  Returns all monsters when query is empty. */
export async function searchMonsters(
  query: string,
  version: RulesetVersion
): Promise<SrdMonster[]> {
  const index = await getIndex(version);
  if (!query.trim()) {
    return monsterData[version] ?? [];
  }
  return index.search(query).map((r) => r.item);
}

/** Resets the singleton indexes (useful for testing). */
export function resetSrdIndexes(): void {
  (Object.keys(indexes) as RulesetVersion[]).forEach((k) => {
    delete indexes[k];
    delete monsterData[k];
  });
}
