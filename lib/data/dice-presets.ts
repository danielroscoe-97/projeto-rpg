// ── Labels ────────────────────────────────────────────────────────
export const DICE_LABELS = {
  en: {
    title: "D&D 5e Dice Roller",
    subtitle: "Roll dice online — click to add, then roll",
    rollButton: "Roll!",
    clearTray: "Clear",
    customLabel: "Custom notation",
    customPlaceholder: "e.g. 2d6+5",
    customRoll: "Roll",
    history: "Roll History",
    clearHistory: "Clear",
    emptyHistory: "No rolls yet — click a die to start!",
    presets: "Quick Presets",
    modifier: "Modifier",
    mode: "Mode",
    normal: "Normal",
    advantage: "Advantage",
    disadvantage: "Disadvantage",
    critical: "Critical",
    resistance: "Resistance",
    presetsAbility: "Ability Checks",
    presetsSaves: "Saving Throws",
    presetsAttack: "Attacks",
    presetsDamage: "Common Damage",
    presetsHealing: "Healing",
  },
  "pt-BR": {
    title: "Rolador de Dados D&D 5e",
    subtitle: "Role dados online — clique para adicionar, depois role",
    rollButton: "Rolar!",
    clearTray: "Limpar",
    customLabel: "Notação personalizada",
    customPlaceholder: "ex: 2d6+5",
    customRoll: "Rolar",
    history: "Histórico de Rolagens",
    clearHistory: "Limpar",
    emptyHistory: "Nenhuma rolagem ainda — clique num dado!",
    presets: "Rolagens Rápidas",
    modifier: "Modificador",
    mode: "Modo",
    normal: "Normal",
    advantage: "Vantagem",
    disadvantage: "Desvantagem",
    critical: "Crítico",
    resistance: "Resistência",
    presetsAbility: "Testes de Habilidade",
    presetsSaves: "Testes de Resistência",
    presetsAttack: "Ataques",
    presetsDamage: "Dano Comum",
    presetsHealing: "Cura",
  },
} as const;

// ── Presets ───────────────────────────────────────────────────────
export interface PresetGroup {
  label: string;
  presets: { name: string; notation: string }[];
}

export function getDicePresets(L: typeof DICE_LABELS["en"] | typeof DICE_LABELS["pt-BR"], locale: "en" | "pt-BR"): PresetGroup[] {
  return [
    {
      label: L.presetsAttack,
      presets: [
        { name: locale === "pt-BR" ? "Ataque (d20)" : "Attack (d20)", notation: "1d20" },
        { name: locale === "pt-BR" ? "Ataque +5" : "Attack +5", notation: "1d20+5" },
        { name: locale === "pt-BR" ? "Ataque +8" : "Attack +8", notation: "1d20+8" },
      ],
    },
    {
      label: L.presetsDamage,
      presets: [
        { name: locale === "pt-BR" ? "Espada longa" : "Longsword", notation: "1d8+3" },
        { name: locale === "pt-BR" ? "Besta pesada" : "Heavy Crossbow", notation: "1d10+3" },
        { name: locale === "pt-BR" ? "Espada grande" : "Greatsword", notation: "2d6+4" },
        { name: "Fireball", notation: "8d6" },
        { name: "Sneak Attack (5d6)", notation: "5d6" },
      ],
    },
    {
      label: L.presetsHealing,
      presets: [
        { name: locale === "pt-BR" ? "Curar Ferimentos" : "Cure Wounds", notation: "1d8+3" },
        { name: locale === "pt-BR" ? "Palavra Curativa" : "Healing Word", notation: "1d4+3" },
        { name: locale === "pt-BR" ? "Poção de Cura" : "Healing Potion", notation: "2d4+2" },
      ],
    },
    {
      label: L.presetsAbility,
      presets: [
        { name: locale === "pt-BR" ? "Teste simples" : "Plain check", notation: "1d20" },
        { name: locale === "pt-BR" ? "Com +2" : "With +2", notation: "1d20+2" },
        { name: locale === "pt-BR" ? "Com +5" : "With +5", notation: "1d20+5" },
        { name: locale === "pt-BR" ? "Iniciativa" : "Initiative", notation: "1d20+2" },
      ],
    },
  ];
}
