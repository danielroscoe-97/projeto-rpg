import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import type { SrdMonster } from "@/lib/srd/srd-loader";

export interface CreateEncounterResult {
  session_id: string;
  encounter_id: string;
}

/**
 * Creates only a session in the database (no encounter yet).
 * Used when DM wants to share the session link before starting combat.
 */
export async function createSessionOnly(
  ruleset_version: RulesetVersion,
  campaignId?: string | null
): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      campaign_id: campaignId ?? null,
      owner_id: user.id,
      name: "Quick Encounter",
      ruleset_version,
    })
    .select("id")
    .single();
  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create session");
  }
  return session.id;
}

/**
 * Creates a session + encounter + all combatants in the database.
 * Returns the new session_id and encounter_id.
 */
export async function createEncounterWithCombatants(
  combatants: Combatant[],
  ruleset_version: RulesetVersion,
  campaignId?: string | null,
  encounterName?: string,
  /** If provided, reuses this session instead of creating a new one. */
  existingSessionId?: string | null
): Promise<CreateEncounterResult> {
  const supabase = createClient();

  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  let sessionId: string;

  if (existingSessionId) {
    // Reuse an existing session (e.g., created on-demand for sharing)
    sessionId = existingSessionId;
  } else {
    // 2. Create session (campaign_id is nullable after migration 006)
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        campaign_id: campaignId ?? null,
        owner_id: user.id,
        name: "Quick Encounter",
        ruleset_version,
      })
      .select("id")
      .single();
    if (sessionError || !session) {
      throw new Error(sessionError?.message ?? "Failed to create session");
    }
    sessionId = session.id;
  }

  // 3. Create encounter
  const { data: encounter, error: encounterError } = await supabase
    .from("encounters")
    .insert({
      session_id: sessionId,
      name: encounterName || "Encounter 1",
    })
    .select("id")
    .single();
  if (encounterError || !encounter) {
    throw new Error(encounterError?.message ?? "Failed to create encounter");
  }

  // 4. Insert combatants
  const rows = combatants.map((c) => ({
    encounter_id: encounter.id,
    name: c.name,
    current_hp: c.current_hp,
    max_hp: c.max_hp,
    temp_hp: c.temp_hp,
    ac: c.ac,
    spell_save_dc: c.spell_save_dc,
    initiative: c.initiative,
    initiative_order: c.initiative_order,
    conditions: c.conditions,
    ruleset_version: c.ruleset_version,
    is_defeated: c.is_defeated,
    is_player: c.is_player,
    monster_id: c.monster_id,
    dm_notes: c.dm_notes ?? '',
    player_notes: c.player_notes ?? '',
  }));

  const { error: combatantsError } = await supabase
    .from("combatants")
    .insert(rows);
  if (combatantsError) {
    throw new Error(combatantsError.message ?? "Failed to insert combatants");
  }

  return { session_id: sessionId, encounter_id: encounter.id };
}

/** Convenience helper for converting an SRD monster into a Combatant shape. */
export function monsterToCombatant(
  monster: SrdMonster,
  version: RulesetVersion
): Omit<Combatant, "id"> {
  return {
    name: monster.name,
    current_hp: monster.hit_points,
    max_hp: monster.hit_points,
    temp_hp: 0,
    ac: monster.armor_class,
    spell_save_dc: null,
    initiative: null,
    initiative_order: null,
    conditions: [],
    ruleset_version: version,
    is_defeated: false,
    is_player: false,
    monster_id: monster.id,
    dm_notes: '',
    player_notes: '',
  };
}
