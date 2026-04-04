import { createClient } from "./client";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { trackEvent } from "@/lib/analytics/track";
import type { Plan } from "@/lib/types/subscription";

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
  campaignId?: string | null,
  dmPlan?: Plan
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
      dm_plan: dmPlan ?? "free",
    })
    .select("id")
    .single();
  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create session");
  }
  trackEvent("combat:session_created", {
    session_id: session.id,
    has_campaign: !!campaignId,
    ruleset: ruleset_version,
  });
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
  existingSessionId?: string | null,
  /** DM's current plan — snapshotted into session for Mesa model */
  dmPlan?: Plan,
  /** FK to encounter_presets if built from a saved preset */
  presetOriginId?: string | null,
  /** Whether the DM modified creatures after loading from preset */
  wasModifiedFromPreset?: boolean,
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
        dm_plan: dmPlan ?? "free",
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
      ...(presetOriginId ? { preset_origin_id: presetOriginId } : {}),
      ...(wasModifiedFromPreset != null ? { was_modified_from_preset: wasModifiedFromPreset } : {}),
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
    display_name: c.display_name ?? null,
    monster_group_id: c.monster_group_id ?? null,
    group_order: c.group_order ?? null,
    dm_notes: c.dm_notes ?? '',
    player_notes: c.player_notes ?? '',
    player_character_id: c.player_character_id ?? null,
  }));

  const { error: combatantsError } = await supabase
    .from("combatants")
    .insert(rows);
  if (combatantsError) {
    throw new Error(combatantsError.message ?? "Failed to insert combatants");
  }

  const playerCount = combatants.filter((c) => c.is_player).length;
  const monsterCount = combatants.length - playerCount;
  trackEvent("combat:encounter_created", {
    encounter_id: encounter.id,
    combatant_count: combatants.length,
    player_count: playerCount,
    monster_count: monsterCount,
  });

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
    is_hidden: false,
    is_player: false,
    monster_id: monster.id,
    token_url: monster.token_url ?? null,
    creature_type: monster.type ?? null,
    display_name: null,
    monster_group_id: null,
    group_order: null,
    dm_notes: '',
    player_notes: '',
    player_character_id: null,
    combatant_role: null,
    legendary_actions_total: null,
    legendary_actions_used: 0,
  };
}

// ── F-42: Late difficulty voting helpers ──────────────────────────────────────

/** Cast or update a late difficulty vote via DB RPC. Returns new avg + count. */
export async function castLateVote(
  encounterId: string,
  vote: 1 | 2 | 3 | 4 | 5
): Promise<{ avg: number; count: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("cast_late_vote", {
    p_encounter_id: encounterId,
    p_vote: vote,
  });
  if (error) throw new Error(error.message);
  return data as { avg: number; count: number };
}

/** Fetch the current user's votes for a list of encounter IDs (server-side).
 *  Requires a supabase client with auth context (server client with cookies).
 *  Returns a Map<encounter_id, vote> — filtered by user_id explicitly. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMyEncounterVotes(
  supabase: any,
  encounterIds: string[]
): Promise<Map<string, number>> {
  if (encounterIds.length === 0) return new Map();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();
  const { data } = await supabase
    .from("encounter_votes")
    .select("encounter_id, vote")
    .in("encounter_id", encounterIds)
    .eq("user_id", user.id);
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { encounter_id: string; vote: number }[]) {
    map.set(row.encounter_id, row.vote);
  }
  return map;
}
