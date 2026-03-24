import type { RulesetVersion } from "./database";

export interface Combatant {
  /** Client-side UUID (pre-persist). Matches DB id after save. */
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
  ruleset_version: RulesetVersion | null;
  is_defeated: boolean;
  is_player: boolean;
  /** SRD monster id (from public/srd/*.json), null for custom NPCs and players */
  monster_id: string | null;
}

export interface EncounterState {
  encounter_id: string | null;
  session_id: string | null;
  combatants: Combatant[];
  round_number: number;
  current_turn_index: number;
  is_active: boolean;
  is_loading: boolean;
  error: string | null;
}

export interface CombatActions {
  addCombatant: (combatant: Omit<Combatant, "id">) => void;
  removeCombatant: (id: string) => void;
  clearEncounter: () => void;
  setEncounterId: (encounter_id: string, session_id: string) => void;
  setError: (error: string | null) => void;
  setLoading: (is_loading: boolean) => void;
  /** Update a single combatant's initiative value and re-sort the list. */
  setInitiative: (id: string, value: number | null) => void;
  /** Replace the combatant list with a manually reordered array and re-assign initiative_order. */
  reorderCombatants: (newOrder: Combatant[]) => void;
  /** Mark the encounter as active and set current_turn_index = 0. */
  startCombat: () => void;
  /** Hydrate the store with server-fetched combatants, preserving their DB ids. */
  hydrateCombatants: (combatants: Combatant[]) => void;
}
