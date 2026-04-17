import type { CombatLogEntry } from "@/lib/stores/combat-log-store";
import type { Combatant } from "@/lib/types/combat";
import type {
  CombatReport,
  CombatReportAward,
  CombatReportNarrative,
} from "@/lib/types/combat-report";

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

    // S5.7 bug fix: knockouts must be attributed to the KILLER (actorName),
    // not the victim (targetName). Self-defeats (actor === target, e.g. area
    // damage without clear actor or narrative suicide) are skipped.
    if (entry.type === "defeat" && entry.actorName && entry.targetName) {
      if (entry.actorName !== entry.targetName) {
        getOrCreate(entry.actorName).knockouts += 1;
      }
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
 * @deprecated Use formatRecapShareText() for the expanded version with awards + narratives.
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

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Extended Analytics (F1: new data aggregation)
// ---------------------------------------------------------------------------

/** Aggregate damage by damage type (e.g. "Fire": 45, "Slashing": 120). */
export function computeDamageByType(entries: CombatLogEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of entries) {
    if (e.type === "damage" && e.details?.damageAmount && e.details.damageType) {
      result[e.details.damageType] = (result[e.details.damageType] ?? 0) + e.details.damageAmount;
    }
  }
  return result;
}

/** Aggregate damage by attack source type (melee/ranged/spell). */
export function computeDamageBySource(entries: CombatLogEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of entries) {
    if (e.type === "damage" && e.details?.damageAmount && e.details.attackType) {
      result[e.details.attackType] = (result[e.details.attackType] ?? 0) + e.details.damageAmount;
    }
  }
  return result;
}

/** Count how many times each damage modifier was applied (resistant/immune/vulnerable). */
export function computeResistanceUsage(entries: CombatLogEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of entries) {
    const mod = e.details?.damageModifier;
    if (e.type === "damage" && mod && mod !== "normal") {
      result[mod] = (result[mod] ?? 0) + 1;
    }
  }
  return result;
}

/** Compute healing vs damage received per round to assess heal efficiency. */
export function computeHealEfficiency(entries: CombatLogEntry[]): {
  totalHealing: number;
  totalDamageReceived: number;
  ratio: number;
} {
  let totalHealing = 0;
  let totalDamageReceived = 0;
  for (const e of entries) {
    if (e.type === "heal" && e.details?.damageAmount) {
      totalHealing += e.details.damageAmount;
    }
    if (e.type === "damage" && e.details?.damageAmount) {
      totalDamageReceived += e.details.damageAmount;
    }
  }
  return {
    totalHealing,
    totalDamageReceived,
    ratio: totalDamageReceived > 0 ? totalHealing / totalDamageReceived : 0,
  };
}

/**
 * Compute per-round time from turnTimeSnapshots (diffs between consecutive snapshots).
 * Returns round → total ms spent in that round.
 */
