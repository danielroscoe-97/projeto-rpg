import type { ReactNode } from "react";
import React from "react";
import {
  SrdIconDroplet,
  SrdIconHammer,
  SrdIconSnowflake,
  SrdIconFlame,
  SrdIconSparkle,
  SrdIconLightning,
  SrdIconMoon,
  SrdIconDagger,
  SrdIconVial,
  SrdIconBrain,
  SrdIconSun,
  SrdIconSlash,
  SrdIconExplosion,
} from "@/components/public/SrdIcons";

// ── Types ─────────────────────────────────────────────────────────
export interface DamageTypeEntry {
  id: string;
  nameEn: string;
  namePt: string;
  icon: ReactNode;
  color: string;
  group: "physical" | "elemental" | "magical";
  descriptionEn: string;
  descriptionPt: string;
  sourcesEn: string[];
  sourcesPt: string[];
  resistanceEn: string;
  resistancePt: string;
  immunityEn: string;
  immunityPt: string;
}

// ── Data ──────────────────────────────────────────────────────────
export const DAMAGE_TYPES: DamageTypeEntry[] = [
  {
    id: "acid",
    nameEn: "Acid",
    namePt: "Ácido",
    icon: React.createElement(SrdIconDroplet, { className: "w-6 h-6" }),
    color: "#68D391",
    group: "elemental",
    descriptionEn:
      "Corrosive spray of black dragon breath and dissolving enzymes.",
    descriptionPt:
      "Spray corrosivo do sopro de dragão negro e enzimas dissolventes.",
    sourcesEn: [
      "Black Dragon breath weapon",
      "Acid Splash cantrip",
      "Melf's Acid Arrow",
      "Green Dragon (poison/acid variant creatures)",
    ],
    sourcesPt: [
      "Sopro de Dragão Negro",
      "Truque Respingo Ácido",
      "Flecha Ácida de Melf",
      "Dragão Verde (criaturas variantes de ácido)",
    ],
    resistanceEn: "Black dragons, some oozes, and acid-dwelling creatures.",
    resistancePt: "Dragões negros, algumas gosmas e criaturas ácidas.",
    immunityEn: "Black dragons (immune), ochre jelly, gray ooze.",
    immunityPt: "Dragões negros (imune), geleia ocre, gosma cinzenta.",
  },
  {
    id: "bludgeoning",
    nameEn: "Bludgeoning",
    namePt: "Contundente",
    icon: React.createElement(SrdIconHammer, { className: "w-6 h-6" }),
    color: "#A0AEC0",
    group: "physical",
    descriptionEn:
      "Blunt force attacks -- hammers, falling, constriction.",
    descriptionPt:
      "Ataques de força bruta -- martelos, quedas, constrição.",
    sourcesEn: [
      "Mace, warhammer, quarterstaff",
      "Falling damage",
      "Giant's slam attacks",
      "Constriction (snakes, tentacles)",
    ],
    sourcesPt: [
      "Maça, martelo de guerra, bordão",
      "Dano por queda",
      "Ataques de esmagar de gigantes",
      "Constrição (cobras, tentáculos)",
    ],
    resistanceEn:
      "Skeletons (vulnerable), many constructs, were-creatures (nonmagical).",
    resistancePt:
      "Esqueletos (vulneráveis), muitos constructos, licantropos (não-mágico).",
    immunityEn: "Some golems, swarms (partial).",
    immunityPt: "Alguns golems, enxames (parcial).",
  },
  {
    id: "cold",
    nameEn: "Cold",
    namePt: "Frio",
    icon: React.createElement(SrdIconSnowflake, { className: "w-6 h-6" }),
    color: "#63B3ED",
    group: "elemental",
    descriptionEn:
      "Infernal chill of ice storm and white dragon breath.",
    descriptionPt:
      "Frio infernal de tempestade de gelo e sopro de dragão branco.",
    sourcesEn: [
      "White Dragon breath weapon",
      "Ray of Frost cantrip",
      "Ice Storm, Cone of Cold",
      "Ice mephits, frost giants",
    ],
    sourcesPt: [
      "Sopro de Dragão Branco",
      "Truque Raio de Gelo",
      "Tempestade de Gelo, Cone de Frio",
      "Mefitas de gelo, gigantes de gelo",
    ],
    resistanceEn: "White dragons, frost giants, ice elementals.",
    resistancePt: "Dragões brancos, gigantes de gelo, elementais de gelo.",
    immunityEn: "White dragons (immune), ice devils, frost salamanders.",
    immunityPt: "Dragões brancos (imune), diabos de gelo, salamandras glaciais.",
  },
  {
    id: "fire",
    nameEn: "Fire",
    namePt: "Fogo",
    icon: React.createElement(SrdIconFlame, { className: "w-6 h-6" }),
    color: "#F56565",
    group: "elemental",
    descriptionEn:
      "Red dragon breath and fireball -- the most resisted damage type.",
    descriptionPt:
      "Sopro de dragão vermelho e bola de fogo -- o tipo de dano mais resistido.",
    sourcesEn: [
      "Red Dragon breath weapon",
      "Fireball, Fire Bolt cantrip",
      "Burning Hands, Wall of Fire",
      "Fire elementals, hell hounds",
    ],
    sourcesPt: [
      "Sopro de Dragão Vermelho",
      "Bola de Fogo, Truque Rajada de Fogo",
      "Mãos Flamejantes, Muralha de Fogo",
      "Elementais de fogo, cães infernais",
    ],
    resistanceEn:
      "Red dragons, fire giants, tieflings, many fiends. Most common resistance.",
    resistancePt:
      "Dragões vermelhos, gigantes de fogo, tieflings, muitos demonianos. Resistência mais comum.",
    immunityEn: "Red dragons (immune), fire elementals, efreeti.",
    immunityPt: "Dragões vermelhos (imune), elementais de fogo, efreeti.",
  },
  {
    id: "force",
    nameEn: "Force",
    namePt: "Força",
    icon: React.createElement(SrdIconSparkle, { className: "w-6 h-6" }),
    color: "#B794F4",
    group: "magical",
    descriptionEn:
      "Pure magical energy. Almost nothing resists force damage.",
    descriptionPt:
      "Energia mágica pura. Quase nada resiste a dano de força.",
    sourcesEn: [
      "Magic Missile (auto-hit)",
      "Eldritch Blast cantrip",
      "Spiritual Weapon, Bigby's Hand",
      "Wall of Force (no damage, but force barrier)",
    ],
    sourcesPt: [
      "Mísseis Mágicos (acerto automático)",
      "Truque Rajada Mística",
      "Arma Espiritual, Mão de Bigby",
      "Muralha de Força (sem dano, mas barreira de força)",
    ],
    resistanceEn: "Helmed horror is one of the very few creatures with force resistance.",
    resistancePt: "Horror encouraçado é uma das raras criaturas com resistência a força.",
    immunityEn: "Virtually no creatures are immune to force damage.",
    immunityPt: "Praticamente nenhuma criatura é imune a dano de força.",
  },
  {
    id: "lightning",
    nameEn: "Lightning",
    namePt: "Relâmpago",
    icon: React.createElement(SrdIconLightning, { className: "w-6 h-6" }),
    color: "#ECC94B",
    group: "elemental",
    descriptionEn:
      "Blue dragon breath and lightning bolt.",
    descriptionPt:
      "Sopro de dragão azul e relâmpago.",
    sourcesEn: [
      "Blue Dragon breath weapon",
      "Lightning Bolt, Shocking Grasp",
      "Call Lightning, Chain Lightning",
      "Storm giants, blue dragon-related creatures",
    ],
    sourcesPt: [
      "Sopro de Dragão Azul",
      "Relâmpago, Toque Chocante",
      "Invocar Relâmpago, Relâmpago em Cadeia",
      "Gigantes de tempestade, criaturas dracônicas azuis",
    ],
    resistanceEn: "Blue dragons, storm giants, some constructs.",
    resistancePt: "Dragões azuis, gigantes de tempestade, alguns constructos.",
    immunityEn: "Blue dragons (immune), flesh golems (absorb), shambling mound (absorb).",
    immunityPt: "Dragões azuis (imune), golems de carne (absorvem), monstro de lodo ambulante (absorve).",
  },
  {
    id: "necrotic",
    nameEn: "Necrotic",
    namePt: "Necrótico",
    icon: React.createElement(SrdIconMoon, { className: "w-6 h-6" }),
    color: "#A0AEC0",
    group: "magical",
    descriptionEn:
      "Life-draining energy dealt by undead and some spells.",
    descriptionPt:
      "Energia drenadora de vida causada por mortos-vivos e algumas magias.",
    sourcesEn: [
      "Chill Touch cantrip, Blight",
      "Inflict Wounds, Harm",
      "Wights, wraiths, specters (life drain)",
      "Shadow demons, bodaks",
    ],
    sourcesPt: [
      "Truque Toque Arrepiante, Deterioração",
      "Infligir Ferimentos, Nocividade",
      "Aparições, espectros (drenar vida)",
      "Demônios sombrios, bodaks",
    ],
    resistanceEn: "Some undead, shadow creatures, and fiends.",
    resistancePt: "Alguns mortos-vivos, criaturas sombrias e demonianos.",
    immunityEn: "Most undead are immune. Zombies, liches, vampires.",
    immunityPt: "A maioria dos mortos-vivos é imune. Zumbis, liches, vampiros.",
  },
  {
    id: "piercing",
    nameEn: "Piercing",
    namePt: "Perfurante",
    icon: React.createElement(SrdIconDagger, { className: "w-6 h-6" }),
    color: "#A0AEC0",
    group: "physical",
    descriptionEn:
      "Puncturing attacks -- arrows, bites, spears.",
    descriptionPt:
      "Ataques perfurantes -- flechas, mordidas, lanças.",
    sourcesEn: [
      "Longbow, shortbow, crossbow",
      "Spear, rapier, pike",
      "Bite attacks (wolves, dragons)",
      "Spike Growth, spike traps",
    ],
    sourcesPt: [
      "Arco longo, arco curto, besta",
      "Lança, rapieira, alabarda",
      "Ataques de mordida (lobos, dragões)",
      "Crescimento de Espinhos, armadilhas de espinhos",
    ],
    resistanceEn: "Were-creatures (nonmagical), treants, some constructs.",
    resistancePt: "Licantropos (não-mágico), treants, alguns constructos.",
    immunityEn: "Some oozes, certain swarms.",
    immunityPt: "Algumas gosmas, certos enxames.",
  },
  {
    id: "poison",
    nameEn: "Poison",
    namePt: "Veneno",
    icon: React.createElement(SrdIconVial, { className: "w-6 h-6" }),
    color: "#48BB78",
    group: "elemental",
    descriptionEn:
      "Venomous stings and toxic gas.",
    descriptionPt:
      "Picadas venenosas e gás tóxico.",
    sourcesEn: [
      "Green Dragon breath weapon",
      "Poison Spray cantrip, Cloudkill",
      "Giant spiders, wyverns, poisonous snakes",
      "Assassin's poisoned blades",
    ],
    sourcesPt: [
      "Sopro de Dragão Verde",
      "Truque Borrifo Venenoso, Nuvem Mortal",
      "Aranhas gigantes, wyverns, cobras venenosas",
      "Lâminas envenenadas de assassinos",
    ],
    resistanceEn: "Dwarves (Stout), many fiends, yuan-ti.",
    resistancePt: "Anões (Robusto), muitos demonianos, yuan-ti.",
    immunityEn:
      "Most undead, most constructs, most fiends. The most commonly immunized type.",
    immunityPt:
      "Maioria dos mortos-vivos, constructos e demonianos. O tipo mais comumente imune.",
  },
  {
    id: "psychic",
    nameEn: "Psychic",
    namePt: "Psíquico",
    icon: React.createElement(SrdIconBrain, { className: "w-6 h-6" }),
    color: "#D53F8C",
    group: "magical",
    descriptionEn:
      "Mental assault that targets the mind.",
    descriptionPt:
      "Assalto mental que atinge a mente.",
    sourcesEn: [
      "Mind Blast (mind flayers)",
      "Phantasmal Killer, Synaptic Static",
      "Psychic Scream (9th level)",
      "Vicious Mockery cantrip",
    ],
    sourcesPt: [
      "Explosão Mental (devoradores de mentes)",
      "Assassino Fantasmagórico, Estática Sináptica",
      "Grito Psíquico (nível 9)",
      "Truque Zombaria Cruel",
    ],
    resistanceEn: "Rare. Some aberrations and mindless creatures.",
    resistancePt: "Raro. Algumas aberrações e criaturas sem mente.",
    immunityEn: "Mindless undead (zombies), some constructs, intellect devourers.",
    immunityPt: "Mortos-vivos sem mente (zumbis), alguns constructos, devoradores de intelecto.",
  },
  {
    id: "radiant",
    nameEn: "Radiant",
    namePt: "Radiante",
    icon: React.createElement(SrdIconSun, { className: "w-6 h-6" }),
    color: "#F6E05E",
    group: "magical",
    descriptionEn:
      "Divine fire and searing light.",
    descriptionPt:
      "Fogo divino e luz abrasadora.",
    sourcesEn: [
      "Sacred Flame cantrip, Guiding Bolt",
      "Spirit Guardians, Sunbeam",
      "Divine Smite (paladins)",
      "Angels, couatls, solar creatures",
    ],
    sourcesPt: [
      "Truque Chama Sagrada, Raio Guiado",
      "Guardioes Espirituais, Raio Solar",
      "Golpe Divino (paladinos)",
      "Anjos, couatls, criaturas solares",
    ],
    resistanceEn: "Some celestials, solar-aspected creatures.",
    resistancePt: "Alguns celestiais, criaturas solares.",
    immunityEn: "Very rare. Some high-tier celestials only.",
    immunityPt: "Muito raro. Apenas alguns celestiais de alto nível.",
  },
  {
    id: "slashing",
    nameEn: "Slashing",
    namePt: "Cortante",
    icon: React.createElement(SrdIconSlash, { className: "w-6 h-6" }),
    color: "#A0AEC0",
    group: "physical",
    descriptionEn:
      "Swords, axes, and claws that cut.",
    descriptionPt:
      "Espadas, machados e garras que cortam.",
    sourcesEn: [
      "Longsword, greatsword, scimitar",
      "Greataxe, handaxe, sickle",
      "Claw attacks (dragons, beasts)",
      "Blade Barrier spell",
    ],
    sourcesPt: [
      "Espada longa, montante, cimitarra",
      "Machado grande, machadinha, foice",
      "Ataques de garra (dragões, bestas)",
      "Magia Barreira de Lâminas",
    ],
    resistanceEn: "Were-creatures (nonmagical), treants, some constructs.",
    resistancePt: "Licantropos (não-mágico), treants, alguns constructos.",
    immunityEn: "Black pudding (splits instead), some oozes.",
    immunityPt: "Pudim negro (se divide), algumas gosmas.",
  },
  {
    id: "thunder",
    nameEn: "Thunder",
    namePt: "Trovão",
    icon: React.createElement(SrdIconExplosion, { className: "w-6 h-6" }),
    color: "#76E4F7",
    group: "magical",
    descriptionEn:
      "Concussive burst of sound.",
    descriptionPt:
      "Explosão concussiva de som.",
    sourcesEn: [
      "Thunderwave, Shatter",
      "Thunderous Smite (paladins)",
      "Destructive Wave",
      "Androsphinx roar",
    ],
    sourcesPt: [
      "Onda Trovejante, Despedacar",
      "Golpe Trovejante (paladinos)",
      "Onda Destrutiva",
      "Rugido de androesfinge",
    ],
    resistanceEn: "Some constructs, storm-related creatures.",
    resistancePt: "Alguns constructos, criaturas de tempestade.",
    immunityEn: "Very rare. Few creatures are immune to thunder.",
    immunityPt: "Muito raro. Poucas criaturas são imunes a trovão.",
  },
];
