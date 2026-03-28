import type { DamageModifiers, DamageModifier, DamageModifierResult } from "@/lib/types/combat";
import type { SrdMonster } from "@/lib/srd/srd-loader";

export const DAMAGE_TYPES = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant",
  "slashing", "thunder",
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

/** Conditional suffixes that apply to groups of physical damage types */
const CONDITIONAL_RE = /\s+from\s+.+$/i;

/**
 * Parse a resistance/immunity/vulnerability string into structured data.
 *
 * Handles both SRD 2024 (semicolon-separated) and SRD 2014 (comma-separated) formats:
 * - "fire; poison" → [{ type: "fire" }, { type: "poison" }]
 * - "bludgeoning; piercing; slashing" → [{type:"bludgeoning"}, {type:"piercing"}, {type:"slashing"}]
 * - "bludgeoning, piercing, and slashing from nonmagical attacks" → [{type:"bludgeoning",condition:"from nonmagical attacks"}, ...]
 * - "fire; bludgeoning, piercing, and slashing from nonmagical attacks" → mixed
 */
function parseModifierString(raw: string | null | undefined): DamageModifier[] {
  if (!raw || raw.trim() === "") return [];

  const modifiers: DamageModifier[] = [];

  // Split by semicolons first (SRD 2024 primary separator)
  const groups = raw.split(";").map((g) => g.trim()).filter(Boolean);

  for (const group of groups) {
    // Check if this group has a conditional suffix
    const conditionalMatch = group.match(CONDITIONAL_RE);
    const condition = conditionalMatch ? conditionalMatch[0].trim() : undefined;
    const cleanGroup = condition ? group.replace(CONDITIONAL_RE, "").trim() : group;

    // Split by commas and clean up "and"
    const parts = cleanGroup
      .split(",")
      .map((p) => p.trim().replace(/^and\s+/i, "").trim())
      .filter(Boolean);

    for (const part of parts) {
      const lower = part.toLowerCase();
      // Only include known damage types
      if (DAMAGE_TYPES.includes(lower as DamageType)) {
        modifiers.push(condition ? { type: lower, condition } : { type: lower });
      } else {
        // Check if the part itself contains a conditional (SRD 2014 inline)
        const inlineConditional = part.match(/^(\w+)\s+(from\s+.+)$/i);
        if (inlineConditional) {
          const type = inlineConditional[1].toLowerCase();
          if (DAMAGE_TYPES.includes(type as DamageType)) {
            modifiers.push({ type, condition: inlineConditional[2].trim() });
          }
        }
      }
    }
  }

  return modifiers;
}

/** Parse condition immunities (simple semicolon/comma list) */
function parseConditionImmunities(raw: string | null | undefined): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(/[;,]/)
    .map((s) => s.trim().replace(/^and\s+/i, "").trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}

/** Parse all damage modifiers from an SRD monster */
export function parseDamageModifiers(monster: SrdMonster): DamageModifiers {
  return {
    resistances: parseModifierString(monster.damage_resistances),
    immunities: parseModifierString(monster.damage_immunities),
    vulnerabilities: parseModifierString(monster.damage_vulnerabilities),
    conditionImmunities: parseConditionImmunities(monster.condition_immunities),
  };
}

/**
 * Apply damage modification based on target's modifiers.
 * Priority: immune > resistant/vulnerable (but both can't apply to same type)
 * For conditional modifiers (e.g. "from nonmagical attacks"): default to NOT applying (DM can override)
 */
export function applyDamageModifier(
  baseDamage: number,
  damageType: string,
  modifiers: DamageModifiers,
  ignoreConditional = true,
): { finalDamage: number; applied: DamageModifierResult } {
  const normalizedType = damageType.toLowerCase();

  // Check immunity first (highest priority)
  const isImmune = modifiers.immunities.some(
    (m) => m.type === normalizedType && (!m.condition || !ignoreConditional)
  );
  if (isImmune) return { finalDamage: 0, applied: "immune" };

  // Check vulnerability
  const isVulnerable = modifiers.vulnerabilities.some(
    (m) => m.type === normalizedType && (!m.condition || !ignoreConditional)
  );
  if (isVulnerable) return { finalDamage: baseDamage * 2, applied: "vulnerable" };

  // Check resistance
  const isResistant = modifiers.resistances.some(
    (m) => m.type === normalizedType && (!m.condition || !ignoreConditional)
  );
  if (isResistant) return { finalDamage: Math.floor(baseDamage / 2), applied: "resistant" };

  return { finalDamage: baseDamage, applied: "normal" };
}
