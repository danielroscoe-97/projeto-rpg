/**
 * D&D 5e Skill and Ability Score constants — shared across proficiencies, PDF export, etc.
 */

export const ABILITY_SCORES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityScore = (typeof ABILITY_SCORES)[number];

export const SKILLS: ReadonlyArray<{ key: string; ability: AbilityScore }> = [
  { key: "acrobatics", ability: "dex" },
  { key: "animal_handling", ability: "wis" },
  { key: "arcana", ability: "int" },
  { key: "athletics", ability: "str" },
  { key: "deception", ability: "cha" },
  { key: "history", ability: "int" },
  { key: "insight", ability: "wis" },
  { key: "intimidation", ability: "cha" },
  { key: "investigation", ability: "int" },
  { key: "medicine", ability: "wis" },
  { key: "nature", ability: "int" },
  { key: "perception", ability: "wis" },
  { key: "performance", ability: "cha" },
  { key: "persuasion", ability: "cha" },
  { key: "religion", ability: "int" },
  { key: "sleight_of_hand", ability: "dex" },
  { key: "stealth", ability: "dex" },
  { key: "survival", ability: "wis" },
] as const;

/** Proficiency bonus by character level (D&D 5e PHB p.15) */
export function profBonusForLevel(level: number | null): number {
  if (!level || level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

/** Ability score → modifier (D&D 5e PHB p.13) */
export function getModifier(score: number | null): number {
  if (score == null) return 0;
  return Math.floor((score - 10) / 2);
}

/** Format modifier as +N or -N string */
export function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Capitalize skill key for display: "sleight_of_hand" → "Sleight of Hand" */
export function skillLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** HTML-escape user-provided strings to prevent XSS in generated HTML */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
