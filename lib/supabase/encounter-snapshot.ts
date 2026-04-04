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
}

export interface CreatureSnapshot {
  name: string;
  cr: string | null;
  slug: string | null;
  source: string | null;
  quantity: number;
  was_defeated: boolean;
}

export type CombatResult = "victory" | "tpk" | "fled" | "dm_ended";

export interface EncounterSnapshotData {
  party_snapshot: PartyMemberSnapshot[];
  creatures_snapshot: CreatureSnapshot[];
  combat_result: CombatResult;
  started_at: string | null;
  ended_at: string;
  has_manual_creatures: boolean;
  has_unknown_cr: boolean;
  has_incomplete_party: boolean;
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
  const { error } = await supabase
    .from("encounters")
    .update({
      party_snapshot: data.party_snapshot,
      creatures_snapshot: data.creatures_snapshot,
      combat_result: data.combat_result,
      started_at: data.started_at,
      ended_at: data.ended_at,
      has_manual_creatures: data.has_manual_creatures,
      has_unknown_cr: data.has_unknown_cr,
      has_incomplete_party: data.has_incomplete_party,
    })
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
