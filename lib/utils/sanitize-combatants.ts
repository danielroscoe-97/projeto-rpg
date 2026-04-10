import { getHpStatus, getHpPercentage } from "@/lib/utils/hp-status";

/** Raw combatant row as returned from the DB select. */
export interface RawCombatantRow {
  id: string;
  name: string;
  display_name: string | null;
  current_hp: number;
  max_hp: number;
  temp_hp: number;
  ac: number;
  spell_save_dc: number | null;
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  is_hidden: boolean;
  monster_id: string | null;
  ruleset_version: string | null;
  monster_group_id: string | null;
  group_order: number | null;
  /** Turn count per condition. Exposed to players for their own characters and other players. */
  condition_durations?: Record<string, number> | null;
  /** Death saves — only meaningful for player characters at 0 HP. */
  death_saves?: { successes: number; failures: number } | null;
  /** Linked session_token ID — for ID-based reconnection. */
  session_token_id?: string | null;
}

/**
 * Sanitize combatants for the player-facing state endpoint.
 *
 * - Filters out hidden combatants (is_hidden)
 * - Strips monster stats (hp, ac, temp_hp) — replaces with hp_status label
 * - Applies display_name anti-metagaming (alias replaces real name for monsters)
 * - Removes internal fields (display_name, is_hidden) from response
 */
export function sanitizeCombatantsForPlayer(combatants: RawCombatantRow[]) {
  return combatants
    .filter((c) => !c.is_hidden)
    .map((c, index) => {
      // R4: Re-assign sequential initiative_order after filtering hidden combatants.
      // This eliminates collisions from the DB (e.g. failed persists during 504s).
      if (c.is_player) {
        const { display_name: _dn, is_hidden: _h, ...rest } = c;
        return { ...rest, initiative_order: index };
      }
      const { current_hp, max_hp, temp_hp: _temp_hp, ac: _ac, spell_save_dc: _dc, display_name, is_hidden: _h, condition_durations: _cd, session_token_id: _st, ...rest } = c;
      return {
        ...rest,
        initiative_order: index,
        // Anti-metagaming: replace real name with display_name if set
        name: display_name || rest.name,
        hp_status: getHpStatus(current_hp, max_hp),
        hp_percentage: getHpPercentage(current_hp, max_hp),
        // condition_durations intentionally omitted for monsters (DM-only)
      };
    });
}
