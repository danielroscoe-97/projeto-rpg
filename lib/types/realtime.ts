import type { Combatant } from "./combat";

/** Realtime event types following domain:action pattern */
export type RealtimeEventType =
  | "combat:hp_update"
  | "combat:turn_advance"
  | "combat:condition_change"
  | "combat:combatant_add"
  | "combat:combatant_remove"
  | "combat:initiative_reorder"
  | "combat:version_switch"
  | "combat:defeated_change"
  | "combat:stats_update"
  | "session:state_sync";

export interface RealtimeHpUpdate {
  type: "combat:hp_update";
  combatant_id: string;
  current_hp: number;
  temp_hp: number;
}

export interface RealtimeTurnAdvance {
  type: "combat:turn_advance";
  current_turn_index: number;
  round_number: number;
}

export interface RealtimeConditionChange {
  type: "combat:condition_change";
  combatant_id: string;
  conditions: string[];
}

export interface RealtimeCombatantAdd {
  type: "combat:combatant_add";
  combatant: Combatant;
}

export interface RealtimeCombatantRemove {
  type: "combat:combatant_remove";
  combatant_id: string;
}

export interface RealtimeInitiativeReorder {
  type: "combat:initiative_reorder";
  combatants: Combatant[];
}

export interface RealtimeVersionSwitch {
  type: "combat:version_switch";
  combatant_id: string;
  ruleset_version: string;
}

export interface RealtimeDefeatedChange {
  type: "combat:defeated_change";
  combatant_id: string;
  is_defeated: boolean;
}

export interface RealtimeStatsUpdate {
  type: "combat:stats_update";
  combatant_id: string;
  name?: string;
  max_hp?: number;
  current_hp?: number;
  ac?: number;
  spell_save_dc?: number | null;
}

export interface RealtimeStateSync {
  type: "session:state_sync";
  combatants: Combatant[];
  current_turn_index: number;
  round_number: number;
}

export type RealtimeEvent =
  | RealtimeHpUpdate
  | RealtimeTurnAdvance
  | RealtimeConditionChange
  | RealtimeCombatantAdd
  | RealtimeCombatantRemove
  | RealtimeInitiativeReorder
  | RealtimeVersionSwitch
  | RealtimeDefeatedChange
  | RealtimeStatsUpdate
  | RealtimeStateSync;
