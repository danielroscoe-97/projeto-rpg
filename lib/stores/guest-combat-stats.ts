import { create } from "zustand";
import type { CombatantStats } from "@/lib/utils/combat-stats";

/**
 * Lightweight combat stats tracker for guest (/try) mode.
 * Tracks damage dealt/received and healing per combatant during combat.
 * Stats are attributed to the active-turn combatant as the "actor".
 */
interface GuestCombatStatsState {
  damageDealt: Record<string, number>;
  damageReceived: Record<string, number>;
  healingDone: Record<string, number>;
  kills: Record<string, number>;
}

interface GuestCombatStatsActions {
  trackDamage: (actorName: string, targetName: string, amount: number) => void;
  trackHealing: (actorName: string, amount: number) => void;
  trackKill: (actorName: string) => void;
  reset: () => void;
  /** Build CombatantStats[] compatible with the existing CombatLeaderboard. */
  getStats: (turnTimeByName?: Record<string, number>, turnCountByName?: Record<string, number>) => CombatantStats[];
}

type GuestCombatStatsStore = GuestCombatStatsState & GuestCombatStatsActions;

const emptyState: GuestCombatStatsState = {
  damageDealt: {},
  damageReceived: {},
  healingDone: {},
  kills: {},
};

export const useGuestCombatStats = create<GuestCombatStatsStore>((set, get) => ({
  ...emptyState,

  trackDamage: (actorName, targetName, amount) =>
    set((s) => ({
      damageDealt: { ...s.damageDealt, [actorName]: (s.damageDealt[actorName] ?? 0) + amount },
      damageReceived: { ...s.damageReceived, [targetName]: (s.damageReceived[targetName] ?? 0) + amount },
    })),

  trackHealing: (actorName, amount) =>
    set((s) => ({
      healingDone: { ...s.healingDone, [actorName]: (s.healingDone[actorName] ?? 0) + amount },
    })),

  trackKill: (actorName) =>
    set((s) => ({
      kills: { ...s.kills, [actorName]: (s.kills[actorName] ?? 0) + 1 },
    })),

  reset: () => set(emptyState),

  /**
   * Build CombatantStats[] compatible with the existing CombatLeaderboard.
   * Optionally accepts turn time data to inject into stats.
   */
  getStats: (turnTimeByName?: Record<string, number>, turnCountByName?: Record<string, number>) => {
    const { damageDealt, damageReceived, healingDone, kills } = get();
    const names = new Set([
      ...Object.keys(damageDealt),
      ...Object.keys(damageReceived),
      ...Object.keys(healingDone),
      ...Object.keys(kills),
      ...(turnTimeByName ? Object.keys(turnTimeByName) : []),
    ]);

    const stats: CombatantStats[] = Array.from(names).map((name) => ({
      name,
      totalDamageDealt: damageDealt[name] ?? 0,
      totalDamageReceived: damageReceived[name] ?? 0,
      totalHealing: healingDone[name] ?? 0,
      knockouts: kills[name] ?? 0,
      criticalHits: 0,
      criticalFails: 0,
      totalTurnTime: turnTimeByName?.[name] ?? 0,
      turnCount: turnCountByName?.[name] ?? 0,
    }));

    return stats.sort((a, b) => b.totalDamageDealt - a.totalDamageDealt);
  },
}));
