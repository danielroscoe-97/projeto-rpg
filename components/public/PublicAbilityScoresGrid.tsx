"use client";

import { useState } from "react";
import { ABILITIES } from "@/lib/data/ability-scores";

// ── Types ─────────────────────────────────────────────────────────
interface PublicAbilityScoresGridProps {
  locale?: "en" | "pt-BR";
}

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Ability Scores",
    subtitle:
      "Complete reference for all six ability scores with modifier calculator, skills, and common uses.",
    calcTitle: "Ability Score Modifier Calculator",
    calcDesc: "Enter an ability score (1\u201330) to calculate the modifier.",
    scorePlaceholder: "Score (1-30)",
    modifier: "Modifier",
    formula: "Modifier = floor((Score \u2212 10) / 2)",
    tableTitle: "Full Modifier Table",
    score: "Score",
    mod: "Mod",
    skills: "Skills",
    noSkills: "No associated skills",
    savingThrow: "Saving Throw",
    commonUses: "Common Uses",
  },
  "pt-BR": {
    title: "Atributos D&D 5e",
    subtitle:
      "Referencia completa dos seis atributos com calculadora de modificador, pericias e usos comuns.",
    calcTitle: "Calculadora de Modificador de Atributo",
    calcDesc: "Insira um valor de atributo (1\u201330) para calcular o modificador.",
    scorePlaceholder: "Valor (1-30)",
    modifier: "Modificador",
    formula: "Modificador = arredondar para baixo((Valor \u2212 10) / 2)",
    tableTitle: "Tabela Completa de Modificadores",
    score: "Valor",
    mod: "Mod",
    skills: "Pericias",
    noSkills: "Sem pericias associadas",
    savingThrow: "Teste de Resistencia",
    commonUses: "Usos Comuns",
  },
} as const;

// ── Modifier calculation ──────────────────────────────────────────
function calcModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function modifierColor(mod: number): string {
  if (mod <= -3) return "text-red-400";
  if (mod <= -1) return "text-red-300";
  if (mod === 0) return "text-yellow-300";
  if (mod <= 2) return "text-green-300";
  return "text-green-400";
}

function modifierBg(mod: number): string {
  if (mod <= -3) return "bg-red-950/50";
  if (mod <= -1) return "bg-red-950/25";
  if (mod === 0) return "bg-yellow-950/30";
  if (mod <= 2) return "bg-green-950/25";
  return "bg-green-950/50";
}

// ── Component ─────────────────────────────────────────────────────
export function PublicAbilityScoresGrid({
  locale = "en",
}: PublicAbilityScoresGridProps) {
  const [scoreInput, setScoreInput] = useState<string>("10");
  const L = LABELS[locale];

  const parsedScore = parseInt(scoreInput, 10);
  const isValid = !isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 30;
  const currentMod = isValid ? calcModifier(parsedScore) : null;

  // Full table from 1 to 30
  const tableRows = Array.from({ length: 30 }, (_, i) => {
    const s = i + 1;
    return { score: s, mod: calcModifier(s) };
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Modifier Calculator */}
      <section className="rounded-xl border border-gold/20 bg-gray-900/60 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground font-[family-name:var(--font-cinzel)] mb-1">
            {L.calcTitle}
          </h2>
          <p className="text-gray-400 text-sm">{L.calcDesc}</p>
        </div>

        {/* Input + Result */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="number"
            min={1}
            max={30}
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            placeholder={L.scorePlaceholder}
            className="w-full sm:w-40 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-center text-2xl font-bold text-foreground placeholder-gray-600 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50 transition-colors"
          />
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xl">=</span>
            <div
              className={`rounded-lg px-6 py-3 text-center min-w-[100px] ${
                isValid
                  ? `${modifierBg(currentMod!)} border border-gray-700`
                  : "bg-gray-800/50 border border-gray-800"
              }`}
            >
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                {L.modifier}
              </div>
              <div
                className={`text-2xl font-bold ${
                  isValid ? modifierColor(currentMod!) : "text-gray-600"
                }`}
              >
                {isValid ? formatModifier(currentMod!) : "---"}
              </div>
            </div>
          </div>
        </div>

        {/* Formula */}
        <p className="text-xs text-gray-500 font-mono bg-gray-800/50 rounded-lg px-3 py-2 inline-block">
          {L.formula}
        </p>

        {/* Full Modifier Table */}
        <div>
          <h3 className="text-sm font-semibold text-gold mb-3 uppercase tracking-wide">
            {L.tableTitle}
          </h3>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-1 min-w-0">
              {tableRows.map(({ score, mod }) => (
                <div
                  key={score}
                  className={`rounded-md px-1 py-1.5 text-center transition-colors ${modifierBg(
                    mod
                  )} ${
                    isValid && parsedScore === score
                      ? "ring-2 ring-gold ring-offset-1 ring-offset-gray-900"
                      : ""
                  }`}
                >
                  <div className="text-[10px] text-gray-500 leading-tight">
                    {score}
                  </div>
                  <div
                    className={`text-sm font-bold leading-tight ${modifierColor(
                      mod
                    )}`}
                  >
                    {formatModifier(mod)}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-950/50 border border-red-900/50" />
                {locale === "en" ? "Below average" : "Abaixo da media"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-950/30 border border-yellow-900/50" />
                {locale === "en" ? "Average" : "Na media"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-950/50 border border-green-900/50" />
                {locale === "en" ? "Above average" : "Acima da media"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ability Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ABILITIES.map((ability) => {
          const name =
            locale === "pt-BR" ? ability.namePT : ability.nameEN;
          const abbr =
            locale === "pt-BR" ? ability.abbrPT : ability.abbrEN;
          const description =
            locale === "pt-BR"
              ? ability.descriptionPT
              : ability.descriptionEN;
          const skills =
            locale === "pt-BR" ? ability.skillsPT : ability.skillsEN;
          const savingThrow =
            locale === "pt-BR"
              ? ability.savingThrowPT
              : ability.savingThrowEN;
          const commonUses =
            locale === "pt-BR"
              ? ability.commonUsesPT
              : ability.commonUsesEN;

          return (
            <div
              key={ability.key}
              className="rounded-xl border bg-gray-900/50 hover:bg-gray-900/70 transition-colors p-5 space-y-4"
              style={{
                borderColor: ability.colorBorder,
                background: `linear-gradient(135deg, ${ability.colorBg}, transparent 60%)`,
              }}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <span className="shrink-0" style={{ color: ability.color }} aria-hidden>
                  {ability.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3
                      className="font-bold text-lg font-[family-name:var(--font-cinzel)]"
                      style={{ color: ability.color }}
                    >
                      {name}
                    </h3>
                    <span
                      className="text-xs font-mono font-bold opacity-70"
                      style={{ color: ability.color }}
                    >
                      ({abbr})
                    </span>
                  </div>
                  {locale === "pt-BR" && (
                    <p className="text-xs text-gray-500 italic">
                      {ability.nameEN}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {L.skills}
                </h4>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: ability.colorBg,
                          color: ability.color,
                          border: `1px solid ${ability.colorBorder}`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">{L.noSkills}</p>
                )}
              </div>

              {/* Saving Throw */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {L.savingThrow}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {savingThrow}
                </p>
              </div>

              {/* Common Uses */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {L.commonUses}
                </h4>
                <ul className="space-y-1">
                  {commonUses.map((use, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-400 flex gap-1.5"
                    >
                      <span
                        className="mt-0.5 shrink-0 opacity-60"
                        style={{ color: ability.color }}
                      >
                        &#x2022;
                      </span>
                      <span>{use}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
