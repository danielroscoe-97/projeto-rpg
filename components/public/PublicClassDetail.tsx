"use client";

import type { SrdClass } from "@/lib/types/srd-class";

// ── Role colors (same as index) ──────────────────────────────────
const ROLE_BADGE: Record<SrdClass["role"], { badge: string; label: string; labelPt: string }> = {
  martial:       { badge: "bg-red-900/30 text-red-300 border-red-500/30",       label: "Martial",     labelPt: "Marcial" },
  caster:        { badge: "bg-blue-900/30 text-blue-300 border-blue-500/30",    label: "Full Caster", labelPt: "Conjurador" },
  "half-caster": { badge: "bg-purple-900/30 text-purple-300 border-purple-500/30", label: "Half-Caster", labelPt: "Semi-Conjurador" },
  support:       { badge: "bg-green-900/30 text-green-300 border-green-500/30", label: "Support",     labelPt: "Suporte" },
};

const LABELS = {
  en: {
    hitDie: "Hit Die",
    primaryAbility: "Primary Ability",
    savingThrows: "Saving Throws",
    armorProf: "Armor Proficiencies",
    weaponProf: "Weapon Proficiencies",
    srdSubclass: "SRD Subclass",
    spellcasting: "Spellcasting",
    spellcastingAbility: "Spellcasting Ability",
    yes: "Yes",
    no: "No",
    none: "None",
    classFeatures: "Class Overview",
    proficiencies: "Proficiencies",
    srdNote:
      "This page contains content from the Systems Reference Document 5.1 (SRD), licensed under the Creative Commons Attribution 4.0 International License.",
  },
  "pt-BR": {
    hitDie: "Dado de Vida",
    primaryAbility: "Habilidade Primária",
    savingThrows: "Salvaguardas",
    armorProf: "Proficiências em Armaduras",
    weaponProf: "Proficiências em Armas",
    srdSubclass: "Subclasse SRD",
    spellcasting: "Conjuração",
    spellcastingAbility: "Habilidade de Conjuração",
    yes: "Sim",
    no: "Não",
    none: "Nenhuma",
    classFeatures: "Visão Geral da Classe",
    proficiencies: "Proficiências",
    srdNote:
      "Esta página contém conteúdo do Systems Reference Document 5.1 (SRD), licenciado sob a Licença Creative Commons Attribution 4.0 Internacional.",
  },
} as const;

interface PublicClassDetailProps {
  cls: SrdClass;
  locale?: "en" | "pt-BR";
}

export function PublicClassDetail({ cls, locale = "en" }: PublicClassDetailProps) {
  const L = LABELS[locale];
  const roleMeta = ROLE_BADGE[cls.role];
  const displayName = locale === "pt-BR" ? cls.name_pt : cls.name;
  const description = locale === "pt-BR" ? cls.description_pt : cls.description_en;
  const subclass = locale === "pt-BR" ? cls.srd_subclass_pt : cls.srd_subclass;
  const roleLabel = locale === "pt-BR" ? roleMeta.labelPt : roleMeta.label;

  return (
    <article className="space-y-6">
      {/* ── Hero section ────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span className="text-5xl shrink-0" role="img" aria-hidden="true">
            {cls.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] leading-tight">
              {displayName}
            </h1>
            {locale === "pt-BR" && (
              <p className="text-sm text-gray-500 italic mt-0.5">{cls.name}</p>
            )}
            <p className="text-gray-400 text-lg mt-2">{description}</p>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.badge}`}>
                {roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 text-sm font-mono text-[#D4A853]">
                {cls.hit_die}
              </span>
              {cls.spellcaster && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-900/30 border border-indigo-500/20 text-xs text-indigo-300">
                  {L.spellcasting}: {cls.spellcasting_ability}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-5">
          {L.classFeatures}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hit Die */}
          <StatItem label={L.hitDie} value={cls.hit_die} mono />

          {/* Primary Ability */}
          <StatItem label={L.primaryAbility} value={cls.primary_ability} />

          {/* Saving Throws */}
          <StatItem label={L.savingThrows} value={cls.saving_throws.join(", ")} />

          {/* Spellcasting */}
          <StatItem
            label={L.spellcasting}
            value={
              cls.spellcaster
                ? `${L.yes} (${cls.spellcasting_ability})`
                : L.no
            }
            highlight={cls.spellcaster}
          />
        </div>
      </div>

      {/* ── Proficiencies ───────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-5">
          {L.proficiencies}
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#D4A853] mb-1">{L.armorProf}</h3>
            <p className="text-gray-300 text-sm">
              {cls.armor_proficiencies === "None" ? L.none : cls.armor_proficiencies}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#D4A853] mb-1">{L.weaponProf}</h3>
            <p className="text-gray-300 text-sm">{cls.weapon_proficiencies}</p>
          </div>
        </div>
      </div>

      {/* ── SRD Subclass ────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#D4A853]/15 bg-gradient-to-r from-[#D4A853]/[0.04] to-gray-900/60 p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
          {L.srdSubclass}
        </h2>
        <p className="text-[#D4A853] text-lg font-semibold">{subclass}</p>
        {locale === "pt-BR" && (
          <p className="text-sm text-gray-500 italic mt-1">{cls.srd_subclass}</p>
        )}
      </div>

      {/* ── SRD note ────────────────────────────────────────────── */}
      <p className="text-xs text-gray-600 text-center leading-relaxed">{L.srdNote}</p>
    </article>
  );
}

// ── Helper component ──────────────────────────────────────────────
function StatItem({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-gray-800/50 border border-white/[0.04] p-3">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-base font-semibold ${
          highlight ? "text-indigo-300" : "text-gray-200"
        } ${mono ? "font-mono text-[#D4A853]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
