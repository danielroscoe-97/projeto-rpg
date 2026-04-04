"use client";

import { useState } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────
interface RaceSummary {
  slug: string;
  nameEn: string;
  namePt: string;
  icon: string;
  abilityBonuses: { ability: string; bonus: string }[];
  size: "Small" | "Medium";
  speed: number;
  keyTrait: string;
  keyTraitPt: string;
}

type AbilityFilter = "all" | "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

interface PublicRacesIndexProps {
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

const CARD_BORDER_COLORS: Record<string, string> = {
  STR: "border-red-900/30 hover:border-red-800/50",
  DEX: "border-green-900/30 hover:border-green-800/50",
  CON: "border-orange-900/30 hover:border-orange-800/50",
  INT: "border-blue-900/30 hover:border-blue-800/50",
  WIS: "border-purple-900/30 hover:border-purple-800/50",
  CHA: "border-yellow-900/30 hover:border-yellow-800/50",
  ALL: "border-gray-700/50 hover:border-gray-600/50",
};

// ── SRD Race Data ─────────────────────────────────────────────────
const RACES: RaceSummary[] = [
  {
    slug: "dwarf",
    nameEn: "Dwarf",
    namePt: "Anao",
    icon: "\u26CF\uFE0F",
    abilityBonuses: [{ ability: "CON", bonus: "+2" }],
    size: "Medium",
    speed: 25,
    keyTrait: "Dwarven Resilience",
    keyTraitPt: "Resiliencia Ana",
  },
  {
    slug: "elf",
    nameEn: "Elf",
    namePt: "Elfo",
    icon: "\uD83E\uDDDD",
    abilityBonuses: [{ ability: "DEX", bonus: "+2" }],
    size: "Medium",
    speed: 30,
    keyTrait: "Fey Ancestry",
    keyTraitPt: "Ancestralidade Ferica",
  },
  {
    slug: "halfling",
    nameEn: "Halfling",
    namePt: "Halfling",
    icon: "\uD83C\uDF40",
    abilityBonuses: [{ ability: "DEX", bonus: "+2" }],
    size: "Small",
    speed: 25,
    keyTrait: "Lucky",
    keyTraitPt: "Sortudo",
  },
  {
    slug: "human",
    nameEn: "Human",
    namePt: "Humano",
    icon: "\uD83D\uDC64",
    abilityBonuses: [{ ability: "ALL", bonus: "+1" }],
    size: "Medium",
    speed: 30,
    keyTrait: "+1 to All Abilities",
    keyTraitPt: "+1 em Todos os Atributos",
  },
  {
    slug: "dragonborn",
    nameEn: "Dragonborn",
    namePt: "Draconato",
    icon: "\uD83D\uDC09",
    abilityBonuses: [
      { ability: "STR", bonus: "+2" },
      { ability: "CHA", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Breath Weapon",
    keyTraitPt: "Arma de Sopro",
  },
  {
    slug: "gnome",
    nameEn: "Gnome",
    namePt: "Gnomo",
    icon: "\uD83D\uDD27",
    abilityBonuses: [{ ability: "INT", bonus: "+2" }],
    size: "Small",
    speed: 25,
    keyTrait: "Gnome Cunning",
    keyTraitPt: "Esperteza Gnomida",
  },
  {
    slug: "half-elf",
    nameEn: "Half-Elf",
    namePt: "Meio-Elfo",
    icon: "\uD83C\uDF19",
    abilityBonuses: [
      { ability: "CHA", bonus: "+2" },
      { ability: "ALL", bonus: "+1 x2" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Skill Versatility",
    keyTraitPt: "Versatilidade em Pericias",
  },
  {
    slug: "half-orc",
    nameEn: "Half-Orc",
    namePt: "Meio-Orc",
    icon: "\uD83D\uDCAA",
    abilityBonuses: [
      { ability: "STR", bonus: "+2" },
      { ability: "CON", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Relentless Endurance",
    keyTraitPt: "Resistencia Incansavel",
  },
  {
    slug: "tiefling",
    nameEn: "Tiefling",
    namePt: "Tiefling",
    icon: "\uD83D\uDE08",
    abilityBonuses: [
      { ability: "CHA", bonus: "+2" },
      { ability: "INT", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Infernal Legacy",
    keyTraitPt: "Legado Infernal",
  },
];

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Races",
    subtitle:
      "All 9 SRD player character races with ability scores, traits, and subraces",
    all: "All",
    filterLabel: "Filter by ability:",
    speed: "Speed",
    ft: "ft",
    sizeLabel: "Size",
    small: "Small",
    medium: "Medium",
  },
  "pt-BR": {
    title: "Racas D&D 5e",
    subtitle:
      "Todas as 9 racas SRD de personagem com atributos, tracos e sub-racas",
    all: "Todas",
    filterLabel: "Filtrar por atributo:",
    speed: "Velocidade",
    ft: "ft",
    sizeLabel: "Tamanho",
    small: "Pequeno",
    medium: "Medio",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────
export function PublicRacesIndex({ locale = "en" }: PublicRacesIndexProps) {
  const [filter, setFilter] = useState<AbilityFilter>("all");
  const L = LABELS[locale];
  const basePath = locale === "pt-BR" ? "/racas" : "/races";

  const abilities: { key: AbilityFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "STR", label: "STR" },
    { key: "DEX", label: "DEX" },
    { key: "CON", label: "CON" },
    { key: "INT", label: "INT" },
    { key: "WIS", label: "WIS" },
    { key: "CHA", label: "CHA" },
  ];

  const filtered =
    filter === "all"
      ? RACES
      : RACES.filter((r) =>
          r.abilityBonuses.some(
            (b) => b.ability === filter || b.ability === "ALL"
          )
        );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 mt-1 text-lg">{L.subtitle}</p>
      </div>

      {/* Ability filter */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-gray-500 mr-1">{L.filterLabel}</span>
        {abilities.map(({ key, label }) => (
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

      {/* Race cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((race) => {
          const primaryAbility = race.abilityBonuses[0]?.ability ?? "ALL";
          const borderColor =
            CARD_BORDER_COLORS[primaryAbility] ?? CARD_BORDER_COLORS.ALL;
          const displayName = locale === "pt-BR" ? race.namePt : race.nameEn;
          const secondaryName = locale === "pt-BR" ? race.nameEn : race.namePt;
          const traitHighlight =
            locale === "pt-BR" ? race.keyTraitPt : race.keyTrait;

          return (
            <Link
              key={race.slug}
              href={`${basePath}/${race.slug}`}
              className={`group rounded-xl border ${borderColor} bg-gray-900/50 hover:bg-gray-900/80 transition-all p-5 block`}
            >
              {/* Icon + Name */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl shrink-0" role="img" aria-hidden>
                  {race.icon}
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-lg leading-tight group-hover:text-[#D4A853] transition-colors">
                    {displayName}
                  </h2>
                  <p className="text-xs text-gray-500 italic">
                    {secondaryName}
                  </p>
                </div>
              </div>

              {/* Ability bonus pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {race.abilityBonuses.map((b) => (
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

              {/* Size + Speed row */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <span aria-hidden>&#x1F4CF;</span>
                  {race.size === "Small"
                    ? locale === "pt-BR"
                      ? L.small
                      : "Small"
                    : locale === "pt-BR"
                      ? L.medium
                      : "Medium"}
                </span>
                <span className="flex items-center gap-1">
                  <span aria-hidden>&#x1F97E;</span>
                  {race.speed} {L.ft}
                </span>
              </div>

              {/* Key trait highlight */}
              <div className="text-sm text-[#D4A853]/80 font-medium">
                {traitHighlight}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
