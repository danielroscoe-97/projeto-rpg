"use client";

import { useState } from "react";
import Link from "next/link";
import type { SrdClass } from "@/lib/types/srd-class";

// ── Role colors ──────────────────────────────────────────────────
const ROLE_STYLES: Record<SrdClass["role"], { border: string; badge: string; label: string; labelPt: string }> = {
  martial:     { border: "border-red-900/40",    badge: "bg-red-900/30 text-red-300 border-red-500/30",       label: "Martial",     labelPt: "Marcial" },
  caster:      { border: "border-blue-900/40",   badge: "bg-blue-900/30 text-blue-300 border-blue-500/30",    label: "Full Caster", labelPt: "Conjurador" },
  "half-caster": { border: "border-purple-900/40", badge: "bg-purple-900/30 text-purple-300 border-purple-500/30", label: "Half-Caster", labelPt: "Semi-Conjurador" },
  support:     { border: "border-green-900/40",  badge: "bg-green-900/30 text-green-300 border-green-500/30", label: "Support",     labelPt: "Suporte" },
};

type RoleFilter = "all" | SrdClass["role"];

const LABELS = {
  en: {
    title: "D&D 5e Classes",
    subtitle: "All 12 SRD classes with hit dice, proficiencies, and subclasses",
    all: "All",
    martial: "Martial",
    caster: "Caster",
    halfCaster: "Half-Caster",
    support: "Support",
    hitDie: "Hit Die",
    primaryAbility: "Primary",
    savingThrows: "Saves",
    srdSubclass: "SRD Subclass",
    spellcasting: "Spellcasting",
    viewDetails: "View details",
  },
  "pt-BR": {
    title: "Classes D&D 5e",
    subtitle: "Todas as 12 classes SRD com dados de vida, proficiências e subclasses",
    all: "Todas",
    martial: "Marcial",
    caster: "Conjurador",
    halfCaster: "Semi-Conjurador",
    support: "Suporte",
    hitDie: "Dado de Vida",
    primaryAbility: "Primário",
    savingThrows: "Salvaguardas",
    srdSubclass: "Subclasse SRD",
    spellcasting: "Conjuração",
    viewDetails: "Ver detalhes",
  },
} as const;

interface PublicClassesIndexProps {
  classes: SrdClass[];
  locale?: "en" | "pt-BR";
}

export function PublicClassesIndex({ classes, locale = "en" }: PublicClassesIndexProps) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const L = LABELS[locale];

  const filtered = filter === "all" ? classes : classes.filter((c) => c.role === filter);

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "martial", label: L.martial },
    { key: "caster", label: L.caster },
    { key: "half-caster", label: L.halfCaster },
    { key: "support", label: L.support },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 text-lg mt-1">{L.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map(({ key, label }) => (
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

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cls) => {
          const roleStyle = ROLE_STYLES[cls.role];
          const displayName = locale === "pt-BR" ? cls.name_pt : cls.name;
          const description = locale === "pt-BR" ? cls.description_pt : cls.description_en;
          const subclass = locale === "pt-BR" ? cls.srd_subclass_pt : cls.srd_subclass;
          const roleLabel = locale === "pt-BR" ? roleStyle.labelPt : roleStyle.label;

          return (
            <Link
              key={cls.id}
              href={`/classes/${cls.id}`}
              className={`group block rounded-xl border ${roleStyle.border} bg-gray-900/50 hover:bg-gray-900/80 transition-all p-5 hover:ring-1 hover:ring-[#D4A853]/20`}
            >
              {/* Icon + Name row */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl shrink-0" role="img" aria-hidden="true">
                  {cls.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-gray-100 font-[family-name:var(--font-cinzel)] text-lg leading-tight">
                    {displayName}
                  </h2>
                  {locale === "pt-BR" && (
                    <p className="text-xs text-gray-500 italic">{cls.name}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{description}</p>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Hit Die badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-xs font-mono text-[#D4A853]">
                  {cls.hit_die}
                </span>

                {/* Primary ability */}
                <span className="text-xs text-gray-500">
                  {L.primaryAbility}: <span className="text-gray-300">{cls.primary_ability}</span>
                </span>

                {/* Saving throws */}
                <span className="text-xs text-gray-500">
                  {L.savingThrows}: <span className="text-gray-300">{cls.saving_throws.join("/")}</span>
                </span>
              </div>

              {/* Bottom row: role badge + subclass + spellcasting */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleStyle.badge}`}>
                  {roleLabel}
                </span>
                <span className="text-xs text-gray-500 truncate" title={subclass}>
                  {subclass}
                </span>
                {cls.spellcaster && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-900/30 border border-indigo-500/20 text-[10px] text-indigo-300">
                    {L.spellcasting}: {cls.spellcasting_ability}
                  </span>
                )}
              </div>

              {/* Hover hint */}
              <p className="text-xs text-[#D4A853] mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {L.viewDetails} &rarr;
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
