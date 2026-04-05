// Types for Campaign Hub v2 (spec: docs/spec-campaign-hub-v2.md)

import type { LucideIcon } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";
import type { AggregatedCampaignStats } from "@/lib/utils/campaign-stats";

// ── Section IDs ──────────────────────────────────────────────────────────────

export type SectionId =
  | "encounters"
  | "quests"
  | "players"
  | "npcs"
  | "locations"
  | "factions"
  | "notes"
  | "inventory"
  | "mindmap";

export const VALID_SECTIONS: SectionId[] = [
  "encounters",
  "quests",
  "players",
  "npcs",
  "locations",
  "factions",
  "notes",
  "inventory",
  "mindmap",
];

// ── Section Card (for grid) ──────────────────────────────────────────────────

export type SectionGroup = "operational" | "world" | "journal";

export interface SectionCardDef {
  id: SectionId;
  icon: LucideIcon;
  titleKey: string;        // i18n key within "campaign" namespace (e.g. "hub_card_encounters")
  group: SectionGroup;
  dmOnly?: boolean;        // true = hide from non-owners
}

// ── Monster option (for encounter builder) ───────────────────────────────────

export interface MonsterOption {
  name: string;
  cr: string;
  type?: string;
  slug?: string;
  token_url?: string | null;
  source?: string;
}

// ── Section counts ───────────────────────────────────────────────────────────

export interface CampaignSectionCounts {
  players: number;
  sessions: number;
  encounters: number;       // finished encounters
  quests: number;
  npcs: number;
  locations: number;
  factions: number;
  notes: number;
}

// ── Hub data (passed from page.tsx server component to client components) ────

export interface CampaignHubData {
  campaignId: string;
  campaignName: string;
  isOwner: boolean;
  userId: string;

  // Characters (for avatars + PlayerCharacterManager)
  characters: PlayerCharacter[];

  // Counts
  counts: CampaignSectionCounts;

  // Active session
  activeSessionId: string | null;
  activeSessionName: string | null;

  // For combat/invite dialogs
  playerEmails: string[];

  // Campaign stats (for CampaignStatsBar)
  campaignStats: AggregatedCampaignStats;

  // SRD monsters (DM only, for encounter builder)
  srdMonsters?: MonsterOption[];

  // Members (for PlayerCharacterManager)
  initialMembers?: CampaignMemberWithUser[];
}
