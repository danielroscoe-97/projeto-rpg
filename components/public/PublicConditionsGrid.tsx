"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────
interface ConditionEntry {
  id: string;
  name: string;
  description: string;
  ruleset_version: "2014" | "2024";
  category: "condition" | "status" | "disease";
}

interface PublicConditionsGridProps {
  conditions: ConditionEntry[];
  locale?: "en" | "pt-BR";
}

// ── Categories ────────────────────────────────────────────────────
type CategoryFilter = "all" | "debuff" | "control" | "movement" | "sensory";

const CATEGORY_MAP: Record<string, CategoryFilter> = {
  blinded: "sensory",
  deafened: "sensory",
  invisible: "sensory",
  charmed: "control",
  frightened: "control",
  grappled: "movement",
  incapacitated: "control",
  paralyzed: "control",
  petrified: "control",
  restrained: "movement",
  prone: "movement",
  stunned: "control",
  unconscious: "control",
  poisoned: "debuff",
  exhaustion: "debuff",
};

const CONDITION_ICONS: Record<string, string> = {
  blinded: "\u{1F441}\u{FE0F}",
  charmed: "\u{1F496}",
  deafened: "\u{1F442}",
  exhaustion: "\u{1F4A4}",
  frightened: "\u{1F47B}",
  grappled: "\u{270A}",
  incapacitated: "\u{26D4}",
  invisible: "\u{1F47D}",
  paralyzed: "\u{26A1}",
  petrified: "\u{1FAA8}",
  poisoned: "\u{2620}\u{FE0F}",
  prone: "\u{1F938}",
  restrained: "\u{26D3}\u{FE0F}",
  stunned: "\u{1F4AB}",
  unconscious: "\u{1F634}",
};

const CONDITION_NAMES_PT: Record<string, string> = {
  blinded: "Cego",
  charmed: "Encantado",
  deafened: "Surdo",
  exhaustion: "Exaustão",
  frightened: "Amedrontado",
  grappled: "Agarrado",
  incapacitated: "Incapacitado",
  invisible: "Invisível",
  paralyzed: "Paralisado",
  petrified: "Petrificado",
  poisoned: "Envenenado",
  prone: "Caído",
  restrained: "Contido",
  stunned: "Atordoado",
  unconscious: "Inconsciente",
};

const LABELS = {
  en: {
    title: "D&D 5e Conditions",
    subtitle: "Quick reference for all conditions in D&D 5th Edition",
    all: "All",
    debuff: "Debuff",
    control: "Control",
    movement: "Movement",
    sensory: "Sensory",
    version2014: "2014",
    version2024: "2024",
    exhaustionLevels: "Exhaustion Levels",
    level: "Level",
    effect: "Effect",
    clickToExpand: "Click to expand",
    searchPlaceholder: "Search conditions...",
  },
  "pt-BR": {
    title: "Condições D&D 5e",
    subtitle: "Referência rápida de todas as condições do D&D 5ª Edição",
    all: "Todas",
    debuff: "Debuff",
    control: "Controle",
    movement: "Movimento",
    sensory: "Sentidos",
    version2014: "2014",
    version2024: "2024",
    exhaustionLevels: "Níveis de Exaustão",
    level: "Nível",
    effect: "Efeito",
    clickToExpand: "Clique para expandir",
    searchPlaceholder: "Buscar condições...",
  },
} as const;

// ── 2014 Exhaustion levels table ──────────────────────────────────
const EXHAUSTION_2014 = {
  en: [
    { level: 1, effect: "Disadvantage on ability checks" },
    { level: 2, effect: "Speed halved" },
    { level: 3, effect: "Disadvantage on attack rolls and saving throws" },
    { level: 4, effect: "Hit point maximum halved" },
    { level: 5, effect: "Speed reduced to 0" },
    { level: 6, effect: "Death" },
  ],
  "pt-BR": [
    { level: 1, effect: "Desvantagem em testes de habilidade" },
    { level: 2, effect: "Velocidade reduzida à metade" },
    { level: 3, effect: "Desvantagem em jogadas de ataque e testes de resistência" },
    { level: 4, effect: "Máximo de pontos de vida reduzido à metade" },
    { level: 5, effect: "Velocidade reduzida a 0" },
    { level: 6, effect: "Morte" },
  ],
};

// ── Color mapping for severity ────────────────────────────────────
function levelColor(level: number): string {
  if (level <= 2) return "text-yellow-400";
  if (level <= 4) return "text-orange-400";
  return "text-red-400";
}

