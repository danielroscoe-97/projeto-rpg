export interface EncounterPresetCreature {
  id: string;
  preset_id: string;
  monster_slug: string | null;
  name: string;
  cr: string | null;
  quantity: number;
  source: "srd" | "srd-2024" | "mad" | "manual";
  sort_order: number;
}

export interface EncounterPreset {
  id: string;
  campaign_id: string;
  name: string;
  notes: string | null;
  difficulty: "trivial" | "easy" | "medium" | "hard" | "deadly" | null;
  total_xp: number | null;
  adjusted_xp: number | null;
  selected_members: string[];
  formula_version: "2014" | "2024";
  created_at: string;
  updated_at: string;
  used_at: string | null;
  used_count: number;
  creatures: EncounterPresetCreature[];
}
