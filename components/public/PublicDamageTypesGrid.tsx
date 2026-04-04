"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────
interface DamageTypeEntry {
  id: string;
  nameEn: string;
  namePt: string;
  emoji: string;
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

interface PublicDamageTypesGridProps {
  locale?: "en" | "pt-BR";
}

// ── Data ──────────────────────────────────────────────────────────
const DAMAGE_TYPES: DamageTypeEntry[] = [
  {
    id: "acid",
    nameEn: "Acid",
    namePt: "Acido",
    emoji: "\uD83E\uDDEA",
    color: "#68D391",
    group: "elemental",
    descriptionEn:
      "Corrosive spray of black dragon breath and dissolving enzymes.",
    descriptionPt:
      "Spray corrosivo do sopro de dragao negro e enzimas dissolventes.",
    sourcesEn: [
      "Black Dragon breath weapon",
      "Acid Splash cantrip",
      "Melf's Acid Arrow",
      "Green Dragon (poison/acid variant creatures)",
    ],
    sourcesPt: [
      "Sopro de Dragao Negro",
      "Truque Respingo Acido",
      "Flecha Acida de Melf",
      "Dragao Verde (criaturas variantes de acido)",
    ],
    resistanceEn: "Black dragons, some oozes, and acid-dwelling creatures.",
    resistancePt: "Dragoes negros, algumas gosmas e criaturas acidas.",
    immunityEn: "Black dragons (immune), ochre jelly, gray ooze.",
    immunityPt: "Dragoes negros (imune), geleia ocre, gosma cinzenta.",
  },
  {
    id: "bludgeoning",
    nameEn: "Bludgeoning",
    namePt: "Contundente",
    emoji: "\uD83D\uDD28",
    color: "#A0AEC0",
    group: "physical",
    descriptionEn:
      "Blunt force attacks -- hammers, falling, constriction.",
    descriptionPt:
      "Ataques de forca bruta -- martelos, quedas, constricao.",
    sourcesEn: [
      "Mace, warhammer, quarterstaff",
      "Falling damage",
      "Giant's slam attacks",
      "Constriction (snakes, tentacles)",
    ],
    sourcesPt: [
      "Maca, martelo de guerra, bordao",
      "Dano por queda",
      "Ataques de esmagar de gigantes",
      "Constricao (cobras, tentaculos)",
    ],
    resistanceEn:
      "Skeletons (vulnerable), many constructs, were-creatures (nonmagical).",
    resistancePt:
      "Esqueletos (vulneraveis), muitos constructos, licantropos (nao-magico).",
    immunityEn: "Some golems, swarms (partial).",
    immunityPt: "Alguns golems, enxames (parcial).",
  },
  {
    id: "cold",
    nameEn: "Cold",
    namePt: "Frio",
    emoji: "\u2744\uFE0F",
    color: "#63B3ED",
    group: "elemental",
    descriptionEn:
      "Infernal chill of ice storm and white dragon breath.",
    descriptionPt:
      "Frio infernal de tempestade de gelo e sopro de dragao branco.",
    sourcesEn: [
      "White Dragon breath weapon",
      "Ray of Frost cantrip",
      "Ice Storm, Cone of Cold",
      "Ice mephits, frost giants",
    ],
    sourcesPt: [
      "Sopro de Dragao Branco",
      "Truque Raio de Gelo",
      "Tempestade de Gelo, Cone de Frio",
      "Mefitas de gelo, gigantes de gelo",
    ],
    resistanceEn: "White dragons, frost giants, ice elementals.",
    resistancePt: "Dragoes brancos, gigantes de gelo, elementais de gelo.",
    immunityEn: "White dragons (immune), ice devils, frost salamanders.",
    immunityPt: "Dragoes brancos (imune), diabos de gelo, salamandras glaciais.",
  },
  {
    id: "fire",
    nameEn: "Fire",
    namePt: "Fogo",
    emoji: "\uD83D\uDD25",
    color: "#F56565",
    group: "elemental",
    descriptionEn:
      "Red dragon breath and fireball -- the most resisted damage type.",
    descriptionPt:
      "Sopro de dragao vermelho e bola de fogo -- o tipo de dano mais resistido.",
    sourcesEn: [
      "Red Dragon breath weapon",
      "Fireball, Fire Bolt cantrip",
      "Burning Hands, Wall of Fire",
      "Fire elementals, hell hounds",
    ],
    sourcesPt: [
      "Sopro de Dragao Vermelho",
      "Bola de Fogo, Truque Rajada de Fogo",
      "Maos Flamejantes, Muralha de Fogo",
      "Elementais de fogo, caes infernais",
    ],
    resistanceEn:
      "Red dragons, fire giants, tieflings, many fiends. Most common resistance.",
    resistancePt:
      "Dragoes vermelhos, gigantes de fogo, tieflings, muitos demonianos. Resistencia mais comum.",
    immunityEn: "Red dragons (immune), fire elementals, efreeti.",
    immunityPt: "Dragoes vermelhos (imune), elementais de fogo, efreeti.",
  },
  {
    id: "force",
    nameEn: "Force",
    namePt: "Forca",
    emoji: "\u2728",
    color: "#B794F4",
    group: "magical",
    descriptionEn:
      "Pure magical energy. Almost nothing resists force damage.",
    descriptionPt:
      "Energia magica pura. Quase nada resiste a dano de forca.",
    sourcesEn: [
      "Magic Missile (auto-hit)",
      "Eldritch Blast cantrip",
      "Spiritual Weapon, Bigby's Hand",
      "Wall of Force (no damage, but force barrier)",
    ],
    sourcesPt: [
      "Misseis Magicos (acerto automatico)",
      "Truque Rajada Mistica",
      "Arma Espiritual, Mao de Bigby",
      "Muralha de Forca (sem dano, mas barreira de forca)",
    ],
    resistanceEn: "Helmed horror is one of the very few creatures with force resistance.",
    resistancePt: "Horror encouracado e uma das raras criaturas com resistencia a forca.",
    immunityEn: "Virtually no creatures are immune to force damage.",
    immunityPt: "Praticamente nenhuma criatura e imune a dano de forca.",
  },
  {
    id: "lightning",
    nameEn: "Lightning",
    namePt: "Relampago",
    emoji: "\u26A1",
    color: "#ECC94B",
    group: "elemental",
    descriptionEn:
      "Blue dragon breath and lightning bolt.",
    descriptionPt:
      "Sopro de dragao azul e relampago.",
    sourcesEn: [
      "Blue Dragon breath weapon",
      "Lightning Bolt, Shocking Grasp",
      "Call Lightning, Chain Lightning",
      "Storm giants, blue dragon-related creatures",
    ],
    sourcesPt: [
      "Sopro de Dragao Azul",
      "Relampago, Toque Chocante",
      "Invocar Relampago, Relampago em Cadeia",
      "Gigantes de tempestade, criaturas draconicas azuis",
    ],
    resistanceEn: "Blue dragons, storm giants, some constructs.",
    resistancePt: "Dragoes azuis, gigantes de tempestade, alguns constructos.",
    immunityEn: "Blue dragons (immune), flesh golems (absorb), shambling mound (absorb).",
    immunityPt: "Dragoes azuis (imune), golems de carne (absorvem), monstro de lodo ambulante (absorve).",
  },
  {
    id: "necrotic",
    nameEn: "Necrotic",
    namePt: "Necrotico",
    emoji: "\uD83D\uDC80",
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
      "Truque Toque Arrepiante, Deterioracao",
      "Infligir Ferimentos, Nocividade",
      "Aparicoes, espectros (drenar vida)",
      "Demonios sombrios, bodaks",
    ],
    resistanceEn: "Some undead, shadow creatures, and fiends.",
    resistancePt: "Alguns mortos-vivos, criaturas sombrias e demonianos.",
    immunityEn: "Most undead are immune. Zombies, liches, vampires.",
    immunityPt: "A maioria dos mortos-vivos e imune. Zumbis, liches, vampiros.",
  },
  {
    id: "piercing",
    nameEn: "Piercing",
    namePt: "Perfurante",
    emoji: "\uD83D\uDDE1\uFE0F",
    color: "#A0AEC0",
    group: "physical",
    descriptionEn:
      "Puncturing attacks -- arrows, bites, spears.",
    descriptionPt:
      "Ataques perfurantes -- flechas, mordidas, lancas.",
    sourcesEn: [
      "Longbow, shortbow, crossbow",
      "Spear, rapier, pike",
      "Bite attacks (wolves, dragons)",
      "Spike Growth, spike traps",
    ],
    sourcesPt: [
      "Arco longo, arco curto, besta",
      "Lanca, rapieira, alabarda",
      "Ataques de mordida (lobos, dragoes)",
      "Crescimento de Espinhos, armadilhas de espinhos",
    ],
    resistanceEn: "Were-creatures (nonmagical), treants, some constructs.",
    resistancePt: "Licantropos (nao-magico), treants, alguns constructos.",
    immunityEn: "Some oozes, certain swarms.",
    immunityPt: "Algumas gosmas, certos enxames.",
  },
  {
    id: "poison",
    nameEn: "Poison",
    namePt: "Veneno",
    emoji: "\u2620\uFE0F",
    color: "#48BB78",
    group: "elemental",
    descriptionEn:
      "Venomous stings and toxic gas.",
    descriptionPt:
      "Picadas venenosas e gas toxico.",
    sourcesEn: [
      "Green Dragon breath weapon",
      "Poison Spray cantrip, Cloudkill",
      "Giant spiders, wyverns, poisonous snakes",
      "Assassin's poisoned blades",
    ],
    sourcesPt: [
      "Sopro de Dragao Verde",
      "Truque Borrifo Venenoso, Nuvem Mortal",
      "Aranhas gigantes, wyverns, cobras venenosas",
      "Laminas envenenadas de assassinos",
    ],
    resistanceEn: "Dwarves (Stout), many fiends, yuan-ti.",
    resistancePt: "Anoes (Robusto), muitos demonianos, yuan-ti.",
    immunityEn:
      "Most undead, most constructs, most fiends. The most commonly immunized type.",
    immunityPt:
      "Maioria dos mortos-vivos, constructos e demonianos. O tipo mais comumente imune.",
  },
  {
    id: "psychic",
    nameEn: "Psychic",
    namePt: "Psiquico",
    emoji: "\uD83E\uDDE0",
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
      "Explosao Mental (devoradores de mentes)",
      "Assassino Fantasmagorico, Estatica Sinaptica",
      "Grito Psiquico (nivel 9)",
      "Truque Zombaria Cruel",
    ],
    resistanceEn: "Rare. Some aberrations and mindless creatures.",
    resistancePt: "Raro. Algumas aberracoes e criaturas sem mente.",
    immunityEn: "Mindless undead (zombies), some constructs, intellect devourers.",
    immunityPt: "Mortos-vivos sem mente (zumbis), alguns constructos, devoradores de intelecto.",
  },
  {
    id: "radiant",
    nameEn: "Radiant",
    namePt: "Radiante",
    emoji: "\u2600\uFE0F",
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
    immunityPt: "Muito raro. Apenas alguns celestiais de alto nivel.",
  },
  {
    id: "slashing",
    nameEn: "Slashing",
    namePt: "Cortante",
    emoji: "\u2694\uFE0F",
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
      "Ataques de garra (dragoes, bestas)",
      "Magia Barreira de Laminas",
    ],
    resistanceEn: "Were-creatures (nonmagical), treants, some constructs.",
    resistancePt: "Licantropos (nao-magico), treants, alguns constructos.",
    immunityEn: "Black pudding (splits instead), some oozes.",
    immunityPt: "Pudim negro (se divide), algumas gosmas.",
  },
  {
    id: "thunder",
    nameEn: "Thunder",
    namePt: "Trovao",
    emoji: "\uD83D\uDCA5",
    color: "#76E4F7",
    group: "magical",
    descriptionEn:
      "Concussive burst of sound.",
    descriptionPt:
      "Explosao concussiva de som.",
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
    immunityPt: "Muito raro. Poucas criaturas sao imunes a trovao.",
  },
];

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Damage Types",
    subtitle: "Complete reference for all 13 damage types in D&D 5th Edition",
    all: "All",
    physical: "Physical",
    elemental: "Elemental",
    magical: "Magical",
    commonSources: "Common Sources",
    resistance: "Resistance",
    immunity: "Immunity",
    clickToExpand: "Click to expand",
    physicalNote:
      "Physical damage types (bludgeoning, piercing, slashing) are the most common in melee. Many creatures resist nonmagical physical damage but are vulnerable to magical weapon attacks.",
    elementalNote:
      "Elemental damage types are tied to the natural forces of the multiverse. Fire is the most resisted, while poison is the most commonly immunized.",
    magicalNote:
      "Magical damage types bypass most physical defenses. Force is the hardest to resist, while psychic targets the mind directly.",
  },
  "pt-BR": {
    title: "Tipos de Dano D&D 5e",
    subtitle:
      "Referencia completa dos 13 tipos de dano do D&D 5a Edicao",
    all: "Todos",
    physical: "Fisico",
    elemental: "Elemental",
    magical: "Magico",
    commonSources: "Fontes Comuns",
    resistance: "Resistencia",
    immunity: "Imunidade",
    clickToExpand: "Clique para expandir",
    physicalNote:
      "Tipos de dano fisico (contundente, perfurante, cortante) sao os mais comuns em combate corpo a corpo. Muitas criaturas resistem dano fisico nao-magico mas sao vulneraveis a ataques com armas magicas.",
    elementalNote:
      "Tipos de dano elemental estao ligados as forcas naturais do multiverso. Fogo e o mais resistido, enquanto veneno e o mais comumente imune.",
    magicalNote:
      "Tipos de dano magico ignoram a maioria das defesas fisicas. Forca e o mais dificil de resistir, enquanto psiquico atinge a mente diretamente.",
  },
} as const;