// ── Component ─────────────────────────────────────────────────────
export function PublicConditionsGrid({ conditions, locale = "en" }: PublicConditionsGridProps) {
  const [version, setVersion] = useState<"2014" | "2024">("2024");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const L = LABELS[locale];

  // Filter only core conditions (not diseases/statuses)
  const coreConditions = conditions
    .filter((c) => c.category === "condition" && c.ruleset_version === version)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Apply category filter
  const categoryFiltered =
    filter === "all"
      ? coreConditions
      : coreConditions.filter((c) => {
          const baseName = c.name.toLowerCase();
          return CATEGORY_MAP[baseName] === filter;
        });

  // Apply search filter (bilingual — matches EN name, PT name, or description)
  const filtered = search.trim()
    ? categoryFiltered.filter((c) => {
        const q = search.toLowerCase();
        const baseName = c.name.toLowerCase();
        const ptName = (CONDITION_NAMES_PT[baseName] ?? "").toLowerCase();
        return (
          baseName.includes(q) ||
          ptName.includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      })
    : categoryFiltered;

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "debuff", label: L.debuff },
    { key: "control", label: L.control },
    { key: "movement", label: L.movement },
    { key: "sensory", label: L.sensory },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Version toggle */}
        <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => setVersion("2014")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === "2014"
                ? "bg-[#D4A853] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {L.version2014}
          </button>
          <button
            onClick={() => setVersion("2024")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === "2024"
                ? "bg-[#D4A853] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {L.version2024}
          </button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map(({ key, label }) => (
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
      </div>

      {/* Search bar */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={L.searchPlaceholder}
          className="w-full sm:max-w-sm rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-[#F5F0E8] placeholder-gray-600 focus:outline-none focus:border-[#D4A853]/50 transition-colors"
        />
      </div>

      {/* Conditions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((cond) => {
          const baseName = cond.name.toLowerCase();
          const icon = CONDITION_ICONS[baseName] ?? "⚔️";
          const displayName = locale === "pt-BR" ? (CONDITION_NAMES_PT[baseName] ?? cond.name) : cond.name;
          const isExpanded = expanded === cond.id;
          const cat = CATEGORY_MAP[baseName] ?? "debuff";

          const catColors: Record<CategoryFilter, string> = {
            all: "border-gray-700",
            debuff: "border-red-900/40",
            control: "border-purple-900/40",
            movement: "border-blue-900/40",
            sensory: "border-yellow-900/40",
          };

          return (
            <button
              key={cond.id}
              onClick={() => setExpanded(isExpanded ? null : cond.id)}
              className={`text-left rounded-xl border ${catColors[cat]} bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer ${
                isExpanded ? "ring-1 ring-[#D4A853]/30" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0" role="img" aria-hidden>
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-base">
                    {displayName}
                  </h3>
                  {locale === "pt-BR" && baseName !== displayName.toLowerCase() && (
                    <p className="text-xs text-gray-500 italic">{cond.name}</p>
                  )}
                  <p
                    className={`text-sm text-gray-400 mt-1.5 ${
                      isExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {cond.description}
                  </p>
                  {!isExpanded && cond.description.length > 120 && (
                    <span className="text-xs text-[#D4A853] mt-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                      {L.clickToExpand}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Exhaustion special section */}
      {(filter === "all" || filter === "debuff") && (
        <div className="mt-8 rounded-xl border border-red-900/30 bg-gray-900/50 p-5">
          <h2 className="text-xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] mb-4 flex items-center gap-2">
            <span>💤</span>
            {L.exhaustionLevels}
            <span className="text-xs font-normal text-gray-500 ml-2">{version}</span>
          </h2>

          {version === "2014" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 text-[#D4A853] font-medium w-20">
                    {L.level}
                  </th>
                  <th className="text-left py-2 text-[#D4A853] font-medium">
                    {L.effect}
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXHAUSTION_2014[locale].map(({ level, effect }) => (
                  <tr key={level} className="border-b border-gray-800/50">
                    <td className={`py-2.5 font-bold ${levelColor(level)}`}>
                      {level}
                    </td>
                    <td className="py-2.5 text-gray-300">{effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <strong className="text-yellow-400">
                  {locale === "pt-BR" ? "Cumulativo" : "Cumulative"}:
                </strong>{" "}
                {locale === "pt-BR"
                  ? "Cada vez que você recebe Exaustão, ganha 1 nível."
                  : "Each time you receive Exhaustion, you gain 1 level."}
              </p>
              <p>
                <strong className="text-orange-400">
                  {locale === "pt-BR" ? "Testes d20" : "D20 Tests"}:
                </strong>{" "}
                {locale === "pt-BR"
                  ? "Rolagem reduzida em 2 × nível de Exaustão."
                  : "Roll is reduced by 2 × your Exhaustion level."}
              </p>
              <p>
                <strong className="text-orange-400">
                  {locale === "pt-BR" ? "Velocidade" : "Speed"}:
                </strong>{" "}
                {locale === "pt-BR"
                  ? "Reduzida em 5 × nível de Exaustão (pés)."
                  : "Reduced by 5 × your Exhaustion level (feet)."}
              </p>
              <p>
                <strong className="text-red-400">
                  {locale === "pt-BR" ? "Nível 6" : "Level 6"}:
                </strong>{" "}
                {locale === "pt-BR" ? "Você morre." : "You die."}
              </p>
              <p className="text-gray-500 text-xs">
                {locale === "pt-BR"
                  ? "Descanso Longo remove 1 nível de Exaustão."
                  : "Finishing a Long Rest removes 1 Exhaustion level."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
