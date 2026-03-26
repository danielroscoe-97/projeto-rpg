import type { Combatant } from "@/lib/types/combat";
import { rollD20, abilityModifier } from "@/lib/utils/dice";
import type { SrdMonster } from "@/lib/srd/srd-loader";

/** Result of rolling initiative for a single combatant. */
export interface InitiativeRollResult {
  combatantId: string;
  total: number;
  /** Individual d20 result(s) (2 if advantage/disadvantage). */
  rolls: number[];
  modifier: number;
}

/**
 * Roll initiative for a single combatant.
 * If `dexScore` is provided, the modifier is derived from it.
 * Otherwise modifier defaults to 0 (plain 1d20).
 */
export function rollInitiativeForCombatant(
  combatantId: string,
  dexScore?: number | null
): InitiativeRollResult {
  const mod = dexScore != null ? abilityModifier(dexScore) : 0;
  const result = rollD20(mod);
  return {
    combatantId,
    total: result.total,
    rolls: result.rolls,
    modifier: mod,
  };
}

/**
 * Resolve the DEX score for a combatant.
 * For monsters with a monster_id, looks up the DEX from the SRD monster list.
 * Returns undefined if no DEX data is available.
 */
export function getDexScore(
  combatant: Combatant,
  monsterIndex: Map<string, SrdMonster>
): number | undefined {
  if (combatant.monster_id) {
    const monster = monsterIndex.get(combatant.monster_id);
    return monster?.dex ?? undefined;
  }
  return undefined;
}

/**
 * Sorts combatants in descending initiative order (highest first).
 * Stable: combatants with the same initiative keep their relative order.
 * Returns a NEW array — does not mutate the input.
 */
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    const ia = a.initiative ?? -Infinity;
    const ib = b.initiative ?? -Infinity;
    return ib - ia;
  });
}

/**
 * Returns a Set of initiative values that appear on more than one combatant.
 * Only considers combatants that have a non-null initiative.
 */
export function detectTies(combatants: Combatant[]): Set<number> {
  const counts = new Map<number, number>();
  for (const c of combatants) {
    if (c.initiative !== null) {
      counts.set(c.initiative, (counts.get(c.initiative) ?? 0) + 1);
    }
  }
  const ties = new Set<number>();
  for (const [value, count] of counts) {
    if (count > 1) ties.add(value);
  }
  return ties;
}

/**
 * Assigns `initiative_order` (0-based index) to each combatant in the array.
 * Mutates the input array IN PLACE — call on a sorted copy.
 */
export function assignInitiativeOrder(combatants: Combatant[]): Combatant[] {
  return combatants.map((c, index) => ({ ...c, initiative_order: index }));
}
