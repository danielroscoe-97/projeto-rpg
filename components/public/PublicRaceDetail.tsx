"use client";

import { useState } from "react";
import { SrdInitialCircle, SrdIconRuler, SrdIconBoot, SrdIconEye, SrdIconSpeech } from "./SrdIcons";

// ── Types ─────────────────────────────────────────────────────────
interface Trait {
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
}

interface Subrace {
  nameEn: string;
  namePt: string;
  abilityBonuses: { ability: string; bonus: string }[];
  traits: Trait[];
}

interface RaceData {
  slug: string;
  nameEn: string;
  namePt: string;
  icon: string;
  abilityBonuses: { ability: string; bonus: string }[];
  size: "Small" | "Medium";
  speed: number;
  darkvision: number | null;
  languagesEn: string;
  languagesPt: string;
  traits: Trait[];
  subrace: Subrace | null;
}

interface PublicRaceDetailProps {
  slug: string;
  locale?: "en" | "pt-BR";
}

// ── Ability score pill colors ─────────────────────────────────────
const ABILITY_COLORS: Record<string, string> = {
  STR: "bg-red-900/40 text-red-300 border-red-800/50",
  DEX: "bg-green-900/40 text-green-300 border-green-800/50",
  CON: "bg-orange-900/40 text-orange-300 border-orange-800/50",
  INT: "bg-blue-900/40 text-blue-300 border-blue-800/50",
  WIS: "bg-purple-900/40 text-purple-300 border-purple-800/50",
  CHA: "bg-yellow-900/30 text-[#D4A853] border-yellow-800/50",
  ALL: "bg-gray-800/50 text-gray-200 border-gray-700/50",
};

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    abilityScores: "Ability Score Bonuses",
    size: "Size",
    speed: "Speed",
    darkvision: "Darkvision",
    languages: "Languages",
    racialTraits: "Racial Traits",
    subrace: "Subrace",
    ft: "ft",
    small: "Small",
    medium: "Medium",
    none: "None",
  },
  "pt-BR": {
    abilityScores: "Bonus de Atributo",
    size: "Tamanho",
    speed: "Velocidade",
    darkvision: "Visao no Escuro",
    languages: "Idiomas",
    racialTraits: "Tracos Raciais",
    subrace: "Sub-raca",
    ft: "ft",
    small: "Pequeno",
    medium: "Medio",
    none: "Nenhuma",
  },
} as const;

// ── Race accent colors ───────────────────────────────────────────
const RACE_ACCENT: Record<string, string> = {
  dwarf: "#DD6B20",
  elf: "#38A169",
  halfling: "#D69E2E",
  human: "#A0AEC0",
  dragonborn: "#E53E3E",
  gnome: "#3182CE",
  "half-elf": "#805AD5",
  "half-orc": "#C53030",
  tiefling: "#9F7AEA",
};

