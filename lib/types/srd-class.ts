/** Minimal class data used for index pages and cards */
export interface SrdClass {
  id: string;
  name: string;
  name_pt: string;
  hit_die: string;
  primary_ability: string;
  saving_throws: string[];
  armor_proficiencies: string;
  weapon_proficiencies: string;
  srd_subclass: string;
  srd_subclass_pt: string;
  description_en: string;
  description_pt: string;
  spellcaster: boolean;
  spellcasting_ability: string | null;
  icon: string;
  role: "martial" | "caster" | "half-caster" | "support";
}

// ── Full class data (SRD content for detail pages) ──────────────

export interface ClassFeature {
  name: string;
  name_pt: string;
  level: number;
  description_en: string;
  description_pt: string;
}

export interface ClassTableRow {
  level: number;
  proficiency_bonus: string;
  features: string;
  features_pt: string;
  /** Caster-specific columns (optional) */
  cantrips_known?: number;
  spells_known?: number;
  spell_slots?: Record<string, number>; // "1st": 2, "2nd": 1, etc.
  /** Class-specific columns */
  extras?: Record<string, string>; // e.g. "rages": "2", "rage_damage": "+2", "martial_arts": "1d4"
  extras_pt?: Record<string, string>;
}

export interface SpellcastingInfo {
  description_en: string;
  description_pt: string;
  ability: string;
  cantrips?: boolean;
  ritual_casting?: boolean;
  spellcasting_focus?: string;
  spellcasting_focus_pt?: string;
}

export interface SubclassEntry {
  id: string;
  name: string;
  name_pt: string;
  class_id: string;
  is_srd: boolean;
  description_en: string;
  description_pt: string;
  features: ClassFeature[];
  source: string; // "SRD 5.1", "PHB", etc.
}

export interface SrdClassFull extends SrdClass {
  // Full flavor text
  description_full_en: string;
  description_full_pt: string;

  // Hit Points block (like wikidot)
  hit_points_en: string;  // "Hit Dice: 1d8...\nHP at 1st Level: 8 + CON..."
  hit_points_pt: string;

  // Full proficiencies block
  tool_proficiencies_en: string;  // "Choose one type of artisan's tools or one musical instrument"
  tool_proficiencies_pt: string;
  skill_choices_en: string;       // "Choose two from Acrobatics, Athletics, History, Insight, Religion, and Stealth"
  skill_choices_pt: string;

  // Quick Build
  quick_build_en: string;
  quick_build_pt: string;

  // Starting equipment
  starting_equipment_en: string;
  starting_equipment_pt: string;

  // Class progression table
  class_table: ClassTableRow[];

  // Class features (descriptions)
  class_features: ClassFeature[];

  // Spellcasting details (casters only)
  spellcasting?: SpellcastingInfo;

  // Multiclassing
  multiclass_prerequisites: string;
  multiclass_prerequisites_pt: string;
  multiclass_proficiencies: string;
  multiclass_proficiencies_pt: string;

  // Subclass metadata
  subclass_level: number; // Level at which subclass is chosen
  subclass_name: string;  // "Primal Path", "Martial Archetype", etc.
  subclass_name_pt: string;

  // Inline subclass IDs (references to subclasses-srd.json)
  subclass_ids: string[];
}
