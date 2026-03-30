import { useCallback, useRef } from "react";
import type { UndoEntry, Combatant } from "@/lib/types/combat";
import { useGuestCombatStore } from "@/lib/stores/guest-combat-store";

const MAX_UNDO = 50;

/**
 * In-memory undo stack for guest combat.
 * NOT persisted to localStorage — resets on page reload (intentional).
 */
export function useGuestUndoStack() {
  const stackRef = useRef<UndoEntry[]>([]);

  const pushUndo = useCallback((entry: UndoEntry) => {
    stackRef.current = [...stackRef.current.slice(-(MAX_UNDO - 1)), entry];
  }, []);

  const undoLastAction = useCallback((): UndoEntry | null => {
    const stack = stackRef.current;
    if (stack.length === 0) return null;

    const entry = stack[stack.length - 1];
    stackRef.current = stack.slice(0, -1);

    const store = useGuestCombatStore.getState();

    switch (entry.type) {
      case "hp":
        useGuestCombatStore.setState({
          combatants: store.combatants.map((c) =>
            c.id === entry.combatantId
              ? { ...c, current_hp: entry.previousHp, temp_hp: entry.previousTempHp }
              : c
          ),
        });
        break;

      case "condition":
        useGuestCombatStore.setState({
          combatants: store.combatants.map((c) => {
            if (c.id !== entry.combatantId) return c;
            const conditions = entry.wasAdded
              ? c.conditions.filter((cond) => cond !== entry.condition)
              : [...c.conditions, entry.condition];
            return { ...c, conditions };
          }),
        });
        break;

      case "defeated":
        useGuestCombatStore.setState({
          combatants: store.combatants.map((c) =>
            c.id === entry.combatantId
              ? {
                  ...c,
                  is_defeated: entry.wasDefeated,
                  current_hp: entry.previousHp,
                  death_saves: entry.previousDeathSaves,
                }
              : c
          ),
        });
        break;

      case "turn":
        useGuestCombatStore.setState({
          combatants: entry.previousCombatants,
          currentTurnIndex: entry.previousTurnIndex,
          roundNumber: entry.previousRound,
        });
        break;

      case "hidden":
        useGuestCombatStore.setState({
          combatants: store.combatants.map((c) =>
            c.id === entry.combatantId
              ? { ...c, is_hidden: entry.wasHidden }
              : c
          ),
        });
        break;
    }

    return entry;
  }, []);

  const canUndo = useCallback(() => stackRef.current.length > 0, []);

  // Convenience methods to push undo entries before actions
  const pushHpUndo = useCallback(
    (combatant: Combatant, action: "damage" | "heal" | "temp") => {
      pushUndo({
        type: "hp",
        combatantId: combatant.id,
        previousHp: combatant.current_hp,
        previousTempHp: combatant.temp_hp,
        action,
      });
    },
    [pushUndo]
  );

  const pushConditionUndo = useCallback(
    (combatantId: string, condition: string, wasAdded: boolean) => {
      pushUndo({ type: "condition", combatantId, condition, wasAdded });
    },
    [pushUndo]
  );

  const pushDefeatedUndo = useCallback(
    (combatant: Combatant) => {
      pushUndo({
        type: "defeated",
        combatantId: combatant.id,
        wasDefeated: combatant.is_defeated,
        previousHp: combatant.current_hp,
        previousDeathSaves: combatant.death_saves
          ? { successes: combatant.death_saves.successes, failures: combatant.death_saves.failures }
          : undefined,
      });
    },
    [pushUndo]
  );

  const pushTurnUndo = useCallback(
    (combatants: Combatant[], turnIndex: number, round: number) => {
      pushUndo({
        type: "turn",
        previousTurnIndex: turnIndex,
        previousRound: round,
        previousCombatants: combatants.map((c) => ({ ...c })),
      });
    },
    [pushUndo]
  );

  const pushHiddenUndo = useCallback(
    (combatant: Combatant) => {
      pushUndo({
        type: "hidden",
        combatantId: combatant.id,
        wasHidden: combatant.is_hidden,
      });
    },
    [pushUndo]
  );

  return {
    undoLastAction,
    canUndo,
    pushHpUndo,
    pushConditionUndo,
    pushDefeatedUndo,
    pushTurnUndo,
    pushHiddenUndo,
  };
}
