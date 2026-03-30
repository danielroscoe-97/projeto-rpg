import type { Combatant } from "./combat";
import type { HpStatus } from "@/lib/utils/hp-status";
import type { CombatantStats } from "@/lib/utils/combat-stats";

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
  | "combat:hidden_change"
  | "combat:stats_update"
  | "combat:player_notes_update"
  | "combat:late_join_request"
  | "combat:late_join_response"
  | "combat:rejoin_request"
  | "combat:rejoin_response"
  | "combat:session_revoked"
  | "session:state_sync"
  | "session:player_linked"
  | "session:combat_stats"
  | "session:weather_change"
  | "audio:play_sound"
  | "audio:ambient_start"
  | "audio:ambient_stop";

export interface RealtimeHpUpdate {
  type: "combat:hp_update";
  combatant_id: string;
  current_hp: number;
  temp_hp: number;
  /** Included for broadcast sanitization — stripped for non-player combatants */
  max_hp?: number;
  /** Included for broadcast sanitization — determines what data players see */
  is_player?: boolean;
  /** Calculated server-side for non-player combatants (LIGHT/MODERATE/HEAVY/CRITICAL) */
  hp_status?: string;
}

export interface RealtimeTurnAdvance {
  type: "combat:turn_advance";
  current_turn_index: number;
  round_number: number;
  /** ID of the next non-defeated combatant after the current one (Story 3.1) */
  next_combatant_id?: string;
}

export interface RealtimeConditionChange {
  type: "combat:condition_change";
  combatant_id: string;
  conditions: string[];
  condition_durations?: Record<string, number>;
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

export interface RealtimeHiddenChange {
  type: "combat:hidden_change";
  combatant_id: string;
  is_hidden: boolean;
  /** When revealing (is_hidden=false), include the full combatant for player-side add */
  combatant?: Combatant;
}

export interface RealtimeStatsUpdate {
  type: "combat:stats_update";
  combatant_id: string;
  name?: string;
  display_name?: string | null;
  is_player?: boolean;
  max_hp?: number;
  current_hp?: number;
  ac?: number;
  spell_save_dc?: number | null;
}

export interface RealtimePlayerNotesUpdate {
  type: "combat:player_notes_update";
  combatant_id: string;
  player_notes: string;
}

export interface RealtimeLateJoinRequest {
  type: "combat:late_join_request";
  player_name: string;
  hp: number | null;
  ac: number | null;
  initiative: number;
  request_id: string;
}

export interface RealtimeLateJoinResponse {
  type: "combat:late_join_response";
  request_id: string;
  accepted: boolean;
}

export interface RealtimeRejoinRequest {
  type: "combat:rejoin_request";
  /** Name the player chose to rejoin as */
  character_name: string;
  request_id: string;
  /** Whether the character currently has an active session */
  is_active_session: boolean;
  /** Token ID of the sender — used to revoke the correct session when another device takes over */
  sender_token_id: string;
}

export interface RealtimeRejoinResponse {
  type: "combat:rejoin_response";
  request_id: string;
  accepted: boolean;
}

export interface RealtimeSessionRevoked {
  type: "combat:session_revoked";
  /** Token ID of the session being revoked */
  revoked_token_id: string;
}

export interface RealtimeStateSync {
  type: "session:state_sync";
  combatants: Combatant[];
  current_turn_index: number;
  round_number: number;
  /** Included on combat start so the player can exit the lobby */
  encounter_id?: string;
}

export interface RealtimeCombatStats {
  type: "session:combat_stats";
  stats: CombatantStats[];
  encounter_name: string;
  rounds: number;
}

export interface RealtimeWeatherChange {
  type: "session:weather_change";
  effect: string;
}

export interface RealtimeAudioPlay {
  type: "audio:play_sound";
  sound_id: string;
  source: "preset" | "custom";
  player_name: string;
  /** Signed URL for custom sounds */
  audio_url?: string;
}

export interface RealtimeAmbientStart {
  type: "audio:ambient_start";
  sound_id: string;
}

export interface RealtimeAmbientStop {
  type: "audio:ambient_stop";
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
  | RealtimeHiddenChange
  | RealtimeStatsUpdate
  | RealtimePlayerNotesUpdate
  | RealtimeLateJoinRequest
  | RealtimeLateJoinResponse
  | RealtimeRejoinRequest
  | RealtimeRejoinResponse
  | RealtimeSessionRevoked
  | RealtimeStateSync
  | RealtimeCombatStats
  | RealtimeWeatherChange
  | RealtimeAudioPlay
  | RealtimeAmbientStart
  | RealtimeAmbientStop;

// ── Sanitized types for player-facing broadcast (A.0.6) ──────────

/** Combatant data safe for player broadcast — no DM-only fields, no monster stats. */
export type SanitizedCombatant = Omit<
  Combatant,
  "dm_notes" | "display_name" | "current_hp" | "max_hp" | "temp_hp" | "ac" | "spell_save_dc"
> & {
  /** Monsters get hp_status instead of exact HP values */
  hp_status?: HpStatus;
  /** Present for players, absent for monsters */
  current_hp?: number;
  max_hp?: number;
  temp_hp?: number;
  ac?: number;
  spell_save_dc?: number | null;
};

/** Player-safe version of combat:combatant_add */
export interface SanitizedCombatantAdd {
  type: "combat:combatant_add";
  combatant: SanitizedCombatant;
}

/** Player-safe version of session:state_sync */
export interface SanitizedStateSync {
  type: "session:state_sync";
  combatants: SanitizedCombatant[];
  current_turn_index: number;
  round_number: number;
  encounter_id?: string;
}

/** Player-safe version of combat:initiative_reorder */
export interface SanitizedInitiativeReorder {
  type: "combat:initiative_reorder";
  combatants: SanitizedCombatant[];
}

/** Player-safe HP update for player characters (full HP data) */
export interface SanitizedPlayerHpUpdate {
  type: "combat:hp_update";
  combatant_id: string;
  current_hp: number;
  temp_hp: number;
  max_hp?: number;
  hp_status?: HpStatus;
}

/** Player-safe HP update for monsters (status only, no exact HP) */
export interface SanitizedMonsterHpUpdate {
  type: "combat:hp_update";
  combatant_id: string;
  hp_status: HpStatus;
}

/** Player-safe stats update — only name changes reach players */
export interface SanitizedStatsUpdate {
  type: "combat:stats_update";
  combatant_id: string;
  name?: string;
}

/** Union of all sanitized event types that can be broadcast to players */
export type SanitizedEvent =
  | SanitizedCombatantAdd
  | SanitizedStateSync
  | SanitizedInitiativeReorder
  | SanitizedPlayerHpUpdate
  | SanitizedMonsterHpUpdate
  | SanitizedStatsUpdate
  | RealtimeTurnAdvance
  | RealtimeConditionChange
  | RealtimeCombatantRemove
  | RealtimeVersionSwitch
  | RealtimeDefeatedChange
  | RealtimePlayerNotesUpdate
  | RealtimeLateJoinRequest
  | RealtimeLateJoinResponse
  | RealtimeRejoinRequest
  | RealtimeRejoinResponse
  | RealtimeSessionRevoked
  | RealtimeCombatStats
  | RealtimeWeatherChange
  | RealtimeAudioPlay
  | RealtimeAmbientStart
  | RealtimeAmbientStop;
