/**
 * Server-safe sanitization logic for broadcast events.
 * Extracted from broadcast.ts so it can run both client-side and in API routes.
 * Does NOT depend on browser APIs or Zustand stores.
 */

import type { Combatant } from "@/lib/types/combat";
import type {
  RealtimeEvent,
  SanitizedEvent,
  SanitizedCombatant,
  SanitizedCombatantAdd,
  SanitizedCombatantAddReorder,
  SanitizedStateSync,
  SanitizedInitiativeReorder,
  SanitizedPlayerHpUpdate,
  SanitizedMonsterHpUpdate,
  SanitizedStatsUpdate,
} from "@/lib/types/realtime";
import { getHpStatus, getHpPercentage } from "@/lib/utils/hp-status";

/** Sanitize a combatant for player-visible broadcast. */
export function sanitizeCombatant(c: Combatant): SanitizedCombatant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dm_notes, display_name, legendary_actions_total: _lat, legendary_actions_used: _lau, session_token_id: _stid, ...base } = c;

  if (c.is_player) {
    return {
      ...base,
      current_hp: c.current_hp,
      max_hp: c.max_hp,
      temp_hp: c.temp_hp,
      ac: c.ac,
      spell_save_dc: c.spell_save_dc,
    };
  }

  // S5.1 S2 fix — polymorph carries exact form HP numbers (`temp_current_hp`,
  // `temp_max_hp`, `temp_ac`). For non-player combatants (monsters), exact
  // numbers break the anti-metagaming rule just like base HP does. Zero out
  // the numeric fields while preserving `form_name` + `enabled` so the
  // player's two-bar render (showFullHp path) or form-name badge (other)
  // still works qualitatively from percentage-derived `hp_status`.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { current_hp, max_hp, temp_hp, ac, spell_save_dc, polymorph, ...safe } = base;

  return {
    ...safe,
    name: display_name || base.name,
    hp_status: getHpStatus(c.current_hp, c.max_hp),
    hp_percentage: getHpPercentage(c.current_hp, c.max_hp),
    ...(polymorph?.enabled
      ? {
          polymorph: {
            enabled: true,
            variant: polymorph.variant,
            form_name: polymorph.form_name,
            temp_current_hp: 0, // redacted — no metagaming leak
            temp_max_hp: 0,
            started_at_turn: polymorph.started_at_turn,
          },
        }
      : {}),
  };
}

/**
 * Sanitize a DM event for player-safe broadcast (server-side version).
 * Takes the full combatants list for turn-index adjustment (server knows all combatants).
 * Returns null when the event should be suppressed.
 */
