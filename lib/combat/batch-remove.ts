/**
 * S3.4 — Pure helpers for batch-remove operations on a list of combatants.
 *
 * Extracted from useCombatActions.handleRemoveCombatantsBatch / GuestCombatClient
 * so the turn-index adjust logic can be unit-tested without touching Supabase
 * or the Zustand stores. The live callers in `auth` + `guest` mode wrap these
 * with persistence + broadcast + store mutation.
 */
import type { Combatant } from "@/lib/types/combat";

export interface BatchRemoveResult {
  /** Combatants that survived the purge, in their original relative order. */
  survivors: Combatant[];
  /**
   * The new `current_turn_index` after removal, pointing at the next alive
   * survivor (or 0 if the whole list was wiped). Invariants:
   *  - If current was removed: advances to the first alive survivor starting
   *    from the "slot" that current used to occupy after the shift.
   *  - If current survived: returns the shifted index (pre-count removed).
   */
  nextTurnIndex: number;
  /** Was the current-turn combatant removed? */
  wasCurrentTurnRemoved: boolean;
  /** Number of removed combatants that were BEFORE current_turn_index. */
  removedBeforeCurrent: number;
}

/**
 * Compute the survivors + adjusted turn index after removing `removeIds`.
 *
 * Pure function: no side effects, no broadcasts, no persistence. Callers
 * handle those.
 */
export function computeBatchRemove(
  combatants: Combatant[],
  currentTurnIndex: number,
  removeIds: ReadonlySet<string> | string[],
): BatchRemoveResult {
  const removeSet = removeIds instanceof Set ? removeIds : new Set(removeIds);
  const currentId = combatants[currentTurnIndex]?.id ?? null;
  const wasCurrentTurnRemoved = currentId !== null && removeSet.has(currentId);
  const removedBeforeCurrent = combatants
    .slice(0, currentTurnIndex)
    .filter((c) => removeSet.has(c.id)).length;

  const survivors = combatants.filter((c) => !removeSet.has(c.id));

  if (survivors.length === 0) {
    return { survivors, nextTurnIndex: 0, wasCurrentTurnRemoved, removedBeforeCurrent };
  }

  let nextTurnIndex: number;
  if (wasCurrentTurnRemoved) {
    // The "slot" current occupied, after removing the K-before-current members,
    // is currentTurnIndex - removedBeforeCurrent. Clamp into survivors range,
    // then hunt forward (wrapping once) for the first alive combatant.
    const startIdx = Math.min(
      Math.max(0, currentTurnIndex - removedBeforeCurrent),
      survivors.length - 1,
    );
    let found = -1;
    for (let i = 0; i < survivors.length; i++) {
      const probe = (startIdx + i) % survivors.length;
      if (!survivors[probe].is_defeated) {
        found = probe;
        break;
      }
    }
    nextTurnIndex = found === -1 ? startIdx : found;
  } else {
    // Current survived — just shift back by K-before-current.
    nextTurnIndex = Math.max(0, currentTurnIndex - removedBeforeCurrent);
  }

  return { survivors, nextTurnIndex, wasCurrentTurnRemoved, removedBeforeCurrent };
}
