// ── Campaign Health Score ───────────────────────────────────────────────────
// Pure utility — no React, no Supabase, no side effects.
// Calculates a 0-100 "health" score based on campaign activity.

export interface CampaignHealthInput {
  playerCount: number;
  encounterCount: number;
  sessionCount: number;
  noteCount: number;
  npcCount: number;
  /** ISO date string of the last session, or null if no sessions */
  lastSessionDate: string | null;
}

export interface CampaignHealthResult {
  /** Overall score 0-100 */
  score: number;
  /** Health level */
  level: "new" | "growing" | "active" | "stale";
  /** Individual component scores (each worth 25 pts) */
  components: {
    hasPlayers: boolean;
    hasEncounters: boolean;
    hasSessions: boolean;
    hasContent: boolean;
  };
  /** Days since last session (null if never) */
  daysSinceLastSession: number | null;
  /** Staleness color for "last session" badge */
  lastSessionColor: "green" | "yellow" | "red" | "gray";
}

const MS_PER_DAY = 86_400_000;

export function calculateCampaignHealth(
  input: CampaignHealthInput,
): CampaignHealthResult {
  // ── Component checks (25 pts each) ─────────────────────────────────────
  const hasPlayers = input.playerCount > 0;
  const hasEncounters = input.encounterCount > 0;
  const hasSessions = input.sessionCount > 0;
  const hasContent = input.noteCount > 0 || input.npcCount > 0;

  const score =
    (hasPlayers ? 25 : 0) +
    (hasEncounters ? 25 : 0) +
    (hasSessions ? 25 : 0) +
    (hasContent ? 25 : 0);

  // ── Days since last session ────────────────────────────────────────────
  let daysSinceLastSession: number | null = null;
  if (input.lastSessionDate) {
    const lastDate = new Date(input.lastSessionDate).getTime();
    daysSinceLastSession = Math.floor((Date.now() - lastDate) / MS_PER_DAY);
  }

  // ── Last session color ─────────────────────────────────────────────────
  let lastSessionColor: CampaignHealthResult["lastSessionColor"] = "gray";
  if (daysSinceLastSession !== null) {
    if (daysSinceLastSession < 7) {
      lastSessionColor = "green";
    } else if (daysSinceLastSession < 30) {
      lastSessionColor = "yellow";
    } else {
      lastSessionColor = "red";
    }
  }

  // ── Health level ───────────────────────────────────────────────────────
  let level: CampaignHealthResult["level"];
  if (score >= 75 && daysSinceLastSession !== null && daysSinceLastSession > 30) {
    level = "stale";
  } else if (score >= 75) {
    level = "active";
  } else if (score >= 50) {
    level = "growing";
  } else if (score >= 25) {
    level = "growing";
  } else {
    level = "new";
  }

  return {
    score,
    level,
    components: { hasPlayers, hasEncounters, hasSessions, hasContent },
    daysSinceLastSession,
    lastSessionColor,
  };
}
