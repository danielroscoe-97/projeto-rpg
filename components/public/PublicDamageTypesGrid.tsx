"use client";

import { useState } from "react";
import { DAMAGE_TYPES } from "@/lib/data/damage-types";

interface PublicDamageTypesGridProps {
  locale?: "en" | "pt-BR";
}


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
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filter === key
                ? "border-gold bg-gold/10 text-gold"
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
              aria-expanded={isExpanded}
              onClick={() => setExpanded(isExpanded ? null : dt.id)}
              className={`text-left rounded-xl bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer border-l-4 border ${
                isExpanded ? "ring-1 ring-gold/30" : ""
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
                <span className="shrink-0" style={{ color: dt.color }} aria-hidden>
                  {dt.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground font-[family-name:var(--font-cinzel)] text-base">
                    {name}
                  </h3>
                  <p className="text-xs text-gray-500 italic">{altName}</p>
                  <p className="text-sm text-gray-400 mt-1.5">{description}</p>

                  {!isExpanded && (
                    <span className="text-xs text-gold mt-1.5 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
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
