import type { RulesetVersion } from "./database";

/** Visual role tag for manually-added combatants (not persisted to DB yet). */
export type CombatantRole = "player" | "npc" | "summon" | "monster";

/** Ordered cycle: Jogador → NPC → Invocação → Monstro → Jogador */
export const COMBATANT_ROLE_CYCLE: CombatantRole[] = ["player", "npc", "summon", "monster"];

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
  /** Client-side only: d20 roll + modifier breakdown for DM auditing. Not persisted to DB. */
  initiative_breakdown?: { roll: number; modifier: number } | null;
  initiative_order: number | null;
  conditions: string[];
  ruleset_version: RulesetVersion | null;
  is_defeated: boolean;
  /** Hidden from player view — DM-only visibility until revealed. Default: false. */
  is_hidden: boolean;
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
  /** Visual role for manually-added combatants. Null = from compendium (has monster_id). */
  combatant_role: CombatantRole | null;
  /** Death saving throws for player-type creatures at 0 HP. */
  death_saves?: { successes: number; failures: number };
  /** Tracks how many turns each condition has been active. Key = condition name, value = turn count. */
  condition_durations?: Record<string, number>;
  /** Total legendary actions available per round. Null = no legendary actions. */
  legendary_actions_total: number | null;
  /** Legendary actions used this round. Resets to 0 at start of each round. */
  legendary_actions_used: number;
}

export type UndoEntry =
  | { type: "hp"; combatantId: string; previousHp: number; previousTempHp: number; action: "damage" | "heal" | "temp" }
  | { type: "condition"; combatantId: string; condition: string; wasAdded: boolean; previousDurations?: Record<string, number> }
  | { type: "defeated"; combatantId: string; wasDefeated: boolean; previousHp: number; previousDeathSaves?: { successes: number; failures: number } }
  | { type: "turn"; previousTurnIndex: number; previousRound: number; previousCombatants: Combatant[]; previousTurnTimeAccumulated: Record<string, number>; previousTurnStartedAt: number | null }
  | { type: "hidden"; combatantId: string; wasHidden: boolean };

/** @deprecated Use UndoEntry instead. Kept for backwards compatibility. */
export type HpUndoEntry = Extract<UndoEntry, { type: "hp" }>;

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
  undoStack: UndoEntry[];
  /** ID of the last combatant added mid-combat (for undo). */
  lastAddedCombatantId: string | null;
  /** Client-side only: which monster groups are expanded (default collapsed). */
  expandedGroups: Record<string, boolean>;
  /** Timestamp (ms) when combat started. Client-side only. */
  combatStartedAt: number | null;
  /** Timestamp (ms) when the current turn started. Client-side only. */
  turnStartedAt: number | null;
  /** Accumulated turn time per combatant (ID → total ms). Client-side only. */
  turnTimeAccumulated: Record<string, number>;
}

export interface CombatActions {
  addCombatant: (combatant: Omit<Combatant, "id">) => void;
  removeCombatant: (id: string) => void;
  clearEncounter: () => void;
  setEncounterId: (encounter_id: string, session_id: string) => void;
  setError: (error: string | null) => void;
  setLoading: (is_loading: boolean) => void;
  /** Update a single combatant's initiative value and re-sort the list. */
  setInitiative: (id: string, value: number | null, breakdown?: { roll: number; modifier: number } | null) => void;
  /** Batch-set initiative for multiple combatants in a single update (avoids N re-sorts). */
  batchSetInitiatives: (entries: Array<{ id: string; value: number; breakdown?: { roll: number; modifier: number } | null }>) => void;
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
  /** Add a death save success for a player-type combatant. 3 successes = stabilized. */
  addDeathSaveSuccess: (id: string) => void;
  /** Add a death save failure for a player-type combatant. 3 failures = defeated. */
  addDeathSaveFailure: (id: string) => void;
  /** Reset death saves for a combatant (e.g. when healed above 0 HP). */
  resetDeathSaves: (id: string) => void;
  /** Toggle hidden/visible state for a combatant (DM-only). Hidden combatants are invisible to players. */
  toggleHidden: (id: string) => void;
  /** Update a combatant's editable stats (name, display_name, max_hp, ac, spell_save_dc). Caps current_hp to new max_hp. */
  updateCombatantStats: (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  /** Switch a combatant's ruleset version. */
  setRulesetVersion: (id: string, version: RulesetVersion) => void;
  /** Update DM-only notes for a combatant. */
  updateDmNotes: (id: string, notes: string) => void;
  /** Update player-visible notes for a combatant. */
  updatePlayerNotes: (id: string, notes: string) => void;
  /** Undo the last combat action from the unified undo stack. Returns the undone entry or null if stack was empty. */
  undoLastAction: () => UndoEntry | null;
  /** @deprecated Use undoLastAction() instead. Delegates to undoLastAction() for backwards compatibility. */
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
  /** Increment legendary actions used by 1, up to total. */
  incrementLegendaryAction: (id: string) => void;
  /** Set legendary actions used to an exact count (0 to total). */
  setLegendaryActionsUsed: (id: string, count: number) => void;
}

// --- CP.1.1: Parsed Monster Action Types ---

export interface ParsedDamage {
  dice: string;          // "2d6+4", "8d6"
  avgDamage: number;     // 11, 28
  type: string;          // "Slashing", "Fire", "Psychic"
}

export interface ParsedAction {
  name: string;
  rawDesc: string;
  type: "attack" | "save" | "utility" | "unknown";
  // Attack fields (when type === "attack")
  attackBonus?: number;
  attackType?: "melee" | "ranged" | "melee_or_ranged";
  reach?: string;
  range?: string;
  // Save fields (when type === "save")
  saveDC?: number;
  saveAbility?: string;      // "DEX", "WIS", "CON", etc.
  halfOnSave?: boolean;
  // Damage (both attack and save)
  damages: ParsedDamage[];
  // Conditions applied
  conditionsApplied?: string[];
}

// --- CP.1.2: Damage Modifier Types ---

export interface DamageModifier {
  type: string;           // "fire", "cold", "bludgeoning", etc.
  condition?: string;     // "from nonmagical attacks", "that isn't silvered"
}

export interface DamageModifiers {
  resistances: DamageModifier[];
  immunities: DamageModifier[];
  vulnerabilities: DamageModifier[];
  conditionImmunities: string[];
}

export type DamageModifierResult = "normal" | "resistant" | "immune" | "vulnerable";
