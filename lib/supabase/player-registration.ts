"use server";

import { createServiceClient } from "./server";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { captureError } from "@/lib/errors/capture";

interface PlayerRegistrationData {
  name: string;
  initiative: number;
  hp: number | null;
  ac: number | null;
}

export interface ClaimTokenResult {
  tokenId: string;
  /** Non-null when this player previously registered (same-device reconnect). */
  playerName: string | null;
}

/**
 * Claims an existing session token for an anonymous player, or creates a new
 * per-player token if the shared token is already claimed.
 * Uses service client to bypass RLS (anonymous players have no token yet).
 * Returns the effective token ID and player_name (if already registered).
 */
export async function claimPlayerToken(
  masterTokenId: string,
  anonUserId: string
): Promise<ClaimTokenResult> {
  const supabase = createServiceClient();

  // Look up the master token
  const { data: master } = await supabase
    .from("session_tokens")
    .select("id, session_id, anon_user_id, player_name")
    .eq("id", masterTokenId)
    .eq("is_active", true)
    .single();

  if (!master) throw new Error("Token not found");

  // Already claimed by this player (same-device reconnect).
  // If token already has player_name, another person on the same device
  // needs a fresh token — fall through to create one.
  if (master.anon_user_id === anonUserId) {
    if (!master.player_name) {
      return { tokenId: master.id, playerName: null };
    }
    // Fall through — second player on same device needs a new token
  }

  // Check if player already has an unregistered token for this session
  const { data: existing } = await supabase
    .from("session_tokens")
    .select("id, player_name")
    .eq("session_id", master.session_id)
    .eq("anon_user_id", anonUserId)
    .eq("is_active", true)
    .is("player_name", null)
    .limit(1)
    .maybeSingle();

  if (existing) return { tokenId: existing.id, playerName: null };

  // Token unclaimed — try to claim it (atomic: only succeeds if still null)
  if (!master.anon_user_id) {
    const { data: claimed } = await supabase
      .from("session_tokens")
      .update({
        anon_user_id: anonUserId,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", masterTokenId)
      .is("anon_user_id", null)
      .select("id")
      .single();

    if (claimed) return { tokenId: masterTokenId, playerName: null };
  }

  // Token already claimed by another player — create a new one
  const newToken = Array.from(
    crypto.getRandomValues(new Uint8Array(24)),
    (b) => b.toString(36).padStart(2, "0")
  ).join("").slice(0, 32);

  const { data: created, error: insertError } = await supabase
    .from("session_tokens")
    .insert({
      session_id: master.session_id,
      token: newToken,
      anon_user_id: anonUserId,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(`Failed to create player token: ${insertError.message}`);
  return { tokenId: created.id, playerName: null };
}

/**
 * Register a player combatant for a session.
 * Creates a combatant with is_player=true linked to the session's active encounter.
 * Each token can only register once (prevents duplicates).
 * Uses service client to bypass RLS (anonymous players).
 */
export async function registerPlayerCombatant(
  tokenId: string,
  sessionId: string,
  data: PlayerRegistrationData
): Promise<{ combatantId: string }> {
  const supabase = createServiceClient();

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
    captureError(new Error("Invalid or expired session token"), {
      component: "registerPlayerCombatant",
      action: "validateToken",
      category: "database",
      sessionId,
      extra: { tokenId, tokenError: tokenError?.message },
    });
    throw new Error("Invalid or expired session token");
  }

  // Check if this token already registered a combatant (prevent duplicates)
  if (token.player_name) {
    captureError(new Error("Already registered"), {
      component: "registerPlayerCombatant",
      action: "duplicateCheck",
      category: "validation",
      sessionId,
      extra: { tokenId, existingPlayerName: token.player_name },
    });
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
        current_hp: data.hp ?? 0,
        max_hp: data.hp ?? 0,
        temp_hp: 0,
        ac: data.ac ?? 0,
        spell_save_dc: null,
        conditions: [],
        is_defeated: false,
        is_hidden: false,
        is_player: true,
        monster_id: null,
        dm_notes: "",
        player_notes: "",
        player_character_id: null,
        // B2: Link combatant to session_token by ID — survives name changes for reconnection
        session_token_id: tokenId,
      })
      .select("id")
      .single();

    if (insertError) {
      captureError(new Error(`Failed to register: ${insertError.message}`), {
        component: "registerPlayerCombatant",
        action: "insertCombatant",
        category: "database",
        sessionId,
        extra: { tokenId, encounterId, insertCode: insertError.code, insertDetails: insertError.details },
      });
      throw new Error(`Failed to register: ${insertError.message}`);
    }

    trackServerEvent("player:joined", {
      properties: { session_id: sessionId, token_id: tokenId },
    });

    return { combatantId: combatant.id };
  }

  trackServerEvent("player:joined", {
    properties: { session_id: sessionId, token_id: tokenId },
  });

  // No encounter yet — player data saved on token, DM will pick it up
  return { combatantId: tokenId };
}

/**
 * Mark a player token with a player name WITHOUT creating a combatant.
 * Used when the DM has already created the combatant (late-join acceptance),
 * so we only need to associate the token with the player name.
 * Silently succeeds if the token is already marked (idempotent).
 */
export async function markPlayerToken(
  tokenId: string,
  sessionId: string,
  playerName: string
): Promise<void> {
  const supabase = createServiceClient();

  const name = playerName?.trim();
  if (!name || name.length > 50) {
    throw new Error("Invalid name");
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

  // Already marked — idempotent success
  if (token.player_name) return;

  await supabase
    .from("session_tokens")
    .update({ player_name: name })
    .eq("id", tokenId);

  trackServerEvent("player:joined", {
    properties: { session_id: sessionId, token_id: tokenId, late_join: true },
  });
}

/**
 * Fetch all registered players for a session (from session_tokens with player_name set).
 */
export async function getRegisteredPlayers(
  sessionId: string
): Promise<Array<{ id: string; name: string }>> {
  const supabase = createServiceClient();

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

/**
 * Rejoin a session as a previously-registered player.
 * Transfers ownership of the player's token to the new anonymous user ID
 * (handles cookie-less reconnect: player lost their anonymous session).
 * Returns the effective token ID for this player.
 */
export async function rejoinAsPlayer(
  sessionId: string,
  playerName: string,
  anonUserId: string
): Promise<ClaimTokenResult> {
  const supabase = createServiceClient();

  const name = playerName?.trim();
  if (!name) throw new Error("Invalid name");

  // Find the token for this player in this session
  const { data: token, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, player_name, anon_user_id, last_seen_at")
    .eq("session_id", sessionId)
    .eq("player_name", name)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (tokenError || !token) {
    throw new Error("Player not found in this session");
  }

  // Already owned by this user — no transfer needed
  if (token.anon_user_id === anonUserId) {
    return { tokenId: token.id, playerName: token.player_name };
  }

  // IG-02: Freshness guard — if player sent a heartbeat in the last 10s they're still active.
  // Prevents impersonation of a connected player by another participant with the session link.
  if (token.last_seen_at) {
    const msSinceHeartbeat = Date.now() - new Date(token.last_seen_at).getTime();
    if (msSinceHeartbeat < 10_000) {
      throw new Error("Player is still actively connected — cannot transfer token");
    }
  }

  // A.5: Atomic transfer — optimistic locking on current anon_user_id.
  // P-03 fix: when anon_user_id is null (token never had an owner), use .is() not .eq("")
  // to correctly match NULL in PostgreSQL.
  let transferQuery = supabase
    .from("session_tokens")
    .update({
      anon_user_id: anonUserId,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", token.id);

  if (token.anon_user_id === null) {
    transferQuery = transferQuery.is("anon_user_id", null);
  } else {
    transferQuery = transferQuery.eq("anon_user_id", token.anon_user_id);
  }

  const { data: updated, error: updateError } = await transferQuery
    .select("id, anon_user_id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Token transfer failed: ${updateError.message}`);
  }

  if (!updated) {
    throw new Error("Token ownership conflict — another device claimed this token first");
  }

  trackServerEvent("player:rejoined", {
    properties: { session_id: sessionId, token_id: token.id, player_name: name },
  });

  return { tokenId: token.id, playerName: token.player_name };
}
