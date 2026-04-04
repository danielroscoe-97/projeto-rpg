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
