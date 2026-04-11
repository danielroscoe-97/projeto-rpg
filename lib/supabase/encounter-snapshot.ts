import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";
import type { PlayerCharacter } from "@/lib/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartyMemberSnapshot {
  member_id: string;
  name: string;
  level: number | null;
  class: string | null;
  race: string | null;
  /** AC at end of combat (for difficulty analysis) */
  ac?: number;
  /** Max HP (for difficulty analysis) */
  max_hp?: number;
  /** Current HP at end of combat (for difficulty analysis — how beaten up was the party?) */
  current_hp?: number;
  /** Initiative roll value */
  initiative?: number | null;
}

export interface CreatureSnapshot {
  name: string;
  cr: string | null;
  slug: string | null;
  source: string | null;
  quantity: number;
  was_defeated: boolean;
  /** Individual creature details for granular difficulty analysis */
  individuals?: {
    name: string;
    max_hp: number;
    current_hp: number;
    ac: number;
    is_defeated: boolean;
    initiative: number | null;
  }[];
}

export type CombatResult = "victory" | "tpk" | "fled" | "dm_ended";

/** Lightweight snapshot of all combatants at combat start — for difficulty analysis delta. */
export interface CombatStartSnapshot {
  /** Encounter this snapshot belongs to — used to validate against stale localStorage data. */
  encounter_id?: string;
  combatants: {
    id: string;
    name: string;
    is_player: boolean;
    max_hp: number;
    current_hp: number;
    ac: number;
    initiative: number | null;
    monster_id: string | null;
    monster_group_id: string | null;
  }[];
  round: number;
  timestamp: number;
}