export function sanitizePayloadServer(
  event: RealtimeEvent,
  allCombatants?: Combatant[]
): SanitizedEvent | null {
  // Audio / weather / stats / poll results pass through unchanged
  if (event.type === "audio:play_sound") return event;
  if (event.type === "session:weather_change") return event;
  if (event.type === "session:combat_stats") return event;
  if (event.type === "session:poll_results") return event;

  // Player death saves are DM-only, never broadcast
  if (event.type === "player:death_save") return null;
  if (event.type === "player:poll_vote") return null;
  // P1.01: player:hp_action is player→DM only, must not re-broadcast to other players
  if (event.type === "player:hp_action") return null;
  // player:self_condition_toggle is player→DM only — DM re-broadcasts the result as combat:condition_change
  if (event.type === "player:self_condition_toggle") return null;
  // W5 (F19) + P2 consolidation: combat_invite events (legacy campaign-scoped
  // and new user-scoped) are server-origin only and travel on separate
  // broadcast channels (`campaign:{id}:invites` and `user-invites:{userId}`).
  // They must never be rebroadcast from the DM's `session:{id}` channel.
  // Split into two separate narrowing checks so the TS control-flow analyzer
  // can exclude `RealtimeCombatInvite` from the `return event` below.
  if (event.type === "campaign:combat_invite") return null;
  if (event.type === "user:combat_invite") return null;

  // Turn advance: adjust index for visible combatants
  if (event.type === "combat:turn_advance") {
    return {
      ...event,
      current_turn_index: adjustTurnIndex(event.current_turn_index, allCombatants),
    };
  }

  // Combatant add: suppress hidden, sanitize others
  if (event.type === "combat:combatant_add") {
    if (event.combatant.is_hidden) return null;
    const result: SanitizedCombatantAdd = {
      type: event.type,
      combatant: sanitizeCombatant(event.combatant),
    };
    return result;
  }

  // S1.2: combat:combatant_add_reorder — atomic add + reorder
  if (event.type === "combat:combatant_add_reorder") {
    if (event.combatant.is_hidden) return null;
    // B-2 FIX: mask hidden combatant IDs in initiative_map (same rule as
    // client-side sanitizePayload). Preserves order; avoids leak + false-positive
    // desync on player.
    const sanitizedMap = sanitizeInitiativeMapForPlayers(event.initiative_map, allCombatants);
    const result: SanitizedCombatantAddReorder = {
      type: event.type,
      combatant: sanitizeCombatant(event.combatant),
      initiative_map: sanitizedMap,
      current_turn_index: adjustTurnIndex(event.current_turn_index, allCombatants),
      round_number: event.round_number,
      encounter_id: event.encounter_id,
    };
    return result;
  }

  // Hidden change: safety net — block raw state
  if (event.type === "combat:hidden_change") {
    return {
      type: "combat:combatant_remove",
      combatant_id: event.combatant_id,
    } as SanitizedEvent;
  }

  // State sync: filter hidden, adjust turn index
  if (event.type === "session:state_sync") {
    const visible = event.combatants.filter((c) => !c.is_hidden);

    let adjustedTurnIndex = event.current_turn_index;
    const turnCombatant = event.combatants[event.current_turn_index];
    if (turnCombatant) {
      if (turnCombatant.is_hidden) {
        adjustedTurnIndex = -1;
      } else {
        const visibleIdx = visible.findIndex((c) => c.id === turnCombatant.id);
        adjustedTurnIndex = visibleIdx >= 0 ? visibleIdx : event.current_turn_index;
      }
    }

    const result: SanitizedStateSync = {
      type: event.type,
      combatants: visible.map(sanitizeCombatant),
      current_turn_index: adjustedTurnIndex,
      round_number: event.round_number,
      ...(event.encounter_id ? { encounter_id: event.encounter_id } : {}),
    };
    return result;
  }

  // Initiative reorder: filter hidden, adjust turn index
  if (event.type === "combat:initiative_reorder") {
    const visible = event.combatants.filter((c) => !c.is_hidden);
    const result: SanitizedInitiativeReorder = {
      type: event.type,
      combatants: visible.map(sanitizeCombatant),
      current_turn_index: adjustTurnIndex(event.current_turn_index, event.combatants),
    };
    return result;
  }

  // HP update: full data for players, status-only for monsters
  if (event.type === "combat:hp_update") {
    if (event.is_player) {
      // Suppress HP updates for hidden player-characters
      const hiddenCheck = allCombatants?.find((c) => c.id === event.combatant_id);
      if (hiddenCheck?.is_hidden) return null;

      const result: SanitizedPlayerHpUpdate = {
        type: event.type,
        combatant_id: event.combatant_id,
        current_hp: event.current_hp,
        temp_hp: event.temp_hp,
        max_hp: event.max_hp,
        hp_status: event.max_hp
          ? getHpStatus(event.current_hp, event.max_hp)
          : undefined,
        death_saves: event.death_saves,
      };
      return result;
    }
    const maxHp = event.max_hp ?? event.current_hp;
    const result: SanitizedMonsterHpUpdate = {
      type: event.type,
      combatant_id: event.combatant_id,
      hp_status: getHpStatus(event.current_hp, maxHp),
      hp_percentage: getHpPercentage(event.current_hp, maxHp),
    };
    return result;
  }

  // Stats update: hide real name for non-players
  if (event.type === "combat:stats_update") {
    const visibleName = event.is_player
      ? event.name
      : event.display_name !== undefined
        ? event.display_name || undefined
        : undefined;
    const result: SanitizedStatsUpdate = {
      type: event.type,
      combatant_id: event.combatant_id,
      name: visibleName,
    };
    return result;
  }

  // Reaction toggle: pass through (players see reaction state), but suppress for hidden
  if (event.type === "combat:reaction_toggle") {
    const combatant = allCombatants?.find((c) => c.id === event.combatant_id);
    if (combatant?.is_hidden) return null;
    return event;
  }

  // Per-combatant events for hidden combatants — suppress
  const combatantTargetedTypes = [
    "combat:hp_update",
    "combat:condition_change",
    "combat:defeated_change",
    "combat:stats_update",
    "combat:player_notes_update",
    "combat:version_switch",
  ];
  if (combatantTargetedTypes.includes(event.type) && "combatant_id" in event) {
    const combatant = allCombatants?.find(
      (c) => c.id === (event as { combatant_id: string }).combatant_id
    );
    if (combatant?.is_hidden) return null;
  }

  // Everything else passes through unchanged
  return event;
}

