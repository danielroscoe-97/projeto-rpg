import { getMonsterById } from "@/lib/srd/srd-search";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";

const ZERO_HP_PATTERNS = [
  "Undead Fortitude",
  "Relentless Endurance",
  "Relentless",
  "drop to 0 hit points",
  "reduced to 0 hit points",
];

export function hasZeroHpSurvivalTrait(combatant: Combatant): { hasTrait: boolean; traitName: string | null } {
  if (!combatant.monster_id || !combatant.ruleset_version) {
    return { hasTrait: false, traitName: null };
  }

  const monster = getMonsterById(combatant.monster_id, combatant.ruleset_version as RulesetVersion);
  if (!monster?.special_abilities) {
    return { hasTrait: false, traitName: null };
  }

  for (const ability of monster.special_abilities) {
    for (const pattern of ZERO_HP_PATTERNS) {
      if (ability.name.includes(pattern) || ability.desc.includes(pattern)) {
        return { hasTrait: true, traitName: ability.name };
      }
    }
  }

  return { hasTrait: false, traitName: null };
}
