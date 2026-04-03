"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CharacterData {
  name: string;
  race?: string | null;
  characterClass?: string | null;
  level?: number | null;
  maxHp?: number | null;
  ac?: number | null;
  spellSaveDc?: number | null;
}

export async function createStandaloneCharacterAction(data: CharacterData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const service = createServiceClient();

  const { error } = await service
    .from("player_characters")
    .insert({
      campaign_id: null,
      user_id: user.id,
      name: data.name.trim(),
      race: data.race?.trim() || null,
      class: data.characterClass?.trim() || null,
      level: data.level || null,
      max_hp: data.maxHp ?? 10,
      current_hp: data.maxHp ?? 10,
      ac: data.ac ?? 10,
      spell_save_dc: data.spellSaveDc || null,
    });

  if (error) throw new Error("Erro ao criar personagem");

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
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error("Erro ao salvar personagem");

  revalidatePath("/app/dashboard/characters");
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
