"use server";

import { createServiceClient } from "./server";
import type { Combatant } from "@/lib/types/combat";
import type { PlayerCharacter } from "@/lib/types/database";

export interface MigrateOptions {
  campaignId?: string;
  /**
   * - `true`: always set `users.default_character_id` to the new character.
   * - `false`: never set it.
   * - `undefined` (default): set it only if the user currently has none.
   */
  setAsDefault?: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Migrate a guest character (Zustand/localStorage `Combatant`) into the
 * persistent `player_characters` table, owning it to `userId`.
 *
 * The caller is responsible for picking ONE combatant out of the guest
 * snapshot (filter by `is_player === true`) — guest snapshots may carry
 * NPCs/monsters which this function refuses.
 *
 * `setAsDefault` semantics:
 *   true      → always UPDATE users.default_character_id
 *   false     → never touch users.default_character_id
 *   undefined → set only when the user currently has none (no override)
 */
export async function migrateGuestCharacterToAuth(
  guestCharacter: Combatant,
  userId: string,
  options?: MigrateOptions,
): Promise<PlayerCharacter> {
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    throw new Error("Migração falhou: userId inválido");
  }

  if (guestCharacter.is_player === false) {
    throw new Error("Migração falhou: personagem guest não é player");
  }

  const supabase = createServiceClient();

  // player_notes is an empty string at runtime; prefer null in persistence
  // so downstream UI can distinguish "no notes" from "notes cleared".
  const notes =
    typeof guestCharacter.player_notes === "string" && guestCharacter.player_notes.length > 0
      ? guestCharacter.player_notes
      : null;

  const insertPayload = {
    campaign_id: options?.campaignId ?? null,
    user_id: userId,
    claimed_by_session_token: null,
    name: guestCharacter.name,
    max_hp: guestCharacter.max_hp,
    current_hp: guestCharacter.current_hp,
    ac: guestCharacter.ac,
    hp_temp: guestCharacter.temp_hp ?? 0,
    speed: null,
    initiative_bonus: null,
    inspiration: false,
    conditions: guestCharacter.conditions ?? [],
    spell_save_dc: guestCharacter.spell_save_dc ?? null,
    dm_notes: guestCharacter.dm_notes ?? "",
    race: null,
    class: null,
    level: null,
    subrace: null,
    subclass: null,
    background: null,
    alignment: null,
    notes,
    token_url: guestCharacter.token_url ?? null,
    spell_slots: null,
    str: null,
    dex: null,
    con: null,
    int_score: null,
    wis: null,
    cha_score: null,
    traits: null,
    proficiencies: {},
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  };

  const { data, error } = await supabase
    .from("player_characters")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Migração falhou: ${error?.message ?? "resposta vazia do banco"}`,
    );
  }

  const newCharacter = data as PlayerCharacter;

  await maybeSetDefaultCharacter(supabase, userId, newCharacter.id, options?.setAsDefault);

  return newCharacter;
}

/** Isolated so the insert path stays readable; see `setAsDefault` contract above. */
async function maybeSetDefaultCharacter(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  newCharacterId: string,
  setAsDefault: boolean | undefined,
): Promise<void> {
  if (setAsDefault === false) return;

  if (setAsDefault === undefined) {
    const { data: userRow, error: readError } = await supabase
      .from("users")
      .select("default_character_id")
      .eq("id", userId)
      .single();

    if (readError) {
      throw new Error(`Migração falhou: ${readError.message}`);
    }

    if (userRow?.default_character_id) return;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ default_character_id: newCharacterId })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Migração falhou: ${updateError.message}`);
  }
}
