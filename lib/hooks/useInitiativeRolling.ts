"use client";

import { useCallback, useRef, useEffect } from "react";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { loadMonsters } from "@/lib/srd/srd-loader";
import { rollInitiativeForCombatant, getDexScore } from "@/lib/utils/initiative";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";

interface InitiativeStore {
  getState: () => {
    combatants: Combatant[];
    batchSetInitiatives: (entries: Array<{ id: string; value: number }>) => void;
    setInitiative: (id: string, value: number | null) => void;
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
      const c = store.getState().combatants.find((x) => x.id === id);
      if (!c) return;
      const dex = getDexScore(c, monsterIndexRef.current);
      const result = rollInitiativeForCombatant(id, dex);
      store.getState().setInitiative(id, result.total);
    },
    [store]
  );

  const handleRollAll = useCallback(() => {
    const state = store.getState();
    const entries = state.combatants
      .filter((c) => c.initiative === null)
      .map((c) => {
        const dex = getDexScore(c, monsterIndexRef.current);
        const result = rollInitiativeForCombatant(c.id, dex);
        return { id: c.id, value: result.total };
      });
    if (entries.length > 0) state.batchSetInitiatives(entries);
  }, [store]);

  const handleRollNpcs = useCallback(() => {
    const state = store.getState();
    const entries = state.combatants
      .filter((c) => c.initiative === null && !c.is_player)
      .map((c) => {
        const dex = getDexScore(c, monsterIndexRef.current);
        const result = rollInitiativeForCombatant(c.id, dex);
        return { id: c.id, value: result.total };
      });
    if (entries.length > 0) state.batchSetInitiatives(entries);
  }, [store]);

  return { handleRollOne, handleRollAll, handleRollNpcs };
}
