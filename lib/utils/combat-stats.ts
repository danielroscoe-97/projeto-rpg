import type { CombatLogEntry } from "@/lib/stores/combat-log-store";

export interface CombatantStats {
  name: string;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealing: number;
  knockouts: number;
  criticalHits: number;
  criticalFails: number;
}

/**
 * Aggregate combat log entries into per-combatant stats.
 * - Damage dealt: summed by actorName on "damage" entries
 * - Damage received: summed by targetName on "damage" entries
 * - Healing: summed by actorName on "heal" entries
 * - Knockouts: counted by targetName on "defeat" entries
 * - Critical hits: counted by actorName on entries with isNat20
 * - Critical fails: counted by actorName on entries with isNat1
 *
 * Returns array sorted by totalDamageDealt descending (MVP first).
 */
export function computeCombatStats(entries: CombatLogEntry[]): CombatantStats[] {
  const statsMap = new Map<string, CombatantStats>();

  function getOrCreate(name: string): CombatantStats {
    let stats = statsMap.get(name);
    if (!stats) {
      stats = {
        name,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        totalHealing: 0,
        knockouts: 0,
        criticalHits: 0,
        criticalFails: 0,
      };
      statsMap.set(name, stats);
    }
    return stats;
  }

  for (const entry of entries) {
    const amount = entry.details?.damageAmount ?? 0;

    if (entry.type === "damage" && amount > 0) {
      // Damage dealt by actor
      if (entry.actorName) {
        getOrCreate(entry.actorName).totalDamageDealt += amount;
      }
      // Damage received by target
      if (entry.targetName) {
        getOrCreate(entry.targetName).totalDamageReceived += amount;
      }
    }

    if (entry.type === "heal" && amount > 0) {
      if (entry.actorName) {
        getOrCreate(entry.actorName).totalHealing += amount;
      }
    }

    if (entry.type === "defeat" && entry.targetName) {
      getOrCreate(entry.targetName).knockouts += 1;
    }

    // Critical hits and fails — check on any entry type (attack, damage, save)
    if (entry.details?.isNat20 && entry.actorName) {
      getOrCreate(entry.actorName).criticalHits += 1;
    }
    if (entry.details?.isNat1 && entry.actorName) {
      getOrCreate(entry.actorName).criticalFails += 1;
    }
  }

  // Sort by totalDamageDealt descending (MVP first)
  return Array.from(statsMap.values()).sort(
    (a, b) => b.totalDamageDealt - a.totalDamageDealt
  );
}

/**
 * Get the maximum round number from combat log entries.
 */
export function getMaxRound(entries: CombatLogEntry[]): number {
  let max = 0;
  for (const entry of entries) {
    if (entry.round > max) max = entry.round;
  }
  return max;
}

/**
 * Find the combatant with the highest value for a given stat.
 * Returns null if no combatant has a positive value.
 */
export function getTopForStat(
  stats: CombatantStats[],
  key: keyof Omit<CombatantStats, "name">
): CombatantStats | null {
  let top: CombatantStats | null = null;
  for (const s of stats) {
    if (s[key] > 0 && (!top || s[key] > top[key])) {
      top = s;
    }
  }
  return top;
}

/**
 * Generate a shareable text summary of combat results.
 */
export function formatShareText(
  stats: CombatantStats[],
  encounterName: string,
  rounds: number
): string {
  const lines: string[] = [];
  lines.push("Pocket DM -- Combat Results");
  lines.push(`Encounter: ${encounterName || "Unknown"} | Rounds: ${rounds}`);
  lines.push("");

  const top3 = stats.slice(0, 3);
  for (let i = 0; i < top3.length; i++) {
    const s = top3[i];
    const prefix = i === 0 ? "MVP" : `#${i + 1}`;
    lines.push(`${prefix}: ${s.name} -- ${s.totalDamageDealt} damage`);
  }

  const tank = getTopForStat(stats, "totalDamageReceived");
  const healer = getTopForStat(stats, "totalHealing");

  if (tank) {
    lines.push("");
    lines.push(`Tank: ${tank.name} (${tank.totalDamageReceived} received)`);
  }
  if (healer) {
    lines.push(`Healer: ${healer.name} (${healer.totalHealing} healed)`);
  }

  return lines.join("\n");
}
