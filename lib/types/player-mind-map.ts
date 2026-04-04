import type { NoteType, LocationType, FactionAlignment, EdgeRelationship } from "./mind-map";

/* ---------- RPC Response Shape ---------- */

export interface PlayerVisibleNpc {
  id: string;
  name: string;
  is_alive: boolean;
}

export interface PlayerVisibleLocation {
  id: string;
  name: string; // "???" if undiscovered
  location_type: LocationType;
  description: string; // "" if undiscovered
  is_discovered: boolean;
}

export interface PlayerVisibleFaction {
  id: string;
  name: string;
  alignment: FactionAlignment;
}

export interface PlayerVisibleQuest {
  id: string;
  title: string;
  status: "available" | "active" | "completed";
}

export interface PlayerVisibleNote {
  id: string;
  title: string;
  note_type: NoteType;
}

export interface PlayerVisibleSession {
  id: string;
  name: string;
  is_active: boolean;
}

export interface PlayerVisibleBagItem {
  id: string;
  item_name: string;
  quantity: number;
}

export interface PlayerVisibleMember {
  id: string;
  user_id: string;
  character_name: string | null;
  character_id: string | null;
}

export interface PlayerVisibleEdge {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship: EdgeRelationship;
  custom_label: string | null;
}

export interface PlayerVisibleLayout {
  node_key: string;
  x: number;
  y: number;
  is_collapsed: boolean;
}

export interface PlayerVisibleNodesResponse {
  npcs: PlayerVisibleNpc[];
  locations: PlayerVisibleLocation[];
  factions: PlayerVisibleFaction[];
  quests: PlayerVisibleQuest[];
  notes: PlayerVisibleNote[];
  sessions: PlayerVisibleSession[];
  bag_items: PlayerVisibleBagItem[];
  members: PlayerVisibleMember[];
  edges: PlayerVisibleEdge[];
  layout: PlayerVisibleLayout[];
  error?: string;
}
