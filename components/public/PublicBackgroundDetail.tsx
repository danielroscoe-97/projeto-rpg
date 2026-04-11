"use client";

import Link from "next/link";

type Locale = "en" | "pt-BR";

const LABELS = {
  en: {
    skills: "Skill Proficiencies",
    tools: "Tool Proficiencies",
    languages: "Languages",
    equipment: "Equipment",
    feature: "Feature",
    source: "Source",
    backToBackgrounds: "← All Backgrounds",
    backHref: "/backgrounds",
    none: "None",
  },
  "pt-BR": {
    skills: "Perícias",
    tools: "Ferramentas",
    languages: "Idiomas",
    equipment: "Equipamento",
    feature: "Característica",
    source: "Fonte",
    backToBackgrounds: "← Todos os Antecedentes",
    backHref: "/antecedentes",
    none: "Nenhum",
  },
};

interface BackgroundDetailProps {
  background: {
    id: string;
    name: string;
    description: string;
    skill_proficiencies: string[];
    tool_proficiencies: string[];
    languages: string[];
    equipment: string;
    feature_name: string | null;
    feature_description: string | null;
    source: string;
    ruleset_version: string;
  };
  locale?: Locale;
}

export function PublicBackgroundDetail({ background: bg, locale = "en" }: BackgroundDetailProps) {
  const l = LABELS[locale];

  return (
    <div>
      {/* Back link */}
      <Link
        href={l.backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gold transition-colors mb-6"
      >
        {l.backToBackgrounds}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground font-[family-name:var(--font-cinzel)] mb-3">
          {bg.name}
        </h1>
        <span className="text-[10px] font-medium bg-white/[0.06] text-gray-300 rounded px-2 py-0.5">
          {bg.source} {bg.ruleset_version}
        </span>
      </div>

      {/* Stats card */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-5 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Skill Proficiencies */}
          <div>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{l.skills}</h3>
            <div className="flex flex-wrap gap-1">
              {bg.skill_proficiencies.length > 0 ? (
                bg.skill_proficiencies.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-medium bg-blue-900/30 text-blue-400 rounded px-2 py-0.5"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">{l.none}</span>
              )}
            </div>
          </div>

          {/* Tool Proficiencies */}
          <div>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{l.tools}</h3>
            <div className="flex flex-wrap gap-1">
              {bg.tool_proficiencies.length > 0 ? (
                bg.tool_proficiencies.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-medium bg-orange-900/30 text-orange-400 rounded px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">{l.none}</span>
              )}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{l.languages}</h3>
            <div className="flex flex-wrap gap-1">
              {bg.languages.length > 0 ? (
                bg.languages.map((lang) => (
                  <span
                    key={lang}
                    className="text-xs font-medium bg-purple-900/30 text-purple-400 rounded px-2 py-0.5"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">{l.none}</span>
              )}
            </div>
          </div>

          {/* Equipment */}
          {bg.equipment && (
            <div>
              <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{l.equipment}</h3>
              <p className="text-xs text-gray-300">{bg.equipment}</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature */}
      {bg.feature_name && (
        <div className="rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-5 md:p-6 mb-6">
          <h2 className="text-lg font-bold text-gold font-[family-name:var(--font-cinzel)] mb-2">
            {l.feature}: {bg.feature_name}
          </h2>
          {bg.feature_description && (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {bg.feature_description}
            </p>
          )}
        </div>
      )}

      {/* Full description */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-5 md:p-6">
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
          {bg.description}
        </div>
      </div>
    </div>
  );
}