/** B-2: Stable opaque placeholder ID for a hidden combatant.
 *  Deterministic FNV-1a hash so the same hidden combatant maps to the same
 *  placeholder on every broadcast. Pairs with the client helper in broadcast.ts. */
function maskHiddenId(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `hidden:${h.toString(36)}`;
}

/** B-2: Sanitize initiative_map server-side.
 *  Replaces hidden combatants' real IDs with opaque placeholders. */
export function sanitizeInitiativeMapForPlayers(
  map: ReadonlyArray<{ id: string; initiative_order: number | null }>,
  allCombatants?: Combatant[],
): Array<{ id: string; initiative_order: number | null; is_hidden?: true }> {
  if (!allCombatants) {
    // Without knowledge of which combatants are hidden, we cannot safely sanitize.
    // Pass through — callers must ensure allCombatants is provided for any event
    // whose payload carries an initiative_map referencing potentially-hidden IDs.
    return map.map((e) => ({ id: e.id, initiative_order: e.initiative_order }));
  }
  const hiddenIds = new Set(allCombatants.filter((c) => c.is_hidden).map((c) => c.id));
  return map.map((entry) => {
    if (hiddenIds.has(entry.id)) {
      return { id: maskHiddenId(entry.id), initiative_order: entry.initiative_order, is_hidden: true };
    }
    return { id: entry.id, initiative_order: entry.initiative_order };
  });
}

function adjustTurnIndex(dmIndex: number, allCombatants?: Combatant[]): number {
  if (!allCombatants) return dmIndex;
  const turnCombatant = allCombatants[dmIndex];
  if (!turnCombatant) return dmIndex;
  if (turnCombatant.is_hidden) return -1;
  let visibleIdx = 0;
  for (let i = 0; i < dmIndex; i++) {
    if (!allCombatants[i].is_hidden) visibleIdx++;
  }
  return visibleIdx;
}

// ── Server-side event validation ─────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEventData(event: RealtimeEvent): ValidationError | null {
  if (!event.type) {
    return { field: "type", message: "Event type is required" };
  }

  switch (event.type) {
    case "combat:hp_update":
      if (!Number.isFinite(event.current_hp) || event.current_hp < 0) {
        return { field: "current_hp", message: "HP must be a finite non-negative number" };
      }
      if (!event.combatant_id) {
        return { field: "combatant_id", message: "Combatant ID is required" };
      }
      break;

    case "combat:turn_advance":
      if (event.current_turn_index < 0) {
        return { field: "current_turn_index", message: "Turn index must be >= 0" };
      }
      if (event.round_number < 1) {
        return { field: "round_number", message: "Round number must be >= 1" };
      }
      break;

    case "combat:condition_change":
      if (!event.combatant_id) {
        return { field: "combatant_id", message: "Combatant ID is required" };
      }
      if (!Array.isArray(event.conditions)) {
        return { field: "conditions", message: "Conditions must be an array" };
      }
      break;

    case "combat:combatant_add":
      if (!event.combatant?.name) {
        return { field: "combatant.name", message: "Combatant name is required" };
      }
      break;

    case "combat:reaction_toggle":
      if (!event.combatant_id) {
        return { field: "combatant_id", message: "Combatant ID is required" };
      }
      if (typeof event.reaction_used !== "boolean") {
        return { field: "reaction_used", message: "reaction_used must be a boolean" };
      }
      break;
  }

  return null;
}
