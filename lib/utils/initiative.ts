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

/**
 * After a drag-and-drop reorder, recalculate the moved combatant's initiative
 * so it fits its new position in descending order.
 *
 * @param reordered  - the full array after arrayMove (new visual order)
 * @param movedId    - the id of the combatant that was dragged
 * @returns a new array with the moved combatant's initiative adjusted
 */
export function adjustInitiativeAfterReorder(
  reordered: Combatant[],
  movedId: string
): Combatant[] {
  const idx = reordered.findIndex((c) => c.id === movedId);
  if (idx === -1) return reordered;

  const above = idx > 0 ? reordered[idx - 1] : null;
  const below = idx < reordered.length - 1 ? reordered[idx + 1] : null;

  // List is descending: position 0 = highest initiative.
  // The moved combatant must fit between its neighbors.
  let newInit: number;
  if (!above && below?.initiative !== null && below) {
    // Moved to top — must be higher than the one below
    newInit = below.initiative! + 1;
  } else if (above?.initiative !== null && above) {
    // Has a neighbor above — place just below it
    newInit = above.initiative! - 1;
  } else {
    return reordered;
  }

  return reordered.map((c) =>
    c.id === movedId ? { ...c, initiative: newInit } : c
  );
}
