import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";
import { trackEvent } from "@/lib/analytics/track";

/** Persists initiative values + order for all combatants, then marks encounter active. */
export async function persistInitiativeAndStartCombat(
  encounterId: string,
  combatants: Combatant[]
): Promise<void> {
  const supabase = createClient();

  // Update each combatant's initiative and order
  await Promise.all(
    combatants.map((c) =>
      supabase
        .from("combatants")
        .update({
          initiative: c.initiative,
          initiative_order: c.initiative_order,
        })
        .eq("id", c.id)
    )
  );

  // Mark encounter as active
  const { error } = await supabase
    .from("encounters")
    .update({ is_active: true })
    .eq("id", encounterId);

  if (error) throw new Error(error.message);

  trackEvent("combat:started", {
    encounter_id: encounterId,
    combatant_count: combatants.length,
  });
}

/** Persists HP changes (current_hp, temp_hp) for a combatant. */
export async function persistHpChange(
  combatantId: string,
  currentHp: number,
  tempHp: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .update({ current_hp: currentHp, temp_hp: tempHp })
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists conditions array for a combatant. */
export async function persistConditions(
  combatantId: string,
  conditions: string[]
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .update({ conditions })
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists is_defeated flag for a combatant. */
export async function persistDefeated(
  combatantId: string,
  isDefeated: boolean
): Promise<void> {
  const supabase = createClient();
  const updateData: Record<string, unknown> = { is_defeated: isDefeated };
  if (isDefeated) updateData.current_hp = 0;
  const { error } = await supabase
    .from("combatants")
    .update(updateData)
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists editable stats for a combatant. */
export async function persistCombatantStats(
  combatantId: string,
  stats: { name?: string; display_name?: string | null; max_hp?: number; current_hp?: number; ac?: number; spell_save_dc?: number | null }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .update(stats)
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists ruleset_version for a combatant. */
export async function persistRulesetVersion(
  combatantId: string,
  rulesetVersion: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .update({ ruleset_version: rulesetVersion })
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Inserts a new combatant into the DB for an existing encounter. */
export async function persistNewCombatant(
  encounterId: string,
  combatant: {
    id: string;
    name: string;
    current_hp: number;
    max_hp: number;
    temp_hp: number;
    ac: number;
    spell_save_dc: number | null;
    initiative: number | null;
    initiative_order: number | null;
    conditions: string[];
    ruleset_version: string | null;
    is_defeated: boolean;
    is_player: boolean;
    monster_id: string | null;
    display_name?: string | null;
    monster_group_id?: string | null;
    group_order?: number | null;
    dm_notes?: string;
    player_notes?: string;
    player_character_id?: string | null;
  }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .upsert({
      id: combatant.id,
      encounter_id: encounterId,
      name: combatant.name,
      current_hp: combatant.current_hp,
      max_hp: combatant.max_hp,
      temp_hp: combatant.temp_hp,
      ac: combatant.ac,
      spell_save_dc: combatant.spell_save_dc,
      initiative: combatant.initiative,
      initiative_order: combatant.initiative_order,
      conditions: combatant.conditions,
      ruleset_version: combatant.ruleset_version,
      is_defeated: combatant.is_defeated,
      is_player: combatant.is_player,
      monster_id: combatant.monster_id,
      display_name: combatant.display_name ?? null,
      monster_group_id: combatant.monster_group_id ?? null,
      group_order: combatant.group_order ?? null,
      dm_notes: combatant.dm_notes ?? '',
      player_notes: combatant.player_notes ?? '',
      player_character_id: combatant.player_character_id ?? null,
    });
  if (error) throw new Error(error.message);
}

/** Deletes a combatant from the DB. */
export async function persistRemoveCombatant(
  combatantId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .delete()
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists initiative_order for all combatants (used after mid-combat reorder). */
export async function persistInitiativeOrder(
  combatants: { id: string; initiative_order: number | null; initiative?: number | null }[]
): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    combatants.map((c) => {
      const fields: Record<string, unknown> = { initiative_order: c.initiative_order };
      if (c.initiative !== undefined) fields.initiative = c.initiative;
      return supabase.from("combatants").update(fields).eq("id", c.id);
    })
  );
}

/** Marks an encounter as completed (is_active = false) and syncs final HP/conditions back to player_characters. */
export async function persistEndEncounter(
  encounterId: string,
  stats?: { rounds_total?: number; duration_seconds?: number; combatants_defeated?: number }
): Promise<void> {
  const supabase = createClient();

  // Best-effort sync: copy final HP/conditions from combatants back to player_characters
  // so Player HQ reflects post-combat state. Failures here must NOT block encounter end.
  try {
    const { data: playerCombatants } = await supabase
      .from("combatants")
      .select("player_character_id, current_hp, max_hp, temp_hp, ac, conditions")
      .eq("encounter_id", encounterId)
      .not("player_character_id", "is", null);

    const linked = (playerCombatants ?? []).filter((c) => c.player_character_id);
    if (linked.length > 0) {
      await Promise.all(
        linked.map((c) =>
          supabase
            .from("player_characters")
            .update({
              current_hp: c.current_hp,
              max_hp: c.max_hp,
              hp_temp: c.temp_hp,
              ac: c.ac,
              conditions: c.conditions,
            })
            .eq("id", c.player_character_id!)
        )
      );
    }
  } catch {
    // Best-effort: log but don't block encounter end
    console.error("[persistEndEncounter] Failed to sync player_characters — continuing");
  }

  const { error } = await supabase
    .from("encounters")
    .update({ is_active: false })
    .eq("id", encounterId);
  if (error) throw new Error(error.message);

  trackEvent("combat:ended", {
    encounter_id: encounterId,
    ...stats,
  });
}

/** Persists DM-only notes for a combatant (never broadcast). */
export async function persistDmNotes(
  combatantId: string,
  dmNotes: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .update({ dm_notes: dmNotes })
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists player-visible notes for a combatant. */
export async function persistPlayerNotes(
  combatantId: string,
  playerNotes: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("combatants")
    .update({ player_notes: playerNotes })
    .eq("id", combatantId);
  if (error) throw new Error(error.message);
}

/** Persists current_turn_index and round_number after a turn advance. */
export async function persistTurnAdvance(
  encounterId: string,
  currentTurnIndex: number,
  roundNumber: number
): Promise<void> {
  const supabase = createClient();
  const { error, data } = await supabase
    .from("encounters")
    .update({ current_turn_index: currentTurnIndex, round_number: roundNumber })
    .eq("id", encounterId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Encounter not found.");
}
