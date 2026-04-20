/**
 * Types for Campaign Dashboard Briefing (F10 — Onda 2a)
 * See: docs/SPEC-campaign-dashboard-briefing.md
 */

import type { PlannedSession } from "./campaign-hub";

// ── Active encounter (for "Hoje" card) ──────────────────────────────────────

export interface ActiveEncounterInfo {
  id: string;
  round_number: number | null;
  name: string | null;
}

// ── Recent activity timeline ────────────────────────────────────────────────

export type RecentActivityType = "npc" | "location" | "faction" | "note" | "quest";

export interface RecentActivityItem {
  id: string;
  type: RecentActivityType;
  /** Display name (falls back to translated "untitled" if empty) */
  label: string;
  /** ISO timestamp — prefers updated_at, falls back to created_at */
  timestamp: string;
}

// ── Briefing status ─────────────────────────────────────────────────────────

/**
 * Visual/semantic status of the campaign on the briefing.
 * Drives hero halo + status badge variant.
 */
export type BriefingStatus = "active_combat" | "active_session" | "planned_next" | "paused" | "new";

// ── Composite briefing data ─────────────────────────────────────────────────

/**
 * Full data required by <CampaignBriefing />.
 * Passed down from CampaignDmViewServer after SSR queries resolve.
 */
export interface CampaignBriefingData {
  campaignId: string;
  campaignName: string;

  // Hero / status
  activeSessionId: string | null;
  activeSessionName: string | null;
  activeEncounter: ActiveEncounterInfo | null;
  nextPlannedSession: PlannedSession | null;
  lastSessionDate: string | null;

  // Counts (for Pulse)
  playerCount: number;
  sessionCount: number;
  questCount: number;
  finishedEncounterCount: number;
  noteCount: number;
  npcCount: number;
  locationCount: number;
  factionCount: number;

  // Recent activity
  recentActivity: RecentActivityItem[];
}
