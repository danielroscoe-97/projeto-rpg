import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";

/**
 * Full state reconciliation — pushes the entire DM Zustand state to Supabase.
 * Used when reconnecting after an offline period to ensure DB matches DM's UI.
 *
 * Strategy: upsert all combatants (covers any HP/condition/defeated changes)
 * + update encounter turn/round state. Single bulk operation.
 */
export async function reconcileFullState(
  encounterId: string,
  combatants: Combatant[],
  roundNumber: number,
  currentTurnIndex: number,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // 1. Bulk upsert all combatants — this covers every possible field change
    if (combatants.length > 0) {
      const rows = combatants.map((c) => ({
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
        monster_id: c.monster_id,
        display_name: c.display_name ?? null,
        monster_group_id: c.monster_group_id ?? null,
        group_order: c.group_order ?? null,
        dm_notes: c.dm_notes ?? "",
        player_notes: c.player_notes ?? "",
        player_character_id: c.player_character_id ?? null,
        ruleset_version: c.ruleset_version,
      }));

      const { error: upsertError } = await supabase
        .from("combatants")
        .upsert(rows, { onConflict: "id" });

      if (upsertError) {
        return { success: false, error: upsertError.message };
      }
    }

    // 2. Update encounter state (turn, round, active)
    const { error: encounterError } = await supabase
      .from("encounters")
      .update({
        current_turn_index: currentTurnIndex,
        round_number: roundNumber,
        is_active: isActive,
      })
      .eq("id", encounterId);

    if (encounterError) {
      return { success: false, error: encounterError.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown sync error",
    };
  }
}
