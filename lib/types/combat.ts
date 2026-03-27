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
  /** URL to the monster's token image (webp from 5e.tools), null for custom NPCs and players */
  token_url: string | null;
  /** Creature type for emoji fallback (e.g. "dragon", "undead"), null for players */
  creature_type: string | null;
  /** Custom display name visible to players (anti-metagaming). Null = use real name. */
  display_name: string | null;
  /** Group ID for monster grouping. Null = ungrouped. */
  monster_group_id: string | null;
  /** Order within a monster group (1-based). Null = ungrouped. */
  group_order: number | null;
  /** Private DM notes — never broadcast to players */
  dm_notes: string;
  /** Player-visible notes — broadcast via realtime */
  player_notes: string;
  /** Linked player_character ID (DM links temp player to campaign character). Null = unlinked. */
  player_character_id: string | null;
}

export interface HpUndoEntry {
  combatantId: string;
  previousHp: number;
  previousTempHp: number;
  action: "damage" | "heal" | "temp";
}

export interface EncounterState {
  encounter_id: string | null;
  session_id: string | null;
  encounter_name: string;
  combatants: Combatant[];
  round_number: number;
  current_turn_index: number;
  is_active: boolean;
  is_loading: boolean;
  error: string | null;
  hpUndoStack: HpUndoEntry[];
  /** ID of the last combatant added mid-combat (for undo). */
  lastAddedCombatantId: string | null;
  /** Client-side only: which monster groups are expanded (default collapsed). */
  expandedGroups: Record<string, boolean>;
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
  /** Batch-set initiative for multiple combatants in a single update (avoids N re-sorts). */
  batchSetInitiatives: (entries: Array<{ id: string; value: number }>) => void;
  /** Replace the combatant list with a manually reordered array and re-assign initiative_order. */
  reorderCombatants: (newOrder: Combatant[]) => void;
  /** Mark the encounter as active and set current_turn_index = 0. */
  startCombat: () => void;
  /** Hydrate the store with server-fetched combatants, preserving their DB ids. */
  hydrateCombatants: (combatants: Combatant[]) => void;
  /** Advance to the next non-defeated combatant, incrementing round_number if the list wraps. No-op if all defeated. */
  advanceTurn: () => void;
  /** Hydrate active combat state from server on page load (preserves real turn/round, avoids startCombat resetting to 0). */
  hydrateActiveState: (currentTurnIndex: number, roundNumber: number) => void;
  /** Apply damage to a combatant. Temp HP absorbs first, then current HP (min 0). */
  applyDamage: (id: string, amount: number) => void;
  /** Apply healing to a combatant. Cannot exceed max HP. Does not affect temp HP. */
  applyHealing: (id: string, amount: number) => void;
  /** Set temporary HP for a combatant. Only replaces if new value is higher than current temp HP. */
  setTempHp: (id: string, value: number) => void;
  /** Toggle a condition on a combatant (add if missing, remove if present). */
  toggleCondition: (id: string, condition: string) => void;
  /** Mark a combatant as defeated (or un-defeat). */
  setDefeated: (id: string, is_defeated: boolean) => void;
  /** Update a combatant's editable stats (name, display_name, max_hp, ac, spell_save_dc). Caps current_hp to new max_hp. */
  updateCombatantStats: (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  /** Switch a combatant's ruleset version. */
  setRulesetVersion: (id: string, version: RulesetVersion) => void;
  /** Update DM-only notes for a combatant. */
  updateDmNotes: (id: string, notes: string) => void;
  /** Update player-visible notes for a combatant. */
  updatePlayerNotes: (id: string, notes: string) => void;
  /** Undo the last HP change from the undo stack. */
  undoLastHpChange: () => void;
  /** Add multiple monsters of the same type as a named group. */
  addMonsterGroup: (combatants: Omit<Combatant, "id">[]) => void;
  /** Set initiative for all members of a monster group at once. */
  setGroupInitiative: (groupId: string, value: number) => void;
  /** Toggle expand/collapse state for a monster group (client-side only). */
  toggleGroupExpanded: (groupId: string) => void;
  /** Link a temp player to a campaign character (loads stats). */
  linkCharacter: (combatantId: string, characterId: string, stats: { name: string; max_hp: number; ac: number; spell_save_dc: number | null }) => void;
  /** Unlink a player from their campaign character. */
  unlinkCharacter: (combatantId: string) => void;
  /** Undo the last mid-combat combatant addition (removes combatant). Returns removed ID or null. */
  undoLastAdd: () => string | null;
}
