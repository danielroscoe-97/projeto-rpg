// ── Section IDs ───────────────────────────────────────────────────
export const SECTION_IDS = [
  "combat-flow",
  "making-attacks",
  "damage-healing",
  "cover",
  "resting",
  "conditions",
  "spellcasting",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

// ── Labels ────────────────────────────────────────────────────────
export const RULES_LABELS = {
  en: {
    title: "D&D 5e Rules Reference",
    subtitle: "Essential rules from the SRD 5.1 for your table",
    toc: "Contents",
    sections: {
      "combat-flow": "Combat Flow",
      "making-attacks": "Making Attacks",
      "damage-healing": "Damage & Healing",
      "cover": "Cover",
      "resting": "Resting",
      "conditions": "Conditions Quick Reference",
      "spellcasting": "Spellcasting Basics",
    } as Record<SectionId, string>,
    srdNotice: "All content from the Systems Reference Document 5.1, licensed under CC-BY-4.0.",
  },
  "pt-BR": {
    title: "Referência de Regras D&D 5e",
    subtitle: "Regras essenciais do SRD 5.1 para sua mesa",
    toc: "Sumário",
    sections: {
      "combat-flow": "Fluxo de Combate",
      "making-attacks": "Realizando Ataques",
      "damage-healing": "Dano & Cura",
      "cover": "Cobertura",
      "resting": "Descanso",
      "conditions": "Referência Rápida de Condições",
      "spellcasting": "Básico de Conjuração",
    } as Record<SectionId, string>,
    srdNotice: "Todo conteúdo do Systems Reference Document 5.1, licenciado sob CC-BY-4.0.",
  },
} as const;
