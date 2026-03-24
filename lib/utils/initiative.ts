import type { Combatant } from "@/lib/types/combat";

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
