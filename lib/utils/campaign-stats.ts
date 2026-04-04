import type { CombatReport, CombatReportSummary } from "@/lib/types/combat-report";

export interface AggregatedCampaignStats {
  totalEncounters: number;
  totalRounds: number;
  totalDuration: number;
  totalDamage: number;
  pcsDown: number;
  monstersDefeated: number;
  /** Most frequent MVP name and count */
  mvpName: string | null;
  mvpCount: number;
  /** Highest damage in a single encounter */
  maxDamageEncounter: number;
  /** Longest encounter by rounds */
  maxRoundsEncounter: number;
}

/**
 * Aggregate stats from an array of combat_reports rows.
 * Each row has report_data as the serialized CombatReport.
 */
export function aggregateCampaignStats(
  reports: Array<{ report_data: unknown }>,
): AggregatedCampaignStats {
  const empty: AggregatedCampaignStats = {
    totalEncounters: 0,
    totalRounds: 0,
    totalDuration: 0,
    totalDamage: 0,
    pcsDown: 0,
    monstersDefeated: 0,
    mvpName: null,
    mvpCount: 0,
    maxDamageEncounter: 0,
    maxRoundsEncounter: 0,
  };

  if (reports.length === 0) return empty;

  const mvpCounts = new Map<string, number>();
  let validCount = 0;
  let totalRounds = 0;
  let totalDuration = 0;
  let totalDamage = 0;
  let pcsDown = 0;
  let monstersDefeated = 0;
  let maxDamage = 0;
  let maxRounds = 0;

  for (const row of reports) {
    const report = row.report_data as CombatReport;
    if (!report?.summary) continue;
    validCount++;

    const s = report.summary as CombatReportSummary;
    totalRounds += s.totalRounds ?? 0;
    totalDuration += s.totalDuration ?? 0;
    totalDamage += s.totalDamage ?? 0;
    pcsDown += s.pcsDown ?? 0;
    monstersDefeated += s.monstersDefeated ?? 0;

    if ((s.totalDamage ?? 0) > maxDamage) maxDamage = s.totalDamage ?? 0;
    if ((s.totalRounds ?? 0) > maxRounds) maxRounds = s.totalRounds ?? 0;

    // Count MVP appearances
    const mvpAward = report.awards?.find((a) => a.type === "mvp");
    if (mvpAward) {
      const count = (mvpCounts.get(mvpAward.combatantName) ?? 0) + 1;
      mvpCounts.set(mvpAward.combatantName, count);
    }
  }

  // Find top MVP
  let mvpName: string | null = null;
  let mvpCount = 0;
  for (const [name, count] of mvpCounts) {
    if (count > mvpCount) {
      mvpName = name;
      mvpCount = count;
    }
  }

  return {
    totalEncounters: validCount,
    totalRounds,
    totalDuration,
    totalDamage,
    pcsDown,
    monstersDefeated,
    mvpName,
    mvpCount,
    maxDamageEncounter: maxDamage,
    maxRoundsEncounter: maxRounds,
  };
}