export function computeTurnTimePerRound(
  snapshots: Record<number, Record<string, number>>,
): Record<number, number> {
  const rounds = Object.keys(snapshots).map(Number).sort((a, b) => a - b);
  const result: Record<number, number> = {};

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const currentTotal = Object.values(snapshots[round]).reduce((a, b) => a + b, 0);
    const prevTotal = i > 0
      ? Object.values(snapshots[rounds[i - 1]]).reduce((a, b) => a + b, 0)
      : 0;
    result[round] = currentTotal - prevTotal;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Combat Report Builder
// ---------------------------------------------------------------------------

/**
 * Detect epic narrative moments from combat log entries + combatant state.
 * Returns max 3 narratives, sorted by priority.
 */
export function detectNarratives(
  entries: CombatLogEntry[],
  combatants: Combatant[],
  t: (key: string, values?: Record<string, string | number>) => string,
): CombatReportNarrative[] {
  const narratives: CombatReportNarrative[] = [];

  // --- Clutch Save: death save with nat20 ---
  for (const e of entries) {
    if (e.type === "save" && e.details?.isNat20 && e.actorName) {
      narratives.push({
        type: "clutch_save",
        text: t("recap_narrative_clutch_save", { name: e.actorName }),
        round: e.round,
        actors: [e.actorName],
      });
    }
  }

  // --- Near Death: PC survived at <= 10% HP ---
  for (const c of combatants) {
    if (c.is_player && !c.is_defeated && c.max_hp > 0 && c.current_hp > 0) {
      const ratio = c.current_hp / c.max_hp;
      if (ratio <= 0.1) {
        narratives.push({
          type: "near_death",
          text: t("recap_narrative_near_death", { name: c.name, hp: c.current_hp }),
          round: 0, // can't pinpoint exact round from final state
          actors: [c.name],
        });
      }
    }
  }

  // --- One-shot: a single damage entry in the defeat round killed the target ---
  const defeatEntries = entries.filter((e) => e.type === "defeat" && e.targetName);
  for (const defeat of defeatEntries) {
    // Collect ALL damage entries to this target in the same round
    const roundDamageHits = entries.filter(
      (e) => e.type === "damage" && e.targetName === defeat.targetName && e.round === defeat.round && (e.details?.damageAmount ?? 0) > 0,
    );
    // Only count as one-shot if exactly one damage entry killed it
    if (roundDamageHits.length === 1) {
      const hit = roundDamageHits[0];
      const dmg = hit.details?.damageAmount ?? 0;
      if (hit.actorName) {
        const dmgType = hit.details?.damageType;
        narratives.push({
          type: "one_shot",
          text: dmgType
            ? t("recap_narrative_one_shot_typed", { actor: hit.actorName, target: defeat.targetName!, damage: dmg, type: dmgType })
            : t("recap_narrative_one_shot", { actor: hit.actorName, target: defeat.targetName!, damage: dmg }),
          round: defeat.round,
          actors: [hit.actorName, defeat.targetName!],
        });
      }
    }
  }

  // --- Epic Comeback: highest PC damage round came after a PC fell ---
  const pcDefeats = entries.filter(
    (e) => e.type === "defeat" && e.targetName && combatants.some((c) => c.name === e.targetName && c.is_player),
  );
  if (pcDefeats.length > 0) {
    const firstPcDownRound = Math.min(...pcDefeats.map((e) => e.round));
    // Compute PC damage per round AFTER the first PC fell
    const pcNames = new Set(combatants.filter((c) => c.is_player).map((c) => c.name));
    const dmgPerRound = new Map<number, number>();
    for (const e of entries) {
      if (e.type === "damage" && e.actorName && pcNames.has(e.actorName) && e.round > firstPcDownRound) {
        dmgPerRound.set(e.round, (dmgPerRound.get(e.round) ?? 0) + (e.details?.damageAmount ?? 0));
      }
    }
    if (dmgPerRound.size > 0) {
      let bestRound = 0;
      let bestDmg = 0;
      for (const [round, dmg] of dmgPerRound) {
        if (dmg > bestDmg) { bestDmg = dmg; bestRound = round; }
      }
      if (bestDmg > 0) {
        const fallenPc = pcDefeats.find((e) => e.round === firstPcDownRound)?.targetName ?? "";
        narratives.push({
          type: "epic_comeback",
          text: t("recap_narrative_epic_comeback", { name: fallenPc, round: bestRound, damage: bestDmg }),
          round: bestRound,
          actors: [fallenPc],
        });
      }
    }
  }

  // Priority: clutch_save > near_death > one_shot > epic_comeback
  const priorityOrder: Record<string, number> = { clutch_save: 0, near_death: 1, one_shot: 2, epic_comeback: 3 };
  narratives.sort((a, b) => (priorityOrder[a.type] ?? 9) - (priorityOrder[b.type] ?? 9));

  return narratives.slice(0, 3);
}

/**
 * S5.7 — First Blood: the first defeat of the combat, attributed to the killer.
 * Returns null if nobody has killed anyone yet.
 * Considers only defeats where actor !== target (skips self-defeats).
 *
 * Entries are expected in chronological insertion order; in case of same-round
 * ties, insertion order decides the winner.
 */
export function findFirstBlood(entries: CombatLogEntry[]): {
  actorName: string;
  targetName: string;
  round: number;
} | null {
  const firstDefeat = entries.find(
    (e) =>
      e.type === "defeat" &&
      !!e.actorName &&
      !!e.targetName &&
      e.actorName !== e.targetName,
  );
  if (!firstDefeat) return null;
  return {
    actorName: firstDefeat.actorName!,
    targetName: firstDefeat.targetName!,
    round: firstDefeat.round,
  };
}

/**
 * Build awards list from computed stats.
 *
 * S5.7: accepts `entries` to compute First Blood (temporal, not count-based).
 * Pass an empty array to skip the First Blood award (e.g. guest mode without
 * log entries — rare, most guest flows have log entries).
 */
export function buildAwards(
  stats: CombatantStats[],
  t: (key: string, values?: Record<string, string | number>) => string,
  entries: CombatLogEntry[] = [],
): CombatReportAward[] {
  const awards: CombatReportAward[] = [];

  // MVP — most damage dealt
  const mvp = stats.length > 0 && stats[0].totalDamageDealt > 0 ? stats[0] : null;
  if (mvp) {
    awards.push({
      type: "mvp",
      combatantName: mvp.name,
      value: mvp.totalDamageDealt,
      displayValue: t("recap_award_value_damage", { value: mvp.totalDamageDealt }),
    });
  }

  // First Blood — first kill of the combat (S5.7 replaces Assassin)
  const firstBlood = findFirstBlood(entries);
  if (firstBlood) {
    awards.push({
      type: "first_blood",
      combatantName: firstBlood.actorName,
      value: firstBlood.round,
      displayValue: t("recap_award_value_first_blood", {
        target: firstBlood.targetName,
        round: firstBlood.round,
      }),
    });
  }

  // Tank — most damage received
  const tank = getTopForStat(stats, "totalDamageReceived");
  if (tank) {
    awards.push({
      type: "tank",
      combatantName: tank.name,
      value: tank.totalDamageReceived,
      displayValue: t("recap_award_value_received", { value: tank.totalDamageReceived }),
    });
  }

  // Healer — most healing
  const healer = getTopForStat(stats, "totalHealing");
  if (healer) {
    awards.push({
      type: "healer",
      combatantName: healer.name,
      value: healer.totalHealing,
      displayValue: t("recap_award_value_healed", { value: healer.totalHealing }),
    });
  }

  // Crit King — most critical hits
  const critKing = getTopForStat(stats, "criticalHits");
  if (critKing) {
    awards.push({
      type: "crit_king",
      combatantName: critKing.name,
      value: critKing.criticalHits,
      displayValue: t("recap_award_value_crits", { value: critKing.criticalHits }),
    });
  }

  // Unlucky — most critical fails
  const unlucky = getTopForStat(stats, "criticalFails");
  if (unlucky) {
    awards.push({
      type: "unlucky",
      combatantName: unlucky.name,
      value: unlucky.criticalFails,
      displayValue: t("recap_award_value_fumbles", { value: unlucky.criticalFails }),
    });
  }

  // Speedster & Slowpoke
  const { speedster, slowpoke } = getTimeAwards(stats);
  if (speedster) {
    const avg = speedster.totalTurnTime / speedster.turnCount;
    awards.push({
      type: "speedster",
      combatantName: speedster.name,
      value: avg,
      displayValue: t("recap_award_value_avg_turn", { time: formatDuration(avg) }),
    });
  }
  if (slowpoke) {
    const avg = slowpoke.totalTurnTime / slowpoke.turnCount;
    awards.push({
      type: "slowpoke",
      combatantName: slowpoke.name,
      value: avg,
      displayValue: t("recap_award_value_avg_turn", { time: formatDuration(avg) }),
    });
  }

  return awards;
}

/** Classify combatants into PCs vs monsters and format the matchup string. */
function computeMatchup(combatants: Combatant[]) {
  // Primary check: is_player flag or explicit "player" role tag.
  const isPC = (c: Combatant) => c.is_player || c.combatant_role === "player";
  let pcs = combatants.filter(isPC);
  let monsters = combatants.filter((c) => !isPC(c) && !c.is_lair_action);

  // Fallback: if no PCs detected (e.g. stale state), split by monster_id presence.
  if (pcs.length === 0 && combatants.length > 0) {
    pcs = combatants.filter((c) => !c.monster_id && !c.is_lair_action);
    monsters = combatants.filter((c) => !!c.monster_id && !c.is_lair_action);
  }

  const matchup = pcs.length > 0
    ? `${pcs.length} vs ${monsters.length}`
    : `${combatants.filter((c) => !c.is_lair_action).length} combatants`;
  return { pcs, monsters, matchup };
}

/**
 * Build a complete CombatReport from raw combat data.
 * This is the single entry point that feeds the CombatRecap UI, share text, and persistence.
 */
export function buildCombatReport(opts: {
  entries: CombatLogEntry[];
  combatants: Combatant[];
  turnTimeAccumulated: Record<string, number>;
  turnTimeSnapshots?: Record<number, Record<string, number>>;
  idToName: Record<string, string>;
  encounterName: string;
  combatDuration: number;
  roundNumber: number;
  t: (key: string, values?: Record<string, string | number>) => string;
}): CombatReport {
  const { entries, combatants, turnTimeAccumulated, turnTimeSnapshots, idToName, encounterName, combatDuration, roundNumber, t } = opts;

  // Rankings (reuses existing logic)
  const rankings = computeCombatStats(entries, turnTimeAccumulated, idToName);

  // Defensive: ensure rankings use real names (not display_name) by cross-referencing combatants.
  // Only remap if the ranking name is NOT already a valid combatant real name (avoids false positives).
  const realNames = new Set(combatants.map((c) => c.name));
  const displayToReal = new Map<string, string>();
  for (const c of combatants) {
    if (c.display_name && c.display_name !== c.name && !realNames.has(c.display_name)) {
      displayToReal.set(c.display_name, c.name);
    }
  }
  if (displayToReal.size > 0) {
    for (const r of rankings) {
      if (!realNames.has(r.name)) {
        const real = displayToReal.get(r.name);
        if (real) r.name = real;
      }
    }
  }

  // Awards
  const awards = buildAwards(rankings, t, entries);

  // Narratives
  const narratives = detectNarratives(entries, combatants, t);

  const { pcs, monsters, matchup } = computeMatchup(combatants);

  const totalDamage = rankings.reduce((sum, s) => sum + s.totalDamageDealt, 0);
  const totalCrits = rankings.reduce((sum, s) => sum + s.criticalHits, 0);
  const totalFumbles = rankings.reduce((sum, s) => sum + s.criticalFails, 0);
  const totalTurnTime = rankings.reduce((sum, s) => sum + s.totalTurnTime, 0);
  const totalTurnCount = rankings.reduce((sum, s) => sum + s.turnCount, 0);

  // Extended analytics (F1)
  const damageByType = computeDamageByType(entries);
  const damageBySource = computeDamageBySource(entries);
  const resistanceUsage = computeResistanceUsage(entries);
  const healEff = computeHealEfficiency(entries);
  const timePerRound = turnTimeSnapshots && Object.keys(turnTimeSnapshots).length > 0
    ? computeTurnTimePerRound(turnTimeSnapshots)
    : undefined;

  const summary = {
    totalDuration: combatDuration,
    totalRounds: roundNumber,
    totalDamage,
    pcsDown: pcs.filter((c) => c.is_defeated).length,
    monstersDefeated: monsters.filter((c) => c.is_defeated).length,
    totalCrits,
    totalFumbles,
    avgTurnTime: totalTurnCount > 0 ? totalTurnTime / totalTurnCount : 0,
    matchup,
    damageByType: Object.keys(damageByType).length > 0 ? damageByType : undefined,
    damageBySource: Object.keys(damageBySource).length > 0 ? damageBySource : undefined,
    resistanceUsage: Object.keys(resistanceUsage).length > 0 ? resistanceUsage : undefined,
    healEfficiency: healEff.ratio > 0 ? healEff.ratio : undefined,
    timePerRound,
  };

  return {
    awards,
    narratives,
    summary,
    rankings,
    encounterName,
    timestamp: Date.now(),
  };
}

/**
 * Build a CombatReport from pre-computed CombatantStats (guest mode live path).
 *
 * S5.7 polish: `entries` is optional for backward compatibility but SHOULD be
 * threaded from the guest combat log store so First Blood is emitted. When
 * omitted, the report is still valid but will skip the First Blood award.
 *
 * Awards and summary are computed from stats; narratives require combatant
 * state for near_death detection (full narrative set requires log entries).
 */
export function buildCombatReportFromStats(opts: {
  stats: CombatantStats[];
  combatants: Combatant[];
  encounterName: string;
  combatDuration: number;
  roundNumber: number;
  turnTimeSnapshots?: Record<number, Record<string, number>>;
  entries?: CombatLogEntry[];
  t: (key: string, values?: Record<string, string | number>) => string;
}): CombatReport {
  const { stats, combatants, encounterName, combatDuration, roundNumber, turnTimeSnapshots, entries, t } = opts;

  // Defensive: ensure stats use real names (not display_name) by cross-referencing combatants.
  // Only remap if the stat name is NOT already a valid combatant real name (avoids false positives).
  const realNames = new Set(combatants.map((c) => c.name));
  const displayToReal = new Map<string, string>();
  for (const c of combatants) {
    if (c.display_name && c.display_name !== c.name && !realNames.has(c.display_name)) {
      displayToReal.set(c.display_name, c.name);
    }
  }
  if (displayToReal.size > 0) {
    for (const s of stats) {
      if (!realNames.has(s.name)) {
        const real = displayToReal.get(s.name);
        if (real) s.name = real;
      }
    }
  }

  const awards = buildAwards(stats, t, entries ?? []);

  // Guest mode: limited narratives (no log entries for clutch_save/one_shot)
  // Only detect near_death from combatant final state
  const narratives: CombatReportNarrative[] = [];
  for (const c of combatants) {
    if (c.is_player && !c.is_defeated && c.max_hp > 0 && c.current_hp > 0 && c.current_hp / c.max_hp <= 0.1) {
      narratives.push({
        type: "near_death",
        text: t("recap_narrative_near_death", { name: c.name, hp: c.current_hp }),
        round: 0,
        actors: [c.name],
      });
    }
  }

  const { pcs, monsters, matchup } = computeMatchup(combatants);
  const totalDamage = stats.reduce((sum, s) => sum + s.totalDamageDealt, 0);
  const totalTurnTime = stats.reduce((sum, s) => sum + s.totalTurnTime, 0);
  const totalTurnCount = stats.reduce((sum, s) => sum + s.turnCount, 0);

  // Per-round time analytics (F1 parity)
  const timePerRound = turnTimeSnapshots && Object.keys(turnTimeSnapshots).length > 0
    ? computeTurnTimePerRound(turnTimeSnapshots)
    : undefined;

  return {
    awards,
    narratives: narratives.slice(0, 3),
    summary: {
      totalDuration: combatDuration,
      totalRounds: roundNumber,
      totalDamage,
      pcsDown: pcs.filter((c) => c.is_defeated).length,
      monstersDefeated: monsters.filter((c) => c.is_defeated).length,
      totalCrits: stats.reduce((sum, s) => sum + s.criticalHits, 0),
      totalFumbles: stats.reduce((sum, s) => sum + s.criticalFails, 0),
      avgTurnTime: totalTurnCount > 0 ? totalTurnTime / totalTurnCount : 0,
      matchup,
      timePerRound,
    },
    rankings: stats,
    encounterName,
    timestamp: Date.now(),
  };
}

/**
 * Generate an expanded shareable text from a CombatReport (Spotify Wrapped style with emojis).
 */
export function formatRecapShareText(report: CombatReport): string {
  const { awards, narratives, summary, encounterName } = report;
  const lines: string[] = [];

  lines.push("\u2694\ufe0f Pocket DM \u2014 Combat Recap");
  lines.push("\u2501".repeat(28));
  lines.push(
    `\ud83d\udde1\ufe0f ${summary.matchup} | \u23f1\ufe0f ${summary.totalRounds} rounds | \ud83d\udd50 ${formatDuration(summary.totalDuration)}`,
  );
  if (encounterName) {
    lines.push(`\ud83d\udcdc ${encounterName}`);
  }
  lines.push("");

  // Awards
  // S5.7: "assassin" is kept as a legacy alias for backward compatibility with
  // recaps persisted under encounters.recap_snapshot (migration 136).
  // New recaps emit `first_blood`; legacy rendering falls back to this alias.
  const awardEmojis: Record<string, string> = {
    mvp: "\ud83c\udfc6",
    first_blood: "\ud83d\udc80",
    assassin: "\ud83d\udc80", // legacy alias -> renders as First Blood
    tank: "\ud83d\udee1\ufe0f",
    healer: "\ud83d\udc9a",
    crit_king: "\ud83c\udfaf",
    unlucky: "\ud83d\ude2c",
    speedster: "\u26a1",
    slowpoke: "\ud83d\udc22",
  };
  const awardLabels: Record<string, string> = {
    mvp: "MVP",
    first_blood: "First Blood",
    assassin: "First Blood", // legacy alias
    tank: "Tank",
    healer: "Healer",
    crit_king: "Crit King",
    unlucky: "Unlucky",
    speedster: "Speedster",
    slowpoke: "Slowpoke",
  };

  for (const award of awards) {
    const emoji = awardEmojis[award.type] ?? "\u2b50";
    const label = awardLabels[award.type] ?? award.type;
    lines.push(`${emoji} ${label}: ${award.combatantName} \u2014 ${award.displayValue}`);
  }

  // Narratives
  if (narratives.length > 0) {
    lines.push("");
    lines.push("\ud83d\udcd6 Epic moments:");
    for (const n of narratives) {
      lines.push(`\u2022 ${n.text}`);
    }
  }

  // Footer stats
  lines.push("");
  const footerParts: string[] = [];
  if (summary.pcsDown > 0) footerParts.push(`\ud83d\udc94 ${summary.pcsDown} PCs down`);
  if (summary.monstersDefeated > 0) footerParts.push(`\ud83d\udc80 ${summary.monstersDefeated} monsters slain`);
  if (footerParts.length > 0) lines.push(footerParts.join(" | "));
  if (summary.totalCrits > 0 || summary.totalFumbles > 0) {
    lines.push(`\ud83c\udfb2 ${summary.totalCrits} crits | ${summary.totalFumbles} fumbles`);
  }
  lines.push("\u2501".repeat(28));
  lines.push("\ud83d\udd17 pocketdm.com.br/try");

  return lines.join("\n");
}
