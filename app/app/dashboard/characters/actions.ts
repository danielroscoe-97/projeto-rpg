"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { grantXpAsync } from "@/lib/xp/grant-xp";

interface CharacterData {
  name: string;
  race?: string | null;
  characterClass?: string | null;
  level?: number | null;
  maxHp?: number | null;
  ac?: number | null;
  spellSaveDc?: number | null;
  str?: number | null;
  dex?: number | null;
  con?: number | null;
  intScore?: number | null;
  wis?: number | null;
  chaScore?: number | null;
  tokenUrl?: string | null;
}

export async function createStandaloneCharacterAction(data: CharacterData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();

  const maxHp = Math.max(1, data.maxHp ?? 10);
  const { error } = await service
    .from("player_characters")
    .insert({
      campaign_id: null,
      user_id: user.id,
      name: data.name.trim(),
      race: data.race?.trim() || null,
      class: data.characterClass?.trim() || null,
      level: data.level || null,
      max_hp: maxHp,
      current_hp: maxHp,
      ac: data.ac ?? 10,
      spell_save_dc: data.spellSaveDc || null,
      str: data.str || null,
      dex: data.dex || null,
      con: data.con || null,
      int_score: data.intScore || null,
      wis: data.wis || null,
      cha_score: data.chaScore || null,
      token_url: data.tokenUrl || null,
    });

  if (error) {
    console.error("[createStandaloneCharacter]", error.message, error.code, error.details, error.hint);
    throw new Error(`Erro ao criar personagem: ${error.message}`);
  }

  // XP: Player created character
  grantXpAsync(user.id, "player_character_created", "player");

  revalidatePath("/app/dashboard/characters");
}

export async function updateCharacterAction(id: string, data: CharacterData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();

  const { error } = await service
    .from("player_characters")
    .update({
      name: data.name.trim(),
      race: data.race?.trim() || null,
      class: data.characterClass?.trim() || null,
      level: data.level || null,
      max_hp: data.maxHp ?? 10,
      ac: data.ac ?? 10,
      spell_save_dc: data.spellSaveDc || null,
      str: data.str || null,
      dex: data.dex || null,
      con: data.con || null,
      int_score: data.intScore || null,
      wis: data.wis || null,
      cha_score: data.chaScore || null,
      token_url: data.tokenUrl || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erro ao salvar personagem");

  revalidatePath("/app/dashboard/characters");
}

export async function createCampaignCharacterAction(campaignId: string, data: CharacterData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();

  const maxHp = Math.max(1, data.maxHp ?? 10);
  const { error } = await service
    .from("player_characters")
    .insert({
      campaign_id: campaignId,
      user_id: user.id,
      name: data.name.trim(),
      race: data.race?.trim() || null,
      class: data.characterClass?.trim() || null,
      level: data.level || null,
      max_hp: maxHp,
      current_hp: maxHp,
      ac: data.ac ?? 10,
      spell_save_dc: data.spellSaveDc || null,
      str: data.str || null,
      dex: data.dex || null,
      con: data.con || null,
      int_score: data.intScore || null,
      wis: data.wis || null,
      cha_score: data.chaScore || null,
      token_url: data.tokenUrl || null,
    });

  if (error) {
    console.error("[createCampaignCharacter]", error.message, error.code, error.details, error.hint);
    throw new Error(`Erro ao criar personagem: ${error.message}`);
  }

  // XP: Player created character
  grantXpAsync(user.id, "player_character_created", "player");

  revalidatePath(`/app/campaigns/${campaignId}`);
}

export async function deleteCharacterAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();

  const { error } = await service
    .from("player_characters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .is("campaign_id", null); // nunca deletar personagem vinculado a campanha

  if (error) throw new Error("Erro ao excluir personagem");

  revalidatePath("/app/dashboard/characters");
}
