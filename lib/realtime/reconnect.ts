import { createClient } from "@/lib/supabase/client";
import type { Combatant } from "@/lib/types/combat";

export interface SessionSnapshot {
  combatants: Combatant[];
  current_turn_index: number;
  round_number: number;
  is_active: boolean;
}

/**
 * Fetch the latest session state from the DB for reconciliation on reconnect.
 * This is the "source of truth" when Realtime is unavailable.
 */
export async function fetchSessionSnapshot(
  encounterId: string
): Promise<SessionSnapshot | null> {
  const supabase = createClient();

  const { data: encounter, error: encError } = await supabase
    .from("encounters")
    .select("round_number, current_turn_index, is_active")
    .eq("id", encounterId)
    .single();

  if (encError || !encounter) return null;

  const { data: rawCombatants } = await supabase
    .from("combatants")
    .select(
      "id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative, initiative_order, conditions, ruleset_version, is_defeated, is_player, monster_id, display_name, monster_group_id, group_order, dm_notes, player_notes, player_character_id"
    )
    .eq("encounter_id", encounterId)
    .order("initiative_order", { ascending: true });

  const combatants: Combatant[] = (rawCombatants ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    current_hp: row.current_hp,
    max_hp: row.max_hp,
    temp_hp: row.temp_hp ?? 0,
    ac: row.ac,
    spell_save_dc: row.spell_save_dc ?? null,
    initiative: row.initiative ?? null,
    initiative_order: row.initiative_order ?? null,
    conditions: row.conditions ?? [],
    ruleset_version: row.ruleset_version ?? null,
    is_defeated: row.is_defeated ?? false,
    is_hidden: (row as Record<string, unknown>).is_hidden as boolean ?? false,
    is_player: row.is_player ?? false,
    monster_id: row.monster_id ?? null,
    token_url: null,
    creature_type: null,
    display_name: row.display_name ?? null,
    monster_group_id: row.monster_group_id ?? null,
    group_order: row.group_order ?? null,
    dm_notes: row.dm_notes ?? '',
    player_notes: row.player_notes ?? '',
    player_character_id: row.player_character_id ?? null,
  }));

  return {
    combatants,
    current_turn_index: encounter.current_turn_index ?? 0,
    round_number: encounter.round_number ?? 1,
    is_active: encounter.is_active ?? false,
  };
}
