import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";

/**
 * Full state reconciliation — pushes the entire DM Zustand state to Supabase
 * via an atomic RPC (single transaction).
 *
 * Merge modes:
 * - "overwrite": DM state wins entirely (used for normal reconnect)
 * - "merge_newer": Smart merge — keeps player HP from DB for is_player combatants
 *   (used when DM was offline and players may have self-healed via C.13)
 *
 * The RPC handles all 3 steps atomically:
 * 1. Upsert all combatants from Zustand
 * 2. Delete combatants removed during offline
 * 3. Update encounter turn/round state
 */
export async function reconcileFullState(
  encounterId: string,
  combatants: Combatant[],
  roundNumber: number,
  currentTurnIndex: number,
  isActive: boolean,
  mergeMode: "overwrite" | "merge_newer" = "merge_newer",
  forceDeleteIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Filter out synthetic lair action entries — they are client-side only
    const rows = combatants.filter((c) => !c.is_lair_action).map((c) => ({
      id: c.id,
      encounter_id: encounterId,
      name: c.name,
      current_hp: c.current_hp,
      max_hp: c.max_hp,
      temp_hp: c.temp_hp,
      ac: c.ac,
      spell_save_dc: c.spell_save_dc,
      initiative: c.initiative,
      initiative_order: c.initiative_order,
      conditions: c.conditions,
      is_defeated: c.is_defeated,
      is_player: c.is_player,
      is_hidden: c.is_hidden,
      monster_id: c.monster_id,
      display_name: c.display_name ?? null,
      monster_group_id: c.monster_group_id ?? null,
      group_order: c.group_order ?? null,
      dm_notes: c.dm_notes ?? "",
      player_notes: c.player_notes ?? "",
      player_character_id: c.player_character_id ?? null,
      ruleset_version: c.ruleset_version,
      // C1/C2: Persist combat mechanics fields that were previously missing
      condition_durations: c.condition_durations ?? {},
      death_saves: c.death_saves ?? null,
      legendary_actions_total: c.legendary_actions_total ?? null,
      legendary_actions_used: c.legendary_actions_used ?? 0,
      // B2: Preserve token link during offline reconciliation
      session_token_id: c.session_token_id ?? null,
    }));

    const { error } = await supabase.rpc("reconcile_combat_state", {
      p_encounter_id: encounterId,
      p_combatants: rows,
      p_round_number: roundNumber,
      p_current_turn_index: currentTurnIndex,
      p_is_active: isActive,
      p_merge_mode: mergeMode,
      p_force_delete_ids: forceDeleteIds,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown sync error",
    };
  }
}