export interface EncounterSnapshotData {
  party_snapshot: PartyMemberSnapshot[];
  creatures_snapshot: CreatureSnapshot[];
  combat_result: CombatResult;
  ended_at: string;
  has_manual_creatures: boolean;
  has_unknown_cr: boolean;
  has_incomplete_party: boolean;
  /** CTA-10: Total combat duration in seconds */
  duration_seconds?: number;
  /** CTA-10: Per-combatant turn time { combatant_id: milliseconds } */
  turn_time_data?: Record<string, number>;
  /** Snapshot of all combatants at combat start — for difficulty analysis (HP delta, etc.) */
  combat_start_snapshot?: CombatStartSnapshot;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detect combat result from combatant defeated states.
 * - All monsters defeated → 'victory'
 * - All PCs defeated → 'tpk'
 * - Otherwise → 'dm_ended'
 */
export function detectCombatResult(combatants: Combatant[]): CombatResult {
  const monsters = combatants.filter((c) => !c.is_player && !c.is_lair_action);
  const players = combatants.filter((c) => c.is_player);

  const allMonstersDefeated = monsters.length > 0 && monsters.every((c) => c.is_defeated);
  const allPlayersDefeated = players.length > 0 && players.every((c) => c.is_defeated);

  if (allMonstersDefeated) return "victory";
  if (allPlayersDefeated) return "tpk";
  return "dm_ended";
}

/**
 * Build party snapshot from player combatants.
 * When playerChars is provided, enriches with level/class/race from the player_characters table.
 */
export function buildPartySnapshot(
  combatants: Combatant[],
  playerChars?: PlayerCharacter[],
): PartyMemberSnapshot[] {
  return combatants
    .filter((c) => c.is_player)
    .map((c) => {
      const pc = playerChars?.find((p) => p.id === c.player_character_id);
      return {
        member_id: c.player_character_id ?? c.id,
        name: c.name,
        level: pc?.level ?? null,
        class: pc?.class ?? null,
        race: pc?.race ?? null,
        ac: c.ac,
        max_hp: c.max_hp,
        current_hp: c.current_hp,
        initiative: c.initiative,
      };
    });
}

/**
 * Build creatures snapshot from non-player combatants, grouped by base name.
 * Groups monsters with the same monster_id (or name if no monster_id) together.
 */
export function buildCreaturesSnapshot(combatants: Combatant[]): CreatureSnapshot[] {
  const creatures = combatants.filter((c) => !c.is_player && !c.is_lair_action);
  const groups = new Map<string, { combatants: Combatant[]; key: string }>();

  for (const c of creatures) {
    // Group by monster_id if available, else by base name (strip trailing numbers)
    const key = c.monster_id ?? c.name.replace(/\s+\d+$/, "");
    const existing = groups.get(key);
    if (existing) {
      existing.combatants.push(c);
    } else {
      groups.set(key, { combatants: [c], key });
    }
  }

  return Array.from(groups.values()).map((group) => {
    const first = group.combatants[0];
    return {
      name: first.name.replace(/\s+\d+$/, ""), // Base name without number suffix
      cr: null, // CR not on Combatant — use slug for server-side lookup at analytics time
      slug: first.monster_id,
      source: first.ruleset_version ?? null,
      quantity: group.combatants.length,
      was_defeated: group.combatants.every((c) => c.is_defeated),
      individuals: group.combatants.map((c) => ({
        name: c.name,
        max_hp: c.max_hp,
        current_hp: c.current_hp,
        ac: c.ac,
        is_defeated: c.is_defeated,
        initiative: c.initiative,
      })),
    };
  });
}

/**
 * Compute data quality flags from combatants.
 * When playerChars is provided, checks actual class/level data instead of just link existence.
 */
export function computeDataQualityFlags(
  combatants: Combatant[],
  playerChars?: PlayerCharacter[],
): {
  has_manual_creatures: boolean;
  has_unknown_cr: boolean;
  has_incomplete_party: boolean;
} {
  const creatures = combatants.filter((c) => !c.is_player && !c.is_lair_action);
  const players = combatants.filter((c) => c.is_player);

  return {
    has_manual_creatures: creatures.some((c) => !c.monster_id),
    // Manual creatures have no SRD link, so CR is unknown. SRD creatures (with monster_id)
    // always have a known CR via slug lookup, even though we can't populate it client-side.
    has_unknown_cr: creatures.some((c) => !c.monster_id),
    has_incomplete_party: playerChars
      ? players.some((c) => {
          if (!c.player_character_id) return true;
          const pc = playerChars.find((p) => p.id === c.player_character_id);
          return !pc || !pc.class || pc.level == null;
        })
      : players.some((c) => !c.player_character_id),
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/**
 * Persist encounter snapshot data (fire-and-forget on end combat).
 * Called by proceedAfterNaming() after the encounter name is set.
 */
export async function persistEncounterSnapshot(
  encounterId: string,
  data: EncounterSnapshotData
): Promise<void> {
  const supabase = createClient();
  const updatePayload: Record<string, unknown> = {
    party_snapshot: data.party_snapshot,
    creatures_snapshot: data.creatures_snapshot,
    combat_result: data.combat_result,
    // started_at is set server-side in persistInitiativeAndStartCombat — not overwritten here
    ended_at: data.ended_at,
    has_manual_creatures: data.has_manual_creatures,
    has_unknown_cr: data.has_unknown_cr,
    has_incomplete_party: data.has_incomplete_party,
  };
  // CTA-10: Include time analytics when available
  if (data.duration_seconds != null) updatePayload.duration_seconds = data.duration_seconds;
  if (data.turn_time_data) updatePayload.turn_time_data = data.turn_time_data;
  // Include start-of-combat snapshot for difficulty analysis (HP delta, party state at start)
  if (data.combat_start_snapshot) updatePayload.combat_start_snapshot = data.combat_start_snapshot;

  const { error } = await supabase
    .from("encounters")
    .update(updatePayload)
    .eq("id", encounterId);

  if (error) {
    console.error("[encounter-snapshot] Failed to persist snapshot:", error.message);
  }
}

/**
 * Persist DM post-combat feedback (rating + optional notes).
 * Called by DmPostCombatFeedback component on submit.
 */
export async function persistDmFeedback(
  encounterId: string,
  rating: number,
  notes: string
): Promise<void> {
  const supabase = createClient();
  const updateData: Record<string, unknown> = {
    dm_difficulty_rating: rating,
  };
  if (notes.trim()) {
    updateData.dm_notes = notes.trim();
  }

  const { error } = await supabase
    .from("encounters")
    .update(updateData)
    .eq("id", encounterId);

  if (error) {
    console.error("[encounter-snapshot] Failed to persist DM feedback:", error.message);
  }
}
