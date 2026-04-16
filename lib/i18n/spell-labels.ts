// Bilingual spell labels — shared between Public and Auth compendium
// Extracted from PublicSpellCard to avoid duplication

export const SPELL_LABELS = {
  "en": {
    castingTime: "Casting Time",
    range: "Range",
    components: "Components",
    duration: "Duration",
    atHigherLevels: "At Higher Levels.",
    cantrip: "Cantrip",
    ritual: "ritual",
    concentration: "concentration",
    classes: "Classes",
  },
  "pt-BR": {
    castingTime: "Tempo de Conjuração",
    range: "Alcance",
    components: "Componentes",
    duration: "Duração",
    atHigherLevels: "Em Níveis Superiores.",
    cantrip: "Truque",
    ritual: "ritual",
    concentration: "concentração",
    classes: "Classes",
  },
} as const;

export const SCHOOL_PT: Record<string, string> = {
  Abjuration: "abjuração",
  Conjuration: "conjuração",
  Divination: "adivinhação",
  Enchantment: "encantamento",
  Evocation: "evocação",
  Illusion: "ilusão",
  Necromancy: "necromancia",
  Transmutation: "transmutação",
};

export const CLASS_PT: Record<string, string> = {
  Bard: "Bardo",
  Cleric: "Clérigo",
  Druid: "Druida",
  Paladin: "Paladino",
  Ranger: "Patrulheiro",
  Sorcerer: "Feiticeiro",
  Warlock: "Bruxo",
  Wizard: "Mago",
};

/** Format spell level string in the given locale */
export function formatSpellLevelLocale(level: number, school: string, locale: "en" | "pt-BR"): string {
  const isPt = locale === "pt-BR";
  const schoolLabel = isPt ? (SCHOOL_PT[school] ?? school.toLowerCase()) : school.toLowerCase();

  if (level === 0) {
    return isPt ? `Truque de ${schoolLabel}` : `${school} cantrip`;
  }

  if (isPt) {
    return `${schoolLabel} de ${level}º nível`;
  }

  // Handle 11th, 12th, 13th (and other teens) correctly
  const lastTwo = level % 100;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : ["st", "nd", "rd"][((level % 10) - 1)] || "th";
  return `${level}${suffix}-level ${schoolLabel}`;
}
