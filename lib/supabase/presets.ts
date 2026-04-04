import { createClient } from "./client";
import type { MonsterPresetEntry } from "@/lib/types/database";

export interface PresetRow {
  id: string;
  name: string;
  monsters: MonsterPresetEntry[];
  ruleset_version: string;
  created_at: string;
  updated_at: string;
}

/** Fetch all presets for the current user. */
export async function fetchPresets(): Promise<PresetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monster_presets")
    .select("id, name, monsters, ruleset_version, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as PresetRow[];
}

/** Create a new preset. */
export async function createPreset(
  userId: string,
  name: string,
  monsters: MonsterPresetEntry[],
  rulesetVersion: string
): Promise<PresetRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monster_presets")
    .insert({ user_id: userId, name, monsters, ruleset_version: rulesetVersion })
    .select("id, name, monsters, ruleset_version, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data as PresetRow;
}

/** Update an existing preset. */
export async function updatePreset(
  presetId: string,
  updates: { name?: string; monsters?: MonsterPresetEntry[]; ruleset_version?: string }
): Promise<PresetRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monster_presets")
    .update(updates)
    .eq("id", presetId)
    .select("id, name, monsters, ruleset_version, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data as PresetRow;
}

/** Delete a preset. */
export async function deletePreset(presetId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("monster_presets")
    .delete()
    .eq("id", presetId);

  if (error) throw new Error(error.message);
}