// ── Complete SRD Race Data ────────────────────────────────────────
const RACE_DATA: Record<string, RaceData> = {
  dwarf: {
    slug: "dwarf",
    nameEn: "Dwarf",
    namePt: "Anao",
    icon: "D",
    abilityBonuses: [{ ability: "CON", bonus: "+2" }],
    size: "Medium",
    speed: 25,
    darkvision: 60,
    languagesEn: "Common, Dwarvish",
    languagesPt: "Comum, Anao",
    traits: [
      {
        nameEn: "Dwarven Resilience",
        namePt: "Resiliencia Ana",
        descriptionEn:
          "You have advantage on saving throws against poison, and you have resistance against poison damage.",
        descriptionPt:
          "Voce tem vantagem em testes de resistencia contra veneno e tem resistencia contra dano de veneno.",
      },
      {
        nameEn: "Dwarven Combat Training",
        namePt: "Treinamento de Combate Anao",
        descriptionEn:
          "You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.",
        descriptionPt:
          "Voce tem proficiencia com machado de batalha, machadinha, martelo leve e martelo de guerra.",
      },
      {
        nameEn: "Stonecunning",
        namePt: "Especialista em Rochas",
        descriptionEn:
          "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.",
        descriptionPt:
          "Sempre que fizer um teste de Inteligencia (Historia) relacionado a origem de trabalhos em pedra, voce e considerado proficiente na pericia Historia e adiciona o dobro do seu bonus de proficiencia ao teste.",
      },
      {
        nameEn: "Darkvision",
        namePt: "Visao no Escuro",
        descriptionEn:
          "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        descriptionPt:
          "Voce enxerga em luz fraca a ate 18 metros como se fosse luz plena, e no escuro como se fosse luz fraca. Voce nao consegue discernir cores no escuro, apenas tons de cinza.",
      },
    ],
    subrace: {
      nameEn: "Hill Dwarf",
      namePt: "Anao da Colina",
      abilityBonuses: [{ ability: "WIS", bonus: "+1" }],
      traits: [
        {
          nameEn: "Dwarven Toughness",
          namePt: "Robustez Ana",
          descriptionEn:
            "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.",
          descriptionPt:
            "Seu maximo de pontos de vida aumenta em 1 e aumenta em 1 cada vez que voce ganha um nivel.",
        },
      ],
    },
  },
  elf: {
    slug: "elf",
    nameEn: "Elf",
    namePt: "Elfo",
    icon: "E",
    abilityBonuses: [{ ability: "DEX", bonus: "+2" }],
    size: "Medium",
    speed: 30,
    darkvision: 60,
    languagesEn: "Common, Elvish",
    languagesPt: "Comum, Elfico",
    traits: [
      {
        nameEn: "Keen Senses",
        namePt: "Sentidos Aguados",
        descriptionEn: "You have proficiency in the Perception skill.",
        descriptionPt: "Voce tem proficiencia na pericia Percepcao.",
      },
      {
        nameEn: "Fey Ancestry",
        namePt: "Ancestralidade Ferica",
        descriptionEn:
          "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        descriptionPt:
          "Voce tem vantagem em testes de resistencia contra ser encantado e magia nao pode coloca-lo para dormir.",
      },
      {
        nameEn: "Trance",
        namePt: "Transe",
        descriptionEn:
          "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep.",
        descriptionPt:
          "Elfos nao precisam dormir. Em vez disso, meditam profundamente por 4 horas por dia. Apos descansar dessa forma, voce ganha o mesmo beneficio que um humano ganha com 8 horas de sono.",
      },
      {
        nameEn: "Darkvision",
        namePt: "Visao no Escuro",
        descriptionEn:
          "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        descriptionPt:
          "Voce enxerga em luz fraca a ate 18 metros como se fosse luz plena, e no escuro como se fosse luz fraca. Voce nao consegue discernir cores no escuro, apenas tons de cinza.",
      },
    ],
    subrace: {
      nameEn: "High Elf",
      namePt: "Alto Elfo",
      abilityBonuses: [{ ability: "INT", bonus: "+1" }],
      traits: [
        {
          nameEn: "Elf Weapon Training",
          namePt: "Treinamento com Armas Elficas",
          descriptionEn:
            "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
          descriptionPt:
            "Voce tem proficiencia com espada longa, espada curta, arco curto e arco longo.",
        },
        {
          nameEn: "Cantrip",
          namePt: "Truque",
          descriptionEn:
            "You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it.",
          descriptionPt:
            "Voce conhece um truque a sua escolha da lista de magias de mago. Inteligencia e seu atributo de conjuracao para ele.",
        },
        {
          nameEn: "Extra Language",
          namePt: "Idioma Adicional",
          descriptionEn:
            "You can speak, read, and write one extra language of your choice.",
          descriptionPt:
            "Voce pode falar, ler e escrever um idioma adicional a sua escolha.",
        },
      ],
    },
  },
  halfling: {
    slug: "halfling",
    nameEn: "Halfling",
    namePt: "Halfling",
    icon: "H",
    abilityBonuses: [{ ability: "DEX", bonus: "+2" }],
    size: "Small",
    speed: 25,
    darkvision: null,
    languagesEn: "Common, Halfling",
    languagesPt: "Comum, Halfling",
    traits: [
      {
        nameEn: "Lucky",
        namePt: "Sortudo",
        descriptionEn:
          "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.",
        descriptionPt:
          "Quando voce rolar um 1 no d20 para uma jogada de ataque, teste de habilidade ou teste de resistencia, voce pode rolar o dado novamente e deve usar a nova rolagem.",
      },
      {
        nameEn: "Brave",
        namePt: "Corajoso",
        descriptionEn:
          "You have advantage on saving throws against being frightened.",
        descriptionPt:
          "Voce tem vantagem em testes de resistencia contra ser amedrontado.",
      },
      {
        nameEn: "Halfling Nimbleness",
        namePt: "Agilidade Halfling",
        descriptionEn:
          "You can move through the space of any creature that is of a size larger than yours.",
        descriptionPt:
          "Voce pode se mover atraves do espaco de qualquer criatura que seja de um tamanho maior que o seu.",
      },
    ],
    subrace: {
      nameEn: "Lightfoot",
      namePt: "Pes Leves",
      abilityBonuses: [{ ability: "CHA", bonus: "+1" }],
      traits: [
        {
          nameEn: "Naturally Stealthy",
          namePt: "Naturalmente Furtivo",
          descriptionEn:
            "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.",
          descriptionPt:
            "Voce pode tentar se esconder mesmo quando esta obscurecido apenas por uma criatura que seja pelo menos um tamanho maior que voce.",
        },
      ],
    },
  },
  human: {
    slug: "human",
    nameEn: "Human",
    namePt: "Humano",
    icon: "H",
    abilityBonuses: [{ ability: "ALL", bonus: "+1" }],
    size: "Medium",
    speed: 30,
    darkvision: null,
    languagesEn: "Common, one extra language of your choice",
    languagesPt: "Comum, um idioma adicional a sua escolha",
    traits: [
      {
        nameEn: "Ability Score Increase",
        namePt: "Aumento de Atributo",
        descriptionEn:
          "Your ability scores each increase by 1.",
        descriptionPt:
          "Todos os seus atributos aumentam em 1.",
      },
      {
        nameEn: "Extra Language",
        namePt: "Idioma Adicional",
        descriptionEn:
          "You can speak, read, and write one extra language of your choice.",
        descriptionPt:
          "Voce pode falar, ler e escrever um idioma adicional a sua escolha.",
      },
    ],
    subrace: null,
  },
  dragonborn: {
    slug: "dragonborn",
    nameEn: "Dragonborn",
    namePt: "Draconato",
    icon: "D",
    abilityBonuses: [
      { ability: "STR", bonus: "+2" },
      { ability: "CHA", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    darkvision: null,
    languagesEn: "Common, Draconic",
    languagesPt: "Comum, Draconico",
    traits: [
      {
        nameEn: "Draconic Ancestry",
        namePt: "Ancestralidade Draconica",
        descriptionEn:
          "You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type.",
        descriptionPt:
          "Voce tem ancestralidade draconica. Escolha um tipo de dragao da tabela de Ancestralidade Draconica. Sua arma de sopro e resistencia a dano sao determinados pelo tipo de dragao.",
      },
      {
        nameEn: "Breath Weapon",
        namePt: "Arma de Sopro",
        descriptionEn:
          "You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation. Each creature in the area must make a saving throw (DC = 8 + CON mod + proficiency bonus). Damage: 2d6 at 1st level, scaling to 3d6 at 6th, 4d6 at 11th, and 5d6 at 16th level. Usable once per short or long rest.",
        descriptionPt:
          "Voce pode usar sua acao para exalar energia destrutiva. Sua ancestralidade draconica determina o tamanho, forma e tipo de dano da exalacao. Cada criatura na area deve fazer um teste de resistencia (CD = 8 + mod CON + bonus de proficiencia). Dano: 2d6 no 1o nivel, escalando para 3d6 no 6o, 4d6 no 11o e 5d6 no 16o nivel. Utilizavel uma vez por descanso curto ou longo.",
      },
      {
        nameEn: "Damage Resistance",
        namePt: "Resistencia a Dano",
        descriptionEn:
          "You have resistance to the damage type associated with your draconic ancestry.",
        descriptionPt:
          "Voce tem resistencia ao tipo de dano associado a sua ancestralidade draconica.",
      },
    ],
    subrace: null,
  },
  gnome: {
    slug: "gnome",
    nameEn: "Gnome",
    namePt: "Gnomo",
    icon: "G",
    abilityBonuses: [{ ability: "INT", bonus: "+2" }],
    size: "Small",
    speed: 25,
    darkvision: 60,
    languagesEn: "Common, Gnomish",
    languagesPt: "Comum, Gnomico",
    traits: [
      {
        nameEn: "Gnome Cunning",
        namePt: "Esperteza Gnomida",
        descriptionEn:
          "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.",
        descriptionPt:
          "Voce tem vantagem em todos os testes de resistencia de Inteligencia, Sabedoria e Carisma contra magia.",
      },
      {
        nameEn: "Darkvision",
        namePt: "Visao no Escuro",
        descriptionEn:
          "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        descriptionPt:
          "Voce enxerga em luz fraca a ate 18 metros como se fosse luz plena, e no escuro como se fosse luz fraca. Voce nao consegue discernir cores no escuro, apenas tons de cinza.",
      },
    ],
    subrace: {
      nameEn: "Rock Gnome",
      namePt: "Gnomo das Rochas",
      abilityBonuses: [{ ability: "CON", bonus: "+1" }],
      traits: [
        {
          nameEn: "Artificer's Lore",
          namePt: "Conhecimento de Artificer",
          descriptionEn:
            "Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus, instead of any proficiency bonus you normally apply.",
          descriptionPt:
            "Sempre que fizer um teste de Inteligencia (Historia) relacionado a itens magicos, objetos alquimicos ou dispositivos tecnologicos, voce pode adicionar o dobro do seu bonus de proficiencia, em vez de qualquer bonus de proficiencia que normalmente aplicaria.",
        },
        {
          nameEn: "Tinker",
          namePt: "Engenhoqueiro",
          descriptionEn:
            "You have proficiency with artisan's tools (tinker's tools). Using those tools, you can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device (AC 5, 1 hp). The device ceases to function after 24 hours unless you spend 1 hour repairing it.",
          descriptionPt:
            "Voce tem proficiencia com ferramentas de artesao (ferramentas de funileiro). Usando essas ferramentas, voce pode gastar 1 hora e 10 po em materiais para construir um Minusculo dispositivo mecanico (CA 5, 1 pv). O dispositivo para de funcionar apos 24 horas, a menos que voce gaste 1 hora consertando-o.",
        },
      ],
    },
  },
  "half-elf": {
    slug: "half-elf",
    nameEn: "Half-Elf",
    namePt: "Meio-Elfo",
    icon: "HE",
    abilityBonuses: [
      { ability: "CHA", bonus: "+2" },
      { ability: "ALL", bonus: "+1 x2" },
    ],
    size: "Medium",
    speed: 30,
    darkvision: 60,
    languagesEn: "Common, Elvish, one extra language of your choice",
    languagesPt: "Comum, Elfico, um idioma adicional a sua escolha",
    traits: [
      {
        nameEn: "Fey Ancestry",
        namePt: "Ancestralidade Ferica",
        descriptionEn:
          "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        descriptionPt:
          "Voce tem vantagem em testes de resistencia contra ser encantado e magia nao pode coloca-lo para dormir.",
      },
      {
        nameEn: "Skill Versatility",
        namePt: "Versatilidade em Pericias",
        descriptionEn:
          "You gain proficiency in two skills of your choice.",
        descriptionPt:
          "Voce ganha proficiencia em duas pericias a sua escolha.",
      },
      {
        nameEn: "Darkvision",
        namePt: "Visao no Escuro",
        descriptionEn:
          "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        descriptionPt:
          "Voce enxerga em luz fraca a ate 18 metros como se fosse luz plena, e no escuro como se fosse luz fraca. Voce nao consegue discernir cores no escuro, apenas tons de cinza.",
      },
    ],
    subrace: null,
  },
  "half-orc": {
    slug: "half-orc",
    nameEn: "Half-Orc",
    namePt: "Meio-Orc",
    icon: "HO",
    abilityBonuses: [
      { ability: "STR", bonus: "+2" },
      { ability: "CON", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    darkvision: 60,
    languagesEn: "Common, Orc",
    languagesPt: "Comum, Orc",
    traits: [
      {
        nameEn: "Menacing",
        namePt: "Ameacador",
        descriptionEn:
          "You gain proficiency in the Intimidation skill.",
        descriptionPt:
          "Voce ganha proficiencia na pericia Intimidacao.",
      },
      {
        nameEn: "Relentless Endurance",
        namePt: "Resistencia Incansavel",
        descriptionEn:
          "When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can't use this feature again until you finish a long rest.",
        descriptionPt:
          "Quando voce e reduzido a 0 pontos de vida mas nao e morto instantaneamente, voce pode cair para 1 ponto de vida em vez disso. Voce nao pode usar essa caracteristica novamente ate terminar um descanso longo.",
      },
      {
        nameEn: "Savage Attacks",
        namePt: "Ataques Selvagens",
        descriptionEn:
          "When you score a critical hit with a melee weapon attack, you can roll one of the weapon's damage dice one additional time and add it to the extra damage of the critical hit.",
        descriptionPt:
          "Quando voce acerta um critico com um ataque corpo a corpo com arma, voce pode rolar um dos dados de dano da arma uma vez adicional e somar ao dano extra do critico.",
      },
      {
        nameEn: "Darkvision",
        namePt: "Visao no Escuro",
        descriptionEn:
          "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        descriptionPt:
          "Voce enxerga em luz fraca a ate 18 metros como se fosse luz plena, e no escuro como se fosse luz fraca. Voce nao consegue discernir cores no escuro, apenas tons de cinza.",
      },
    ],
    subrace: null,
  },
  tiefling: {
    slug: "tiefling",
    nameEn: "Tiefling",
    namePt: "Tiefling",
    icon: "T",
    abilityBonuses: [
      { ability: "CHA", bonus: "+2" },
      { ability: "INT", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    darkvision: 60,
    languagesEn: "Common, Infernal",
    languagesPt: "Comum, Infernal",
    traits: [
      {
        nameEn: "Hellish Resistance",
        namePt: "Resistencia Infernal",
        descriptionEn: "You have resistance to fire damage.",
        descriptionPt: "Voce tem resistencia a dano de fogo.",
      },
      {
        nameEn: "Infernal Legacy",
        namePt: "Legado Infernal",
        descriptionEn:
          "You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.",
        descriptionPt:
          "Voce conhece o truque taumaturgia. Quando atingir o 3o nivel, voce pode conjurar repreensao infernal como magia de 2o nivel uma vez com esse traco e recupera a habilidade de faze-lo ao terminar um descanso longo. Quando atingir o 5o nivel, voce pode conjurar escuridao uma vez com esse traco e recupera a habilidade de faze-lo ao terminar um descanso longo. Carisma e seu atributo de conjuracao para essas magias.",
      },
      {
        nameEn: "Darkvision",
        namePt: "Visao no Escuro",
        descriptionEn:
          "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can't discern color in darkness, only shades of gray.",
        descriptionPt:
          "Voce enxerga em luz fraca a ate 18 metros como se fosse luz plena, e no escuro como se fosse luz fraca. Voce nao consegue discernir cores no escuro, apenas tons de cinza.",
      },
    ],
    subrace: null,
  },
};

// ── Expandable Trait Card ─────────────────────────────────────────
function TraitCard({
  trait,
  locale,
}: {
  trait: Trait;
  locale: "en" | "pt-BR";
}) {
  const [open, setOpen] = useState(false);
  const name = locale === "pt-BR" ? trait.namePt : trait.nameEn;
  const desc = locale === "pt-BR" ? trait.descriptionPt : trait.descriptionEn;

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-lg border border-white/[0.06] bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[#F5F0E8] text-sm">
          {name}
        </h3>
        <span
          className={`text-gray-500 text-xs transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          &#x25BC;
        </span>
      </div>
      {open && (
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">{desc}</p>
      )}
      {!open && (
        <p className="text-gray-500 text-xs mt-1 line-clamp-1">{desc}</p>
      )}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────
export function PublicRaceDetail({
  slug,
  locale = "en",
}: PublicRaceDetailProps) {
  const race = RACE_DATA[slug];
  const L = LABELS[locale];

  if (!race) {
    return (
      <div className="text-center py-20 text-gray-500">Race not found.</div>
    );
  }

  const displayName = locale === "pt-BR" ? race.namePt : race.nameEn;
  const secondaryName = locale === "pt-BR" ? race.nameEn : race.namePt;

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <SrdInitialCircle
          letter={race.icon}
          color={RACE_ACCENT[race.slug]}
          className="w-14 h-14 text-2xl shrink-0"
        />
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)]">
            {displayName}
          </h1>
          <p className="text-gray-500 italic text-sm mt-0.5">
            {secondaryName}
          </p>
          {/* Ability bonus pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {race.abilityBonuses.map((b) => (
              <span
                key={b.ability + b.bonus}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold border ${
                  ABILITY_COLORS[b.ability] ?? ABILITY_COLORS.ALL
                }`}
              >
                {b.ability} {b.bonus}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Size */}
        <div className="rounded-lg border border-white/[0.06] bg-gray-900/50 p-3 text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
            <SrdIconRuler className="w-3.5 h-3.5" /> {L.size}
          </div>
          <div className="text-sm font-semibold text-gray-200">
            {race.size === "Small" ? L.small : L.medium}
          </div>
        </div>
        {/* Speed */}
        <div className="rounded-lg border border-white/[0.06] bg-gray-900/50 p-3 text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
            <SrdIconBoot className="w-3.5 h-3.5" /> {L.speed}
          </div>
          <div className="text-sm font-semibold text-gray-200">
            {race.speed} {L.ft}
          </div>
        </div>
        {/* Darkvision */}
        <div className="rounded-lg border border-white/[0.06] bg-gray-900/50 p-3 text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
            <SrdIconEye className="w-3.5 h-3.5" /> {L.darkvision}
          </div>
          <div className="text-sm font-semibold text-gray-200">
            {race.darkvision ? `${race.darkvision} ${L.ft}` : L.none}
          </div>
        </div>
        {/* Languages */}
        <div className="rounded-lg border border-white/[0.06] bg-gray-900/50 p-3 text-center">
          <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
            <SrdIconSpeech className="w-3.5 h-3.5" /> {L.languages}
          </div>
          <div className="text-sm font-semibold text-gray-200">
            {locale === "pt-BR" ? race.languagesPt : race.languagesEn}
          </div>
        </div>
      </div>

      {/* Racial Traits */}
      <section>
        <h2 className="text-xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] mb-4">
          {L.racialTraits}
        </h2>
        <div className="space-y-2">
          {race.traits.map((t) => (
            <TraitCard
              key={t.nameEn}
              trait={t}
              locale={locale}
            />
          ))}
        </div>
      </section>

      {/* Subrace */}
      {race.subrace && (
        <section className="ml-0 sm:ml-4 pl-4 border-l-2 border-[#D4A853]/20">
          <h2 className="text-xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] mb-1">
            {L.subrace}:{" "}
            <span className="text-[#D4A853]">
              {locale === "pt-BR"
                ? race.subrace.namePt
                : race.subrace.nameEn}
            </span>
          </h2>
          {/* Subrace ability bonuses */}
          <div className="flex flex-wrap gap-1.5 mb-4 mt-2">
            {race.subrace.abilityBonuses.map((b) => (
              <span
                key={b.ability + b.bonus}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                  ABILITY_COLORS[b.ability] ?? ABILITY_COLORS.ALL
                }`}
              >
                {b.ability} {b.bonus}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {race.subrace.traits.map((t) => (
              <TraitCard
                key={t.nameEn}
                trait={t}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

