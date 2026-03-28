import type { ParsedAction, ParsedDamage } from "@/lib/types/combat";
import type { MonsterAction, SrdMonster } from "@/lib/srd/srd-loader";

const DND_CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
] as const;

// Damage types for validation
const DAMAGE_TYPES = [
  "Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning",
  "Necrotic", "Piercing", "Poison", "Psychic", "Radiant",
  "Slashing", "Thunder",
] as const;

// SRD 2024: "Melee Attack: +N" / "Ranged Attack: +N" / "Melee or Ranged Attack: +N"
const ATTACK_2024_RE = /^(Melee|Ranged|Melee or Ranged)\s+Attack:\s*\+(\d+)/i;

// SRD 2014: "Melee Weapon Attack: +N to hit" / "Ranged Weapon Attack: +N to hit"
const ATTACK_2014_RE = /^(Melee|Ranged|Melee or Ranged)\s+(?:Weapon\s+)?Attack:\s*\+(\d+)\s+to hit/i;

// Reach: "reach N ft."
const REACH_RE = /reach\s+(\d+\s*ft\.)/i;

// Range: "range N/N ft." or "range N ft."
const RANGE_RE = /range\s+(\d+(?:\/\d+)?\s*ft\.)/i;

// SRD 2024 save: starts with lowercase ability + DC N
const SAVE_2024_RE = /^(str|dex|con|int|wis|cha)\s+DC\s+(\d+)/i;

// SRD 2014 save: "DC N Ability saving throw" or "DC N Ability"
const SAVE_2014_RE = /DC\s+(\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i;

// Damage: "N (XdY + Z) Type damage" or "N (XdY) Type damage"
// Also matches "N (XdY + Z) Type" without "damage" for short patterns
const DAMAGE_RE = /(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)/gi;

// Half on save patterns
const HALF_ON_SAVE_RE = /half\s+damage|half\s+on\s+(?:a\s+)?sav(?:e|ing)|or\s+half\s+as\s+much|{@actSaveSuccess}\s*Half\s+damage/i;

// Condition pattern: "has the X condition" or "X condition" or specific 2014 patterns
const CONDITION_RE = new RegExp(
  `(?:has\\s+the\\s+)?(${DND_CONDITIONS.join("|")})\\s+condition`,
  "gi"
);

function parseAttackType(match: string): "melee" | "ranged" | "melee_or_ranged" {
  const lower = match.toLowerCase();
  if (lower.includes("melee or ranged")) return "melee_or_ranged";
  if (lower.includes("melee")) return "melee";
  return "ranged";
}

function parseDamages(desc: string): ParsedDamage[] {
  const damages: ParsedDamage[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(DAMAGE_RE.source, "gi");
  while ((match = re.exec(desc)) !== null) {
    damages.push({
      dice: match[2].replace(/\s/g, ""),
      avgDamage: parseInt(match[1], 10),
      type: match[3],
    });
  }
  return damages;
}

function parseConditions(desc: string): string[] {
  const conditions: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(CONDITION_RE.source, "gi");
  while ((match = re.exec(desc)) !== null) {
    const name = match[1];
    // Normalize to title case
    const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (!conditions.includes(normalized)) {
      conditions.push(normalized);
    }
  }
  return conditions;
}

const ABILITY_SHORT_TO_LONG: Record<string, string> = {
  str: "STR", dex: "DEX", con: "CON",
  int: "INT", wis: "WIS", cha: "CHA",
};

const ABILITY_LONG_TO_SHORT: Record<string, string> = {
  strength: "STR", dexterity: "DEX", constitution: "CON",
  intelligence: "INT", wisdom: "WIS", charisma: "CHA",
};

// Detect utility actions (Multiattack, Spellcasting, etc.)
const UTILITY_NAMES = /^(multiattack|spellcasting|change shape|shapechang)/i;

export function parseMonsterAction(action: MonsterAction): ParsedAction {
  const { name, desc } = action;

  // Utility actions
  if (UTILITY_NAMES.test(name)) {
    return { name, rawDesc: desc, type: "utility", damages: [] };
  }

  const damages = parseDamages(desc);
  const conditions = parseConditions(desc);

  // Try attack patterns (2024 first, then 2014)
  const attackMatch = ATTACK_2024_RE.exec(desc) || ATTACK_2014_RE.exec(desc);
  if (attackMatch) {
    const attackType = parseAttackType(attackMatch[1]);
    const attackBonus = parseInt(attackMatch[2], 10);
    const reachMatch = REACH_RE.exec(desc);
    const rangeMatch = RANGE_RE.exec(desc);

    return {
      name,
      rawDesc: desc,
      type: "attack",
      attackBonus,
      attackType,
      reach: reachMatch?.[1],
      range: rangeMatch?.[1],
      damages,
      conditionsApplied: conditions.length > 0 ? conditions : undefined,
    };
  }

  // Try save patterns (2024 first, then 2014)
  const save2024Match = SAVE_2024_RE.exec(desc);
  if (save2024Match) {
    const saveAbility = ABILITY_SHORT_TO_LONG[save2024Match[1].toLowerCase()] || save2024Match[1].toUpperCase();
    const saveDC = parseInt(save2024Match[2], 10);
    const halfOnSave = HALF_ON_SAVE_RE.test(desc);

    return {
      name,
      rawDesc: desc,
      type: "save",
      saveDC,
      saveAbility,
      halfOnSave,
      damages,
      conditionsApplied: conditions.length > 0 ? conditions : undefined,
    };
  }

  const save2014Match = SAVE_2014_RE.exec(desc);
  if (save2014Match) {
    const saveDC = parseInt(save2014Match[1], 10);
    const saveAbility = ABILITY_LONG_TO_SHORT[save2014Match[2].toLowerCase()] || save2014Match[2].substring(0, 3).toUpperCase();
    const halfOnSave = HALF_ON_SAVE_RE.test(desc);

    return {
      name,
      rawDesc: desc,
      type: "save",
      saveDC,
      saveAbility,
      halfOnSave,
      damages,
      conditionsApplied: conditions.length > 0 ? conditions : undefined,
    };
  }

  // If we have damages but no attack/save pattern, still return as unknown with damages
  return {
    name,
    rawDesc: desc,
    type: damages.length > 0 ? "unknown" : "utility",
    damages,
    conditionsApplied: conditions.length > 0 ? conditions : undefined,
  };
}

/** Parse ALL actions from a monster (actions + legendary + reactions). */
export function parseAllActions(monster: SrdMonster): ParsedAction[] {
  const allActions: MonsterAction[] = [
    ...(monster.actions ?? []),
    ...(monster.legendary_actions ?? []),
    ...(monster.reactions ?? []),
  ];
  return allActions.map(parseMonsterAction);
}
