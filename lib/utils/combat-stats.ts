import type { CombatLogEntry } from "@/lib/stores/combat-log-store";

export interface CombatantStats {
  name: string;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealing: number;
  knockouts: number;
  criticalHits: number;
  criticalFails: number;
  /** Total time (ms) spent on this combatant's turns. */
  totalTurnTime: number;
  /** Number of turns taken by this combatant. */
  turnCount: number;
}

/**
 * Aggregate combat log entries into per-combatant stats.
 * - Damage dealt: summed by actorName on "damage" entries
 * - Damage received: summed by targetName on "damage" entries
 * - Healing: summed by actorName on "heal" entries
 * - Knockouts: counted by targetName on "defeat" entries
 * - Critical hits: counted by actorName on entries with isNat20
 * - Critical fails: counted by actorName on entries with isNat1
 * - Turn time: injected from turnTimeAccumulated map (ID→ms), mapped via idToName
 * - Turn count: counted from "turn" log entries by actorName
 *
 * Returns array sorted by totalDamageDealt descending (MVP first).
 */
export function computeCombatStats(
  entries: CombatLogEntry[],
  turnTimeAccumulated?: Record<string, number>,
  idToName?: Record<string, string>,
): CombatantStats[] {
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
        totalTurnTime: 0,
        turnCount: 0,
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

    // Count turns per combatant
    if (entry.type === "turn" && entry.actorName) {
      getOrCreate(entry.actorName).turnCount += 1;
    }

    // Critical hits and fails — check on any entry type (attack, damage, save)
    if (entry.details?.isNat20 && entry.actorName) {
      getOrCreate(entry.actorName).criticalHits += 1;
    }
    if (entry.details?.isNat1 && entry.actorName) {
      getOrCreate(entry.actorName).criticalFails += 1;
    }
  }

  // Inject accumulated turn times (ID → ms) into stats (matched by name via idToName map)
  if (turnTimeAccumulated && idToName) {
    for (const [id, ms] of Object.entries(turnTimeAccumulated)) {
      const name = idToName[id];
      if (name && ms > 0) {
        getOrCreate(name).totalTurnTime += ms;
      }
    }
  }

  // Safety net: if a combatant has accumulated time but 0 "turn" log entries
  // (e.g. added mid-combat, or legacy data before first-turn logging), ensure count >= 1.
  for (const s of statsMap.values()) {
    if (s.totalTurnTime > 0 && s.turnCount === 0) s.turnCount = 1;
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
 * Format milliseconds into a human-readable duration string.
 * - < 60s  → "45s"
 * - < 1h   → "5m 32s"
 * - >= 1h  → "1h 12m"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Time-based awards: Speedster (fastest avg turn) and Slowpoke (slowest avg turn).
 * Only returns results if at least 2 combatants have >= 2 turns each.
 */
export function getTimeAwards(stats: CombatantStats[]): {
  speedster: CombatantStats | null;
  slowpoke: CombatantStats | null;
} {
  const eligible = stats.filter((s) => s.turnCount >= 2 && s.totalTurnTime > 0);
  if (eligible.length < 2) return { speedster: null, slowpoke: null };

  let speedster = eligible[0];
  let slowpoke = eligible[0];
  let minAvg = speedster.totalTurnTime / speedster.turnCount;
  let maxAvg = minAvg;

  for (let i = 1; i < eligible.length; i++) {
    const avg = eligible[i].totalTurnTime / eligible[i].turnCount;
    if (avg < minAvg) {
      minAvg = avg;
      speedster = eligible[i];
    }
    if (avg > maxAvg) {
      maxAvg = avg;
      slowpoke = eligible[i];
    }
  }

  // Don't show awards if speedster and slowpoke are the same
  if (speedster.name === slowpoke.name) return { speedster: null, slowpoke: null };

  return { speedster, slowpoke };
}

/**
 * Generate a shareable text summary of combat results.
 */
export function formatShareText(
  stats: CombatantStats[],
  encounterName: string,
  rounds: number,
  combatDuration?: number,
): string {
  const lines: string[] = [];
  lines.push("Pocket DM -- Combat Results");
  const durationStr = combatDuration ? ` | Duration: ${formatDuration(combatDuration)}` : "";
  lines.push(`Encounter: ${encounterName || "Unknown"} | Rounds: ${rounds}${durationStr}`);
  lines.push("");

  const top3 = stats.slice(0, 3);
  for (let i = 0; i < top3.length; i++) {
    const s = top3[i];
    const prefix = i === 0 ? "MVP" : `#${i + 1}`;
    const timeStr = s.totalTurnTime > 0 ? ` (${formatDuration(s.totalTurnTime)})` : "";
    lines.push(`${prefix}: ${s.name} -- ${s.totalDamageDealt} damage${timeStr}`);
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

  const { speedster, slowpoke } = getTimeAwards(stats);
  if (speedster) {
    const avg = formatDuration(speedster.totalTurnTime / speedster.turnCount);
    lines.push(`Speedster: ${speedster.name} (avg ${avg}/turn)`);
  }
  if (slowpoke) {
    const avg = formatDuration(slowpoke.totalTurnTime / slowpoke.turnCount);
    lines.push(`Slowpoke: ${slowpoke.name} (avg ${avg}/turn)`);
  }

  return lines.join("\n");
}
