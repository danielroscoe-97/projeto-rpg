import type { Combatant } from "@/lib/types/combat";
import { rollD20, abilityModifier } from "@/lib/utils/dice";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { RollResult } from "@/lib/dice/roll";

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
 * Dispatch an initiative roll to the dice history panel via CustomEvent.
 * Converts an InitiativeRollResult into a RollResult and fires "dice-roll-result".
 */
export function dispatchInitiativeRoll(
  rollResult: InitiativeRollResult,
  name: string
): void {
  if (typeof window === "undefined") return;
  const mod = rollResult.modifier;
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  const result: RollResult = {
    notation: `1d20${modStr}`,
    label: "Iniciativa",
    dice: [{ sides: 20, value: rollResult.rolls[0] }],
    modifier: mod,
    total: rollResult.total,
    isNat1: rollResult.rolls[0] === 1,
    isNat20: rollResult.rolls[0] === 20,
    mode: "normal",
    discardedDice: [],
    source: name,
  };
  window.dispatchEvent(
    new CustomEvent("dice-roll-result", { detail: structuredClone(result) })
  );
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
 * Group-aware: members of the same monster_group_id are always kept adjacent,
 * sorted internally by group_order. A group's position is determined by its
 * shared initiative value. Returns a NEW array — does not mutate the input.
 */
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  // 1. Identify each group's representative initiative (use max among members)
  const groupInitiative = new Map<string, number>();
  for (const c of combatants) {
    if (c.monster_group_id) {
      const current = groupInitiative.get(c.monster_group_id) ?? -Infinity;
      const val = c.initiative ?? -Infinity;
      if (val > current) groupInitiative.set(c.monster_group_id, val);
    }
  }

  // 2. Build render blocks: ungrouped combatants are solo blocks, groups are one block
  type Block = { initiative: number; groupId: string | null; members: Combatant[] };
  const blocks: Block[] = [];
  const seenGroups = new Set<string>();

  for (const c of combatants) {
    if (c.monster_group_id) {
      if (seenGroups.has(c.monster_group_id)) continue;
      seenGroups.add(c.monster_group_id);
      const members = combatants
        .filter((m) => m.monster_group_id === c.monster_group_id)
        .sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));
      blocks.push({
        initiative: groupInitiative.get(c.monster_group_id) ?? -Infinity,
        groupId: c.monster_group_id,
        members,
      });
    } else {
      blocks.push({
        initiative: c.initiative ?? -Infinity,
        groupId: null,
        members: [c],
      });
    }
  }

  // 3. Sort blocks descending by initiative (stable).
  // D&D 5e: Lair actions at initiative 20 lose ties — placed after real combatants.
  blocks.sort((a, b) => {
    const diff = b.initiative - a.initiative;
    if (diff !== 0) return diff;
    // Tie-break: lair action entries go after real combatants at the same initiative
    const aLair = a.members[0]?.is_lair_action ? 1 : 0;
    const bLair = b.members[0]?.is_lair_action ? 1 : 0;
    return aLair - bLair;
  });

  // 4. Flatten back
  return blocks.flatMap((block) => block.members);
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
 * After a drag-and-drop reorder, recalculate the moved combatant's (or group's)
 * initiative so it fits its new position in descending order.
 *
 * If the moved combatant belongs to a monster group, ALL group members receive
 * the same new initiative value so the group stays together on re-sort.
 *
 * @param reordered  - the full array after arrayMove (new visual order)
 * @param movedId    - the id of the combatant that was dragged
 * @returns a new array with the moved combatant's (or group's) initiative adjusted
 */
export function adjustInitiativeAfterReorder(
  reordered: Combatant[],
  movedId: string
): Combatant[] {
  const moved = reordered.find((c) => c.id === movedId);
  if (!moved) return reordered;

  const groupId = moved.monster_group_id;

  // Find the range of the moved group/combatant in the reordered array
  let blockStart: number;
  let blockEnd: number;
  if (groupId) {
    blockStart = reordered.findIndex((c) => c.monster_group_id === groupId);
    blockEnd = blockStart;
    while (blockEnd < reordered.length - 1 && reordered[blockEnd + 1].monster_group_id === groupId) {
      blockEnd++;
    }
  } else {
    blockStart = reordered.indexOf(moved);
    blockEnd = blockStart;
  }

  // Find external neighbors (outside the group block)
  const neighborAbove = blockStart > 0 ? reordered[blockStart - 1] : null;
  const neighborBelow = blockEnd < reordered.length - 1 ? reordered[blockEnd + 1] : null;

  // List is descending: position 0 = highest initiative.
  let newInit: number;
  if (!neighborAbove && neighborBelow?.initiative != null) {
    newInit = neighborBelow.initiative + 1;
  } else if (neighborAbove?.initiative != null) {
    newInit = neighborAbove.initiative - 1;
  } else {
    return reordered;
  }

  // Apply to the moved combatant AND all members of its group
  const movedGroupId = moved.monster_group_id;
  return reordered.map((c) => {
    if (c.id === movedId) return { ...c, initiative: newInit };
    if (movedGroupId && c.monster_group_id === movedGroupId) return { ...c, initiative: newInit };
    return c;
  });
}
