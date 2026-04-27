import type { Combatant } from "./combat";
import type { HpStatus } from "@/lib/utils/hp-status";
import type { CombatantStats } from "@/lib/utils/combat-stats";

/** Realtime event types following domain:action pattern */
export type RealtimeEventType =
  | "combat:hp_update"
  | "combat:turn_advance"
  | "combat:condition_change"
  | "combat:combatant_add"
  | "combat:combatant_add_reorder"
  | "combat:combatant_remove"
  | "combat:initiative_reorder"
  | "combat:version_switch"
  | "combat:defeated_change"
  | "combat:hidden_change"
  | "combat:stats_update"
  | "combat:player_notes_update"
  | "combat:reaction_toggle"
  | "combat:late_join_request"
  | "combat:late_join_response"
  | "combat:rejoin_request"
  | "combat:rejoin_response"
  | "combat:session_revoked"
  | "session:state_sync"
  | "session:player_linked"
  | "session:combat_stats"
  | "session:combat_recap"
  | "session:ended"
  | "session:poll_results"
  | "session:weather_change"
  | "audio:play_sound"
  | "audio:ambient_start"
  | "audio:ambient_stop"
  | "audio:loop_stop"
  | "player:death_save"
  | "player:poll_vote"
  | "player:hp_action"
  | "player:self_condition_toggle"
  | "chat:player_message"
  | "chat:dm_postit"
  | "campaign:combat_invite"
  | "user:combat_invite"
  // Wave 3c D5 — Player notifications (Diário inbox + Quest board badges).
  // Broadcast on the consolidated `campaign:{campaignId}` channel.
  | "note:received"
  | "quest:assigned"
  | "quest:updated";

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
  /** Death saves state — included when player is at 0 HP */
  death_saves?: { successes: number; failures: number };
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

/**
 * S1.2 — Atomic combatant-add + initiative-reorder event.
 *
 * Replaces the legacy `combat:combatant_add` + `session:state_sync` pair that
 * was raced by `broadcastViaServer` (2 senders, partial FIFO). Emitted by the
 * DM as a single broadcast, and opted out of server-side re-broadcast in
 * `lib/realtime/broadcast.ts` so there is exactly one in-flight copy.
 *
 * Feature-flagged via `ff_combatant_add_reorder` (see `lib/flags.ts`).
 * Handler on player side applies combatant add + reorder + turn_index in a
 * single React state update, eliminating mid-combat desync.
 */
export interface RealtimeCombatantAddReorder {
  type: "combat:combatant_add_reorder";
  /** The newly added combatant (already sanitized on DM side when emitted to players). */
  combatant: Combatant;
  /**
   * Initiative-order map for every combatant AFTER the add + sort.
   * Player uses this to reorder its local list without needing a full state_sync.
   * `initiative_order` may be `null` for combatants that haven't been hydrated yet
   * (rare — mirrors `Combatant.initiative_order`'s own nullability).
   */
  initiative_map: Array<{ id: string; initiative_order: number | null }>;
  /** Adjusted turn index accounting for the reinsertion of the current-turn combatant. */
  current_turn_index: number;
  round_number: number;
  encounter_id: string;
}

export interface RealtimeCombatantRemove {
  type: "combat:combatant_remove";
  combatant_id: string;
}

export interface RealtimeInitiativeReorder {
  type: "combat:initiative_reorder";
  combatants: Combatant[];
  current_turn_index: number;
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
  /** Broadcast so the whole party can see how many legendary actions were spent (decision 2026-04-23). */
  legendary_actions_used?: number;
  /** Broadcast with the total so players can render "X / Y" even before a state_sync. */
  legendary_actions_total?: number | null;
}

export interface RealtimePlayerNotesUpdate {
  type: "combat:player_notes_update";
  combatant_id: string;
  player_notes: string;
}

export interface RealtimeReactionToggle {
  type: "combat:reaction_toggle";
  combatant_id: string;
  reaction_used: boolean;
  /** Sent by player for ownership validation on DM side; omitted in DM re-broadcasts */
  player_name?: string;
  /** Token ID for ID-based ownership validation (B3: survives renames) */
  sender_token_id?: string;
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
  combatDuration?: number;
}

/** B6: Full combat recap broadcast so players see the "Spotify Wrapped" experience */
export interface RealtimeCombatRecap {
  type: "session:combat_recap";
  report: import("@/lib/types/combat-report").CombatReport;
}

export interface RealtimeSessionEnded {
  type: "session:ended";
  reason?: "dm_ended" | "session_expired";
}