type GroupFilter = "all" | "physical" | "elemental" | "magical";

// ── Component ─────────────────────────────────────────────────────
export function PublicDamageTypesGrid({
  locale = "en",
}: PublicDamageTypesGridProps) {
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const L = LABELS[locale];

  const filtered =
    filter === "all"
      ? DAMAGE_TYPES
      : DAMAGE_TYPES.filter((d) => d.group === filter);

  const groups: { key: GroupFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "physical", label: L.physical },
    { key: "elemental", label: L.elemental },
    { key: "magical", label: L.magical },
  ];

  const groupNote = (g: GroupFilter): string | null => {
    if (g === "physical") return L.physicalNote;
    if (g === "elemental") return L.elementalNote;
    if (g === "magical") return L.magicalNote;
    return null;
  };

  const note = groupNote(filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">
          {L.subtitle}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {groups.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filter === key
                ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]"
                : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Group description note */}
      {note && (
        <p className="text-sm text-gray-400 bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3">
          {note}
        </p>
      )}

      {/* Damage types grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((dt) => {
          const isExpanded = expanded === dt.id;
          const name = locale === "pt-BR" ? dt.namePt : dt.nameEn;
          const altName = locale === "pt-BR" ? dt.nameEn : dt.namePt;
          const description =
            locale === "pt-BR" ? dt.descriptionPt : dt.descriptionEn;
          const sources =
            locale === "pt-BR" ? dt.sourcesPt : dt.sourcesEn;
          const resistance =
            locale === "pt-BR" ? dt.resistancePt : dt.resistanceEn;
          const immunity =
            locale === "pt-BR" ? dt.immunityPt : dt.immunityEn;

          return (
            <button
              key={dt.id}
              onClick={() => setExpanded(isExpanded ? null : dt.id)}
              className={`text-left rounded-xl bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer border-l-4 border ${
                isExpanded ? "ring-1 ring-[#D4A853]/30" : ""
              }`}
              style={{
                borderLeftColor: dt.color,
                borderTopColor: isExpanded
                  ? `${dt.color}33`
                  : "rgba(255,255,255,0.04)",
                borderRightColor: isExpanded
                  ? `${dt.color}33`
                  : "rgba(255,255,255,0.04)",
                borderBottomColor: isExpanded
                  ? `${dt.color}33`
                  : "rgba(255,255,255,0.04)",
              }}
            >
              {/* Card header */}
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0" role="img" aria-hidden>
                  {dt.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-base">
                    {name}
                  </h3>
                  <p className="text-xs text-gray-500 italic">{altName}</p>
                  <p className="text-sm text-gray-400 mt-1.5">{description}</p>

                  {!isExpanded && (
                    <span className="text-xs text-[#D4A853] mt-1.5 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                      {L.clickToExpand}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-gray-800 pt-3">
                  {/* Common Sources */}
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: dt.color }}
                    >
                      {L.commonSources}
                    </h4>
                    <ul className="space-y-1">
                      {sources.map((s, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-400 flex gap-2"
                        >
                          <span
                            className="mt-0.5 shrink-0"
                            style={{ color: `${dt.color}99` }}
                          >
                            &#x2022;
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resistance */}
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-1"
                      style={{ color: dt.color }}
                    >
                      {L.resistance}
                    </h4>
                    <p className="text-sm text-gray-400">{resistance}</p>
                  </div>

                  {/* Immunity */}
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-1"
                      style={{ color: dt.color }}
                    >
                      {L.immunity}
                    </h4>
                    <p className="text-sm text-gray-400">{immunity}</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
