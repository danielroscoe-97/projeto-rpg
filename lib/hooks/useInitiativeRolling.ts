"use client";

import { useCallback, useRef, useEffect } from "react";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { loadMonsters } from "@/lib/srd/srd-loader";
import { rollInitiativeForCombatant, getDexScore, dispatchInitiativeRoll } from "@/lib/utils/initiative";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";

interface InitiativeStore {
  getState: () => {
    combatants: Combatant[];
    batchSetInitiatives: (entries: Array<{ id: string; value: number; breakdown?: { roll: number; modifier: number } | null }>) => void;
    setInitiative: (id: string, value: number | null, breakdown?: { roll: number; modifier: number } | null) => void;
  };
}

/**
 * Shared hook for initiative rolling — used by both authenticated and guest combat setup.
 * Loads the SRD monster index for DEX lookup and provides roll handlers.
 */
export function useInitiativeRolling(
  store: InitiativeStore,
  rulesetVersion: RulesetVersion
) {
  const monsterIndexRef = useRef<Map<string, SrdMonster>>(new Map());

  // Load SRD monsters for DEX lookup when rolling initiative
  useEffect(() => {
    loadMonsters(rulesetVersion).then((monsters) => {
      const idx = new Map<string, SrdMonster>();
      for (const m of monsters) idx.set(m.id, m);
      monsterIndexRef.current = idx;
    }).catch(() => { /* SRD load failure is non-blocking */ });
  }, [rulesetVersion]);

  const handleRollOne = useCallback(
    (id: string) => {
      const { combatants, setInitiative, batchSetInitiatives } = store.getState();
      const c = combatants.find((x) => x.id === id);
      if (!c) return;
      const dex = getDexScore(c, monsterIndexRef.current);
      const result = rollInitiativeForCombatant(id, dex);
      dispatchInitiativeRoll(result, c.name);
      const breakdown = { roll: result.rolls[0], modifier: result.modifier };

      // If this combatant belongs to a group, apply the same roll to all members
      if (c.monster_group_id) {
        const groupMembers = combatants.filter((x) => x.monster_group_id === c.monster_group_id);
        batchSetInitiatives(groupMembers.map((m) => ({ id: m.id, value: result.total, breakdown })));
      } else {
        setInitiative(id, result.total, breakdown);
      }
    },
    [store]
  );

  /** Roll initiative for a list of combatants. Groups share one roll (D&D 5e PHB p.189). */
  const rollForCombatants = useCallback((combatants: Combatant[]) => {
    const entries: Array<{ id: string; value: number; breakdown?: { roll: number; modifier: number } | null }> = [];
    const groupRolls = new Map<string, { total: number; breakdown: { roll: number; modifier: number } }>();

    for (const c of combatants) {
      if (c.initiative !== null) continue;

      // For grouped monsters, roll once per group and share the result
      if (c.monster_group_id) {
        if (!groupRolls.has(c.monster_group_id)) {
          const dex = getDexScore(c, monsterIndexRef.current);
          const result = rollInitiativeForCombatant(c.id, dex);
          dispatchInitiativeRoll(result, `${c.name} (grupo)`);
          groupRolls.set(c.monster_group_id, { total: result.total, breakdown: { roll: result.rolls[0], modifier: result.modifier } });
        }
        const gr = groupRolls.get(c.monster_group_id)!;
        entries.push({ id: c.id, value: gr.total, breakdown: gr.breakdown });
      } else {
        const dex = getDexScore(c, monsterIndexRef.current);
        const result = rollInitiativeForCombatant(c.id, dex);
        dispatchInitiativeRoll(result, c.name);
        entries.push({ id: c.id, value: result.total, breakdown: { roll: result.rolls[0], modifier: result.modifier } });
      }
    }

    if (entries.length > 0) store.getState().batchSetInitiatives(entries);
  }, [store]);

  const handleRollAll = useCallback(() => {
    rollForCombatants(store.getState().combatants);
  }, [store, rollForCombatants]);

  const handleRollNpcs = useCallback(() => {
    rollForCombatants(store.getState().combatants.filter((c) => !c.is_player));
  }, [store, rollForCombatants]);

  return { handleRollOne, handleRollAll, handleRollNpcs };
}