/** C.15-B: Broadcast from DM right before session:ended so players see aggregate poll results */
export interface RealtimeSessionPollResults {
  type: "session:poll_results";
  avg: number;
  /** votes per difficulty level: { 1: N, 2: N, 3: N, 4: N, 5: N } */
  distribution: Record<number, number>;
  total_votes: number;
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

export interface RealtimeLoopStop {
  type: "audio:loop_stop";
  sound_id: string;
}

export interface RealtimePlayerDeathSave {
  type: "player:death_save";
  player_name: string;
  combatant_id: string;
  result: "success" | "failure";
  /** Token ID for ID-based ownership validation (B3: survives renames) */
  sender_token_id?: string;
}

export interface RealtimePlayerPollVote {
  type: "player:poll_vote";
  player_name: string;
  vote: 1 | 2 | 3 | 4 | 5;
}

export interface RealtimePlayerHpAction {
  type: "player:hp_action";
  player_name: string;
  combatant_id: string;
  action: "damage" | "heal" | "temp_hp";
  amount: number;
  /** Token ID for ID-based ownership validation (B3: survives renames) */
  sender_token_id?: string;
}

export interface RealtimeChatPlayerMessage {
  type: "chat:player_message";
  /** Name of the sending player's character */
  sender_name: string;
  /** Client-generated unique message id */
  message_id: string;
  /** Plain text content */
  content: string;
  /** ISO timestamp */
  sent_at: string;
}

export interface RealtimePlayerSelfConditionToggle {
  type: "player:self_condition_toggle";
  /** Name of the player initiating the toggle */
  player_name: string;
  /** Combatant ID the player is toggling a condition on (must be their own character) */
  combatant_id: string;
  /** The condition being toggled (must be in BENEFICIAL_CONDITIONS) */
  condition: string;
  /** Token ID for ID-based ownership validation (B3: survives renames) */
  sender_token_id?: string;
}

export interface RealtimeChatDmPostit {
  type: "chat:dm_postit";
  /** Client-generated unique postit id */
  postit_id: string;
  /** Plain text content (max 280 chars) */
  content: string;
  /** token_id of the target player, or "all" */
  target: string;
  /** ISO timestamp */
  sent_at: string;
}

/**
 * Wave 5 (F19) — Auto-invite pro Combate (shared payload shape).
 *
 * Channel strategy (P2 consolidation, 2026-04-22):
 *   - PRIMARY: `user-invites:{userId}` (1 canal por user, delivery direta pros
 *     players ativos da campanha via dispatch route). Event:
 *     `user:combat_invite` / type `RealtimeUserInvite`.
 *   - LEGACY (grace period): `campaign:{campaignId}:invites` (N canais por DM).
 *     Mantido por ~7 dias pós-deploy até todos clientes terem o código novo.
 *     Event: `campaign:combat_invite` / type `RealtimeCombatInvite`.
 *
 * Payload é idêntico em ambos os types (mesmos campos). Split em interfaces
 * separadas pra que o TS control-flow narrowing funcione nos filtros de
 * broadcast sanitization.
 *
 * Listeners fazem dedup por `session_id`. Fallback durável via
 * `player_notifications` continua igual.
 *
 * Auth-only (Combat Parity Rule).
 */
interface RealtimeCombatInvitePayload {
  campaign_id: string;
  campaign_name: string;
  session_id: string;
  encounter_id: string;
  join_token: string;
  join_url: string;
  dm_user_id: string;
  dm_display_name: string | null;
  encounter_name: string | null;
  started_at: string;
  /** Monotonic seq (spec §3.2) — aligns with broadcast.ts:428-429 convention. */
  _seq?: number;
}

/** Legacy channel (`campaign:{id}:invites`) — grace period only. */
export interface RealtimeCombatInvite extends RealtimeCombatInvitePayload {
  type: "campaign:combat_invite";
}

/** Primary channel (`user-invites:{userId}`) — P2 consolidation, 2026-04-22. */
export interface RealtimeUserInvite extends RealtimeCombatInvitePayload {
  type: "user:combat_invite";
}

/** Union of both combat-invite event shapes (legacy + new). */
export type RealtimeAnyCombatInvite = RealtimeCombatInvite | RealtimeUserInvite;

// ── Wave 3c D5 — Player Notifications (Diário inbox + Quest board) ──────
//
// All three events ride the consolidated `campaign:{campaignId}` channel.
// The Mestre emits them server-side after creating/updating a campaign_note
// or a campaign_quest; the player listens via `usePlayerNotifications` and
// surfaces a badge on the Diário tab.

export interface RealtimePlayerNoteReceived {
  type: "note:received";
  /** ID of the campaign_notes row addressed to a single player character. */
  noteId: string;
  /** target_character_id — used by the listener to filter relevant pings. */
  targetCharacterId: string;
  campaignId: string;
  /** Optional title for the toast (sanitized server-side). */
  title?: string;
  /** ISO timestamp of when the note was authored. */
  timestamp: string;
}

export interface RealtimeQuestAssigned {
  type: "quest:assigned";
  questId: string;
  campaignId: string;
  /** ID of the player_character receiving the assignment. */
  targetCharacterId: string;
  questTitle?: string;
  timestamp: string;
}

export interface RealtimeQuestUpdated {
  type: "quest:updated";
  questId: string;
  campaignId: string;
  /** Optional — broadcast may be campaign-wide or character-targeted. */
  targetCharacterId?: string;
  questTitle?: string;
  /** New status, when the update flips the quest state. */
  status?: string;
  timestamp: string;
}

export type RealtimeEvent =
  | RealtimeHpUpdate
  | RealtimeTurnAdvance
  | RealtimeConditionChange
  | RealtimeCombatantAdd
  | RealtimeCombatantAddReorder
  | RealtimeCombatantRemove
  | RealtimeInitiativeReorder
  | RealtimeVersionSwitch
  | RealtimeDefeatedChange
  | RealtimeHiddenChange
  | RealtimeStatsUpdate
  | RealtimePlayerNotesUpdate
  | RealtimeReactionToggle
  | RealtimeLateJoinRequest
  | RealtimeLateJoinResponse
  | RealtimeRejoinRequest
  | RealtimeRejoinResponse
  | RealtimeSessionRevoked
  | RealtimeSessionEnded
  | RealtimeSessionPollResults
  | RealtimeStateSync
  | RealtimeCombatStats
  | RealtimeWeatherChange
  | RealtimeAudioPlay
  | RealtimeAmbientStart
  | RealtimeAmbientStop
  | RealtimeLoopStop
  | RealtimePlayerDeathSave
  | RealtimePlayerPollVote
  | RealtimePlayerHpAction
  | RealtimeChatPlayerMessage
  | RealtimeChatDmPostit
  | RealtimePlayerSelfConditionToggle
  | RealtimeCombatRecap
  | RealtimeCombatInvite
  | RealtimeUserInvite
  | RealtimePlayerNoteReceived
  | RealtimeQuestAssigned
  | RealtimeQuestUpdated;

// ── Sanitized types for player-facing broadcast (A.0.6) ──────────

/** Combatant data safe for player broadcast — no DM-only fields, no monster stats.
 *  Legendary action counts ARE included (decision 2026-04-23): the whole party
 *  should see how many legendary actions a monster has left. Recharge state stays
 *  DM-only (the Mestre rolls that behind the screen, by design). */
export type SanitizedCombatant = Omit<
  Combatant,
  | "dm_notes"
  | "display_name"
  | "current_hp"
  | "max_hp"
  | "temp_hp"
  | "ac"
  | "spell_save_dc"
> & {
  /** Monsters get hp_status instead of exact HP values */
  hp_status?: HpStatus;
  /** HP percentage (0-100) for monsters — avoids exposing exact HP */
  hp_percentage?: number;
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

/**
 * S1.2 — Player-safe version of combat:combatant_add_reorder.
 *
 * `initiative_map` is sanitized before send: hidden combatants' real IDs are
 * replaced with opaque "hidden:<hash>" placeholders (marked via optional
 * `is_hidden: true`). Visible combatants pass through with their real IDs.
 * The player applies the map by matching its local (already-filtered) list;
 * opaque placeholders are ignored for sorting and never flagged as desync.
 */
export interface SanitizedCombatantAddReorder {
  type: "combat:combatant_add_reorder";
  combatant: SanitizedCombatant;
  initiative_map: Array<{ id: string; initiative_order: number | null; is_hidden?: true }>;
  current_turn_index: number;
  round_number: number;
  encounter_id: string;
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
  current_turn_index: number;
}

/** Player-safe HP update for player characters (full HP data) */
export interface SanitizedPlayerHpUpdate {
  type: "combat:hp_update";
  combatant_id: string;
  current_hp: number;
  temp_hp: number;
  max_hp?: number;
  hp_status?: HpStatus;
  death_saves?: { successes: number; failures: number };
}

/** Player-safe HP update for monsters (status + percentage, no exact HP) */
export interface SanitizedMonsterHpUpdate {
  type: "combat:hp_update";
  combatant_id: string;
  hp_status: HpStatus;
  hp_percentage: number;
}

/** Player-safe stats update — name changes reach players, plus legendary action counts
 *  (decision 2026-04-23: whole party sees LA spent). Recharge state stays DM-only. */
export interface SanitizedStatsUpdate {
  type: "combat:stats_update";
  combatant_id: string;
  name?: string;
  legendary_actions_used?: number;
  legendary_actions_total?: number | null;
}

/** Union of all sanitized event types that can be broadcast to players */
export type SanitizedEvent =
  | SanitizedCombatantAdd
  | SanitizedCombatantAddReorder
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
  | RealtimeReactionToggle
  | RealtimeLateJoinRequest
  | RealtimeLateJoinResponse
  | RealtimeRejoinRequest
  | RealtimeRejoinResponse
  | RealtimeSessionEnded
  | RealtimeSessionPollResults
  | RealtimeSessionRevoked
  | RealtimeCombatStats
  | RealtimeWeatherChange
  | RealtimeAudioPlay
  | RealtimeAmbientStart
  | RealtimeAmbientStop
  | RealtimeLoopStop
  | RealtimeChatPlayerMessage
  | RealtimeChatDmPostit
  | RealtimeCombatRecap
  // Wave 3c D5 — campaign-scoped player notifications. They carry no
  // combatant data; sanitize() passes them through unchanged.
  | RealtimePlayerNoteReceived
  | RealtimeQuestAssigned
  | RealtimeQuestUpdated;
