import type { Combatant } from "@/lib/types/combat";
import type { SrdMonster } from "@/lib/srd/srd-loader";

/** The fixed initiative count for lair actions per D&D 5e rules. */
export const LAIR_ACTION_INITIATIVE = 20;

/** Display name for the lair action combatant. */
export const LAIR_ACTION_NAME = "Lair Actions";

/** Check if a monster has lair actions. */
export function hasLairActions(monster: SrdMonster): boolean {
  return (monster.lair_actions?.length ?? 0) > 0;
}

/** Check if a combatant list already has a lair action entry. */
export function hasLairActionEntry(combatants: Combatant[]): boolean {
  return combatants.some((c) => c.is_lair_action);
}

/** Check if any non-defeated combatant in the list is a lair-capable monster. */
export function hasAnyLairMonster(combatants: Combatant[], getMonster: (id: string) => SrdMonster | null): boolean {
  return combatants.some((c) => {
    if (c.is_lair_action || c.is_defeated || !c.monster_id) return false;
    const monster = getMonster(c.monster_id);
    return monster ? hasLairActions(monster) : false;
  });
}

/** Create the synthetic lair action combatant (without id — store will assign). */
export function createLairActionCombatant(): Omit<Combatant, "id"> {
  return {
    name: LAIR_ACTION_NAME,
    current_hp: 0,
    max_hp: 0,
    temp_hp: 0,
    ac: 0,
    spell_save_dc: null,
    initiative: LAIR_ACTION_INITIATIVE,
    initiative_breakdown: null,
    initiative_order: null,
    conditions: [],
    ruleset_version: null,
    is_defeated: false,
    is_hidden: true,
    is_player: false,
    monster_id: null,
    token_url: null,
    creature_type: null,
    display_name: null,
    monster_group_id: null,
    group_order: null,
    dm_notes: "",
    player_notes: "",
    player_character_id: null,
    combatant_role: null,
    legendary_actions_total: null,
    legendary_actions_used: 0,
    is_lair_action: true,
  };
}
