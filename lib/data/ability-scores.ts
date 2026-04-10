import type { ReactNode } from "react";
import React from "react";
import {
  SrdIconMuscle,
  SrdIconRun,
  SrdIconHeart,
  SrdIconBrain,
  SrdIconEye,
  SrdIconSparkle,
} from "@/components/public/SrdIcons";

// ── Types ─────────────────────────────────────────────────────────
export interface AbilityScore {
  key: string;
  nameEN: string;
  namePT: string;
  abbrEN: string;
  abbrPT: string;
  icon: ReactNode;
  color: string;
  colorBg: string;
  colorBorder: string;
  descriptionEN: string;
  descriptionPT: string;
  skillsEN: string[];
  skillsPT: string[];
  savingThrowEN: string;
  savingThrowPT: string;
  commonUsesEN: string[];
  commonUsesPT: string[];
}

// ── Data ──────────────────────────────────────────────────────────
export const ABILITIES: AbilityScore[] = [
  {
    key: "str",
    nameEN: "Strength",
    namePT: "Força",
    abbrEN: "STR",
    abbrPT: "FOR",
    icon: React.createElement(SrdIconMuscle, { className: "w-8 h-8" }),
    color: "#E53E3E",
    colorBg: "rgba(229,62,62,0.08)",
    colorBorder: "rgba(229,62,62,0.25)",
    descriptionEN:
      "Strength measures bodily power, athletic training, and the extent to which you can exert raw physical force.",
    descriptionPT:
      "Força mede o poder corporal, treinamento atlético e a extensão com que você pode exercer força física bruta.",
    skillsEN: ["Athletics"],
    skillsPT: ["Atletismo"],
    savingThrowEN: "Strength saving throws resist being pushed, restrained, or physically overpowered.",
    savingThrowPT: "Testes de resistência de Força resistem a empurrões, contenção e sobrecarga física.",
    commonUsesEN: [
      "Melee attack rolls (most weapons)",
      "Damage rolls with melee weapons",
      "Carrying capacity & encumbrance",
      "Breaking objects & forcing doors",
      "Grapple & shove contests",
    ],
    commonUsesPT: [
      "Rolagens de ataque corpo a corpo (maioria das armas)",
      "Rolagens de dano com armas corpo a corpo",
      "Capacidade de carga & sobrecarga",
      "Quebrar objetos & forçar portas",
      "Disputas de agarrar & empurrar",
    ],
  },
  {
    key: "dex",
    nameEN: "Dexterity",
    namePT: "Destreza",
    abbrEN: "DEX",
    abbrPT: "DES",
    icon: React.createElement(SrdIconRun, { className: "w-8 h-8" }),
    color: "#38A169",
    colorBg: "rgba(56,161,105,0.08)",
    colorBorder: "rgba(56,161,105,0.25)",
    descriptionEN:
      "Dexterity measures agility, reflexes, and balance. It is the key ability for ranged attacks and avoiding danger.",
    descriptionPT:
      "Destreza mede agilidade, reflexos e equilíbrio. É o atributo principal para ataques à distância e para evitar perigos.",
    skillsEN: ["Acrobatics", "Sleight of Hand", "Stealth"],
    skillsPT: ["Acrobacia", "Prestidigitação", "Furtividade"],
    savingThrowEN: "Dexterity saving throws dodge area effects like fireballs, traps, and breath weapons.",
    savingThrowPT: "Testes de resistência de Destreza esquivam de efeitos em área como bolas de fogo, armadilhas e sopros.",
    commonUsesEN: [
      "Ranged attack rolls",
      "Initiative rolls",
      "Armor Class (light armor, no armor)",
      "Finesse weapon attacks",
      "Dodging area-of-effect spells",
    ],
    commonUsesPT: [
      "Rolagens de ataque à distância",
      "Rolagens de iniciativa",
      "Classe de Armadura (armadura leve, sem armadura)",
      "Ataques com armas de acuidade",
      "Esquivar de magias de área",
    ],
  },
  {
    key: "con",
    nameEN: "Constitution",
    namePT: "Constituição",
    abbrEN: "CON",
    abbrPT: "CON",
    icon: React.createElement(SrdIconHeart, { className: "w-8 h-8" }),
    color: "#DD6B20",
    colorBg: "rgba(221,107,32,0.08)",
    colorBorder: "rgba(221,107,32,0.25)",
    descriptionEN:
      "Constitution measures health, stamina, and vital force. It determines how many hit points you have.",
    descriptionPT:
      "Constituição mede saúde, vigor e força vital. Determina quantos pontos de vida você possui.",
    skillsEN: [],
    skillsPT: [],
    savingThrowEN: "Constitution saving throws resist poison, disease, and effects that drain vitality.",
    savingThrowPT: "Testes de resistência de Constituição resistem a veneno, doenças e efeitos que drenam vitalidade.",
    commonUsesEN: [
      "Hit point maximum (per level)",
      "Concentration checks on spells",
      "Resisting poison & disease",
      "Enduring harsh environments",
      "Death saving throws are not CON-based but benefit from high HP",
    ],
    commonUsesPT: [
      "Máximo de pontos de vida (por nível)",
      "Testes de concentração em magias",
      "Resistir a veneno & doenças",
      "Suportar ambientes hostis",
      "Salvaguardas contra morte se beneficiam de HP alto",
    ],
  },
  {
    key: "int",
    nameEN: "Intelligence",
    namePT: "Inteligência",
    abbrEN: "INT",
    abbrPT: "INT",
    icon: React.createElement(SrdIconBrain, { className: "w-8 h-8" }),
    color: "#3182CE",
    colorBg: "rgba(49,130,206,0.08)",
    colorBorder: "rgba(49,130,206,0.25)",
    descriptionEN:
      "Intelligence measures mental acuity, accuracy of recall, and the ability to reason. It is the spellcasting ability for wizards.",
    descriptionPT:
      "Inteligência mede acuidade mental, precisão de memória e capacidade de raciocínio. É o atributo de conjuração para magos.",
    skillsEN: ["Arcana", "History", "Investigation", "Nature", "Religion"],
    skillsPT: ["Arcanismo", "História", "Investigação", "Natureza", "Religião"],
    savingThrowEN: "Intelligence saving throws resist illusions, psychic attacks, and mental manipulation.",
    savingThrowPT: "Testes de resistência de Inteligência resistem a ilusões, ataques psíquicos e manipulação mental.",
    commonUsesEN: [
      "Wizard spellcasting modifier",
      "Spell save DC (wizards)",
      "Recalling lore & knowledge",
      "Solving puzzles & riddles",
      "Detecting illusions",
    ],
    commonUsesPT: [
      "Modificador de conjuração do mago",
      "CD de resistência a magias (magos)",
      "Recordar conhecimento & lendas",
      "Resolver enigmas & charadas",
      "Detectar ilusões",
    ],
  },
  {
    key: "wis",
    nameEN: "Wisdom",
    namePT: "Sabedoria",
    abbrEN: "WIS",
    abbrPT: "SAB",
    icon: React.createElement(SrdIconEye, { className: "w-8 h-8" }),
    color: "#805AD5",
    colorBg: "rgba(128,90,213,0.08)",
    colorBorder: "rgba(128,90,213,0.25)",
    descriptionEN:
      "Wisdom reflects how attuned you are to the world around you and represents perceptiveness and intuition. It is the spellcasting ability for clerics, druids, and rangers.",
    descriptionPT:
      "Sabedoria reflete o quão sintonizado você está com o mundo ao redor e representa percepção e intuição. É o atributo de conjuração para clérigos, druidas e patrulheiros.",
    skillsEN: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
    skillsPT: ["Lidar com Animais", "Intuição", "Medicina", "Percepção", "Sobrevivência"],
    savingThrowEN: "Wisdom saving throws resist charm, fear, and effects that assault willpower.",
    savingThrowPT: "Testes de resistência de Sabedoria resistem a encantamentos, medo e efeitos contra a força de vontade.",
    commonUsesEN: [
      "Cleric, druid, ranger spellcasting",
      "Passive Perception (10 + modifier)",
      "Detecting hidden creatures",
      "Resisting charm & fear effects",
      "Sensing motives & deception",
    ],
    commonUsesPT: [
      "Conjuração de clérigo, druida, patrulheiro",
      "Percepção Passiva (10 + modificador)",
      "Detectar criaturas ocultas",
      "Resistir efeitos de encantamento & medo",
      "Perceber motivações & enganos",
    ],
  },
  {
    key: "cha",
    nameEN: "Charisma",
    namePT: "Carisma",
    abbrEN: "CHA",
    abbrPT: "CAR",
    icon: React.createElement(SrdIconSparkle, { className: "w-8 h-8" }),
    color: "#D69E2E",
    colorBg: "rgba(214,158,46,0.08)",
    colorBorder: "rgba(214,158,46,0.25)",
    descriptionEN:
      "Charisma measures your ability to interact effectively with others. It includes confidence, eloquence, and leadership. It is the spellcasting ability for bards, sorcerers, warlocks, and paladins.",
    descriptionPT:
      "Carisma mede sua capacidade de interagir efetivamente com outros. Inclui confiança, eloquência e liderança. É o atributo de conjuração para bardos, feiticeiros, bruxos e paladinos.",
    skillsEN: ["Deception", "Intimidation", "Performance", "Persuasion"],
    skillsPT: ["Enganação", "Intimidação", "Atuação", "Persuasão"],
    savingThrowEN: "Charisma saving throws resist banishment, possession, and effects that override personality.",
    savingThrowPT: "Testes de resistência de Carisma resistem a banimento, possessão e efeitos que anulam a personalidade.",
    commonUsesEN: [
      "Bard, sorcerer, warlock, paladin spellcasting",
      "Social interactions & negotiations",
      "Counterspell & dispel magic contests",
      "Resisting banishment & possession",
      "Inspiring allies & commanding presence",
    ],
    commonUsesPT: [
      "Conjuração de bardo, feiticeiro, bruxo, paladino",
      "Interações sociais & negociações",
      "Disputas de Contramágica & Dissipar Magia",
      "Resistir a banimento & possessão",
      "Inspirar aliados & impor presença",
    ],
  },
];
