import type { RulesetVersion } from "@/lib/types/database";

export interface SrdMonster {
  id: string;
  name: string;
  cr: string;
  type: string;
  hit_points: number;
  armor_class: number;
  ruleset_version: RulesetVersion;
}

export interface SrdSpell {
  id: string;
  name: string;
  ruleset_version: RulesetVersion;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higher_levels: string | null;
  classes: string[];
  ritual: boolean;
  concentration: boolean;
}

export interface SrdCondition {
  id: string;
  name: string;
  description: string;
}

/** Fetches the SRD monster bundle for a given ruleset version.
 *  Results are cached by the browser via the standard fetch cache. */
export async function loadMonsters(
  version: RulesetVersion
): Promise<SrdMonster[]> {
  const res = await fetch(`/srd/monsters-${version}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load SRD monsters (${version}): ${res.status}`);
  }
  return res.json() as Promise<SrdMonster[]>;
}

/** Fetches the SRD spell bundle for a given ruleset version.
 *  Results are cached by the browser via the standard fetch cache. */
export async function loadSpells(
  version: RulesetVersion
): Promise<SrdSpell[]> {
  const res = await fetch(`/srd/spells-${version}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load SRD spells (${version}): ${res.status}`);
  }
  return res.json() as Promise<SrdSpell[]>;
}

/** Fetches the SRD conditions bundle (version-agnostic).
 *  Results are cached by the browser via the standard fetch cache. */
export async function loadConditions(): Promise<SrdCondition[]> {
  const res = await fetch(`/srd/conditions.json`);
  if (!res.ok) {
    throw new Error(`Failed to load SRD conditions: ${res.status}`);
  }
  return res.json() as Promise<SrdCondition[]>;
}
