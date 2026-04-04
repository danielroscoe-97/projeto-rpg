import { createClient } from "./client";
import type { EncounterPreset, EncounterPresetCreature } from "@/lib/types/encounter-preset";

/** Fetch all encounter presets for a campaign, with nested creatures. */
export async function fetchEncounterPresets(campaignId: string): Promise<EncounterPreset[]> {
  const supabase = createClient();
  const { data: presets, error } = await supabase
    .from("encounter_presets")
    .select("id, campaign_id, name, notes, difficulty, total_xp, adjusted_xp, selected_members, formula_version, used_count, used_at, created_at, updated_at")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!presets || presets.length === 0) return [];

  const presetIds = presets.map((p) => p.id);
  const { data: creatures, error: crErr } = await supabase
    .from("encounter_preset_creatures")
    .select("id, preset_id, monster_slug, name, cr, quantity, source, sort_order")
    .in("preset_id", presetIds)
    .order("sort_order", { ascending: true })
    .limit(500);

  if (crErr) throw new Error(crErr.message);

  const creaturesByPreset = new Map<string, EncounterPresetCreature[]>();
  for (const c of creatures ?? []) {
    const list = creaturesByPreset.get(c.preset_id) ?? [];
    list.push(c as EncounterPresetCreature);
    creaturesByPreset.set(c.preset_id, list);
  }

  return presets.map((p) => ({
    ...p,
    selected_members: p.selected_members ?? [],
    creatures: creaturesByPreset.get(p.id) ?? [],
  })) as EncounterPreset[];
}

/** Fetch a single preset by ID. Returns null only if not found. */
export async function fetchEncounterPreset(presetId: string): Promise<EncounterPreset | null> {
  const supabase = createClient();
  const { data: preset, error } = await supabase
    .from("encounter_presets")
    .select("*")
    .eq("id", presetId)
    .single();

  if (error) return null;

  const { data: creatures } = await supabase
    .from("encounter_preset_creatures")
    .select("*")
    .eq("preset_id", presetId)
    .order("sort_order", { ascending: true });

  return {
    ...preset,
    selected_members: preset.selected_members ?? [],
    creatures: (creatures ?? []) as EncounterPresetCreature[],
  } as EncounterPreset;
}

/** Create a new encounter preset with creatures. P4: cleanup on failure. */
export async function createEncounterPreset(
  campaignId: string,
  data: {
    name: string;
    notes?: string | null;
    difficulty?: string;
    totalXp?: number;
    adjustedXp?: number;
    selectedMembers: string[];
    formulaVersion: "2014" | "2024";
    creatures: Array<{
      monster_slug: string | null;
      name: string;
      cr: string | null;
      quantity: number;
      source: string;
    }>;
  }
): Promise<EncounterPreset> {
  const supabase = createClient();

  const { data: preset, error } = await supabase
    .from("encounter_presets")
    .insert({
      campaign_id: campaignId,
      name: data.name,
      notes: data.notes ?? null,
      difficulty: data.difficulty ?? null,
      total_xp: data.totalXp ?? null,
      adjusted_xp: data.adjustedXp ?? null,
      selected_members: data.selectedMembers,
      formula_version: data.formulaVersion,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (data.creatures.length > 0) {
    const { error: crErr } = await supabase
      .from("encounter_preset_creatures")
      .insert(
        data.creatures.map((c, i) => ({
          preset_id: preset.id,
          monster_slug: c.monster_slug,
          name: c.name,
          cr: c.cr,
          quantity: c.quantity,
          source: c.source,
          sort_order: i,
        }))
      );
    if (crErr) {
      // P4: cleanup orphan preset row on creature insert failure
      await supabase.from("encounter_presets").delete().eq("id", preset.id);
      throw new Error(crErr.message);
    }
  }

  // P5: handle null from re-fetch gracefully
  const result = await fetchEncounterPreset(preset.id);
  if (!result) throw new Error("Failed to fetch created preset");
  return result;
}

/** Update an encounter preset. Replaces creatures entirely. P4: error handling. */
export async function updateEncounterPreset(
  presetId: string,
  data: {
    name?: string;
    notes?: string | null;
    difficulty?: string | null;
    totalXp?: number | null;
    adjustedXp?: number | null;
    selectedMembers?: string[];
    formulaVersion?: "2014" | "2024";
    creatures?: Array<{
      monster_slug: string | null;
      name: string;
      cr: string | null;
      quantity: number;
      source: string;
    }>;
  }
): Promise<EncounterPreset> {
  const supabase = createClient();

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.difficulty !== undefined) updates.difficulty = data.difficulty;
  if (data.totalXp !== undefined) updates.total_xp = data.totalXp;
  if (data.adjustedXp !== undefined) updates.adjusted_xp = data.adjustedXp;
  if (data.selectedMembers !== undefined) updates.selected_members = data.selectedMembers;
  if (data.formulaVersion !== undefined) updates.formula_version = data.formulaVersion;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("encounter_presets")
      .update(updates)
      .eq("id", presetId);
    if (error) throw new Error(error.message);
  }

  if (data.creatures !== undefined) {
    // P4: check delete error before inserting replacements
    const { error: delErr } = await supabase
      .from("encounter_preset_creatures")
      .delete()
      .eq("preset_id", presetId);
    if (delErr) throw new Error(delErr.message);

    if (data.creatures.length > 0) {
      const { error: crErr } = await supabase
        .from("encounter_preset_creatures")
        .insert(
          data.creatures.map((c, i) => ({
            preset_id: presetId,
            monster_slug: c.monster_slug,
            name: c.name,
            cr: c.cr,
            quantity: c.quantity,
            source: c.source,
            sort_order: i,
          }))
        );
      if (crErr) throw new Error(crErr.message);
    }
  }

  // P5: handle null from re-fetch gracefully
  const result = await fetchEncounterPreset(presetId);
  if (!result) throw new Error("Failed to fetch updated preset");
  return result;
}

/** Delete an encounter preset. */
export async function deleteEncounterPreset(presetId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("encounter_presets")
    .delete()
    .eq("id", presetId);
  if (error) throw new Error(error.message);
}

/** Increment usage counter when preset is used to start combat. */
export async function incrementPresetUsage(presetId: string): Promise<void> {
  const supabase = createClient();
  // P3: RPC now exists in migration 091
  const { error } = await supabase.rpc("increment_preset_usage", { p_preset_id: presetId });
  if (error) throw new Error(error.message);
}
