import type { CombatantStats } from "@/lib/utils/combat-stats";

// --- Award Types ---

export type AwardType =
  | "mvp"
  | "first_blood"
  // S5.7: "assassin" retained as a legacy alias for backward compatibility
  // with recaps persisted under `encounters.recap_snapshot` (migration 136).
  // Render layer maps it to the "First Blood" label/icon.
  | "assassin"
  | "tank"
  | "healer"
  | "crit_king"
  | "unlucky"
  | "speedster"
  | "slowpoke";

export interface CombatReportAward {
  type: AwardType;
  combatantName: string;
  /** Raw numeric value for the stat */
  value: number;
  /** Formatted display value (e.g. "67 dmg", "avg 23s/turn") */
  displayValue: string;
}

// --- Narrative Types ---

export type NarrativeType =
  | "clutch_save"
  | "near_death"
  | "one_shot"
  | "epic_comeback";

export interface CombatReportNarrative {
  type: NarrativeType;
  /** Pre-built narrative text (already translated) */
  text: string;
  /** Round where this happened */
  round: number;
  /** Names involved */
  actors: string[];
}

// --- Summary ---

export interface CombatReportSummary {
  totalDuration: number;
  totalRounds: number;
  totalDamage: number;
  pcsDown: number;
  monstersDefeated: number;
  totalCrits: number;
  totalFumbles: number;
  avgTurnTime: number;
  /** "4 vs 3" format */
  matchup: string;
  /** Damage breakdown by type (e.g. { Fire: 45, Slashing: 120 }). Omitted if empty. */
  damageByType?: Record<string, number>;
  /** Damage breakdown by source (melee/ranged/spell). Omitted if empty. */
  damageBySource?: Record<string, number>;
  /** Count of resistance/immunity/vulnerability applications. */
  resistanceUsage?: Record<string, number>;
  /** Heal efficiency ratio (totalHealing / totalDamageReceived). */
  healEfficiency?: number;
  /** Time per round in ms (round number → ms). Omitted if no snapshots. */
  timePerRound?: Record<number, number>;
}

// --- Full Report ---

export interface CombatReport {
  awards: CombatReportAward[];
  narratives: CombatReportNarrative[];
  summary: CombatReportSummary;
  rankings: CombatantStats[];
  encounterName: string;
  timestamp: number;
}
