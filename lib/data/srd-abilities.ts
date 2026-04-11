import srdAbilitiesData from "./srd-abilities-index.json";

export interface SrdAbility {
  id: string;
  name: string;
  name_pt: string;
  description: string;
  description_pt: string;
  ability_type: "class_feature" | "racial_trait" | "feat" | "subclass_feature";
  source_class: string | null;
  source_race: string | null;
  level_acquired: number | null;
  max_uses: number | null;
  reset_type: "short_rest" | "long_rest" | "dawn" | "manual" | null;
  srd_ref: string;
}

export const SRD_ABILITIES: SrdAbility[] = srdAbilitiesData as SrdAbility[];

/**
 * Search abilities by name, class, race, or type.
 * Optionally filter by the character's class/race for relevance.
 */
export function searchSrdAbilities(
  query: string,
  options?: {
    characterClass?: string | null;
    characterRace?: string | null;
    abilityType?: SrdAbility["ability_type"];
    limit?: number;
  }
): SrdAbility[] {
  const q = query.toLowerCase().trim();
  const limit = options?.limit ?? 20;

  let results = SRD_ABILITIES;

  // Filter by ability type if specified
  if (options?.abilityType) {
    results = results.filter((a) => a.ability_type === options.abilityType);
  }

  // Text search
  if (q) {
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.name_pt.toLowerCase().includes(q) ||
        (a.source_class && a.source_class.toLowerCase().includes(q)) ||
        (a.source_race && a.source_race.toLowerCase().includes(q))
    );
  }

  // Sort: character's own class/race first, then alphabetical
  if (options?.characterClass || options?.characterRace) {
    const cls = options.characterClass?.toLowerCase();
    const race = options.characterRace?.toLowerCase();

    results.sort((a, b) => {
      const aRelevant =
        (cls && a.source_class?.toLowerCase() === cls) ||
        (race && a.source_race?.toLowerCase() === race);
      const bRelevant =
        (cls && b.source_class?.toLowerCase() === cls) ||
        (race && b.source_race?.toLowerCase() === race);
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return results.slice(0, limit);
}

/** Get abilities specifically for a class (for auto-suggest) */
export function getClassAbilities(className: string, maxLevel?: number): SrdAbility[] {
  const cls = className.toLowerCase();
  return SRD_ABILITIES.filter(
    (a) =>
      (a.ability_type === "class_feature" || a.ability_type === "subclass_feature") &&
      a.source_class?.toLowerCase() === cls &&
      (maxLevel == null || (a.level_acquired ?? 0) <= maxLevel)
  );
}

/** Get racial traits for a specific race */
export function getRacialAbilities(raceName: string): SrdAbility[] {
  const race = raceName.toLowerCase().replace(/\s+/g, "-");
  return SRD_ABILITIES.filter(
    (a) => a.ability_type === "racial_trait" && a.source_race === race
  );
}

/** Get all feats */
export function getAllFeats(): SrdAbility[] {
  return SRD_ABILITIES.filter((a) => a.ability_type === "feat");
}
