/* ---------- Note Types ---------- */

export type NoteType =
  | "general"
  | "lore"
  | "location"
  | "npc"
  | "session_recap"
  | "secret"
  | "plot_hook";

export const NOTE_TYPES: NoteType[] = [
  "general",
  "lore",
  "location",
  "npc",
  "session_recap",
  "secret",
  "plot_hook",
];

/* ---------- Mind Map Edges ---------- */

export type EdgeEntityType =
  | "npc"
  | "note"
  | "quest"
  | "session"
  | "location"
  | "faction"
  | "encounter"
  | "player"
  | "bag_item";

export type EdgeRelationship =
  | "linked_to"
  | "lives_in"
  | "participated_in"
  | "requires"
  | "leads_to"
  | "allied_with"
  | "enemy_of"
  | "gave_quest"
  | "dropped_item"
  | "member_of"
  | "happened_at"
  | "guards"
  | "owns"
  | "custom";

export interface MindMapEdge {
  id: string;
  campaign_id: string;
  source_type: EdgeEntityType;
  source_id: string;
  target_type: EdgeEntityType;
  target_id: string;
  relationship: EdgeRelationship;
  custom_label: string | null;
  created_by: string;
  created_at: string;
}

/* ---------- Locations ---------- */

export type LocationType = "city" | "dungeon" | "wilderness" | "building" | "region";

export const LOCATION_TYPES: LocationType[] = [
  "city",
  "dungeon",
  "wilderness",
  "building",
  "region",
];

export interface CampaignLocation {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  location_type: LocationType;
  parent_location_id: string | null;
  is_discovered: boolean;
  image_url: string | null;
  is_visible_to_players: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/* ---------- Factions ---------- */

export type FactionAlignment = "ally" | "neutral" | "hostile";

export const FACTION_ALIGNMENTS: FactionAlignment[] = ["ally", "neutral", "hostile"];

export interface CampaignFaction {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  alignment: FactionAlignment;
  image_url: string | null;
  is_visible_to_players: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/* ---------- Layout Persistence ---------- */

export interface MindMapNodeLayout {
  id: string;
  campaign_id: string;
  node_key: string;
  x: number;
  y: number;
  is_collapsed: boolean;
  updated_at: string;
}
