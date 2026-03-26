"use server";

import { createClient } from "./server";

interface PlayerRegistrationData {
  name: string;
  initiative: number;
  hp: number | null;
  ac: number | null;
}

/**
 * Register a player combatant for a session.
 * Creates a combatant with is_player=true linked to the session's active encounter.
 * Each token can only register once (prevents duplicates).
 */
export async function registerPlayerCombatant(
  tokenId: string,
  sessionId: string,
  data: PlayerRegistrationData
): Promise<{ combatantId: string }> {
  const supabase = await createClient();

  // Server-side validation
  const name = data.name?.trim();
  if (!name || name.length > 50) {
    throw new Error("Invalid name");
  }
  if (!Number.isFinite(data.initiative) || data.initiative < 1 || data.initiative > 30) {
    throw new Error("Initiative must be between 1 and 30");
  }
  if (data.hp !== null && (!Number.isFinite(data.hp) || data.hp < 1)) {
    throw new Error("HP must be a positive number");
  }
  if (data.ac !== null && (!Number.isFinite(data.ac) || data.ac < 1 || data.ac > 30)) {
    throw new Error("AC must be between 1 and 30");
  }

  // Validate the token belongs to this session and is active
  const { data: token, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, session_id, player_name")
    .eq("id", tokenId)
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .single();

  if (tokenError || !token) {
    throw new Error("Invalid or expired session token");
  }

  // Check if this token already registered a combatant (prevent duplicates)
  if (token.player_name) {
    throw new Error("Already registered");
  }

  // Find or create the active encounter for this session
  let encounterId: string | null = null;

  const { data: encounter } = await supabase
    .from("encounters")
    .select("id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  encounterId = encounter?.id ?? null;

  // If no encounter exists yet, we store the player data on the token
  // and the DM will see it when setting up the encounter
  // Mark the token with the player name regardless
  await supabase
    .from("session_tokens")
    .update({ player_name: name })
    .eq("id", tokenId);

  // If there's an encounter, create the combatant
  if (encounterId) {
    const { data: combatant, error: insertError } = await supabase
      .from("combatants")
      .insert({
        encounter_id: encounterId,
        name,
        initiative: data.initiative,
        initiative_order: null,
        current_hp: data.hp,
        max_hp: data.hp,
        temp_hp: 0,
        ac: data.ac,
        spell_save_dc: null,
        conditions: [],
        is_defeated: false,
        is_player: true,
        monster_id: null,
        dm_notes: "",
        player_notes: "",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to register: ${insertError.message}`);
    }

    return { combatantId: combatant.id };
  }

  // No encounter yet — player data saved on token, DM will pick it up
  return { combatantId: tokenId };
}

/**
 * Fetch all registered players for a session (from session_tokens with player_name set).
 */
export async function getRegisteredPlayers(
  sessionId: string
): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();

  const { data: tokens } = await supabase
    .from("session_tokens")
    .select("id, player_name")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .not("player_name", "is", null);

  return (tokens ?? []).map((t) => ({
    id: t.id,
    name: t.player_name!,
  }));
}
