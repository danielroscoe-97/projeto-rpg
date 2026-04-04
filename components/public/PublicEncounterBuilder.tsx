"use client";

import { useState, useMemo, useCallback } from "react";
import {
  calculateDifficulty,
  crToXP,
  type FormulaVersion,
} from "@/lib/utils/cr-calculator";

// ── Types ─────────────────────────────────────────────────────────
interface MonsterOption {
  name: string;
  cr: string | number;
  type: string;
  slug?: string;
  token_url?: string | null;
  fallback_token_url?: string | null;
}

interface EncounterMonster {
  id: string;
  name: string;
  cr: string | number;
  count: number;
  slug?: string;
  token_url?: string | null;
  fallback_token_url?: string | null;
}

interface PublicEncounterBuilderProps {
  monsters: MonsterOption[];
  locale?: "en" | "pt-BR";
}

type Difficulty = "trivial" | "easy" | "medium" | "hard" | "deadly";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  trivial: "text-gray-400 bg-gray-500/10 border-gray-600",
  easy: "text-green-400 bg-green-500/10 border-green-600",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-600",
  hard: "text-orange-400 bg-orange-500/10 border-orange-600",
  deadly: "text-red-400 bg-red-500/10 border-red-600",
};

const LABELS = {
  en: {
    title: "D&D 5e Encounter Builder",
    subtitle: "Calculate encounter difficulty based on party level and monsters",
    partySize: "Party Size",
    partyLevel: "Party Level",
    players: "players",
    addMonster: "Add Monster",
    searchPlaceholder: "Search monsters...",
    encounter: "Encounter",
    noMonsters: "Add monsters to calculate difficulty",
    totalXP: "Total XP",
    adjustedXP: "Adjusted XP",
    multiplier: "Multiplier",
    perPlayer: "per player",
    difficulty: "Difficulty",
    thresholds: "Party Thresholds",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    deadly: "Deadly",
    trivial: "Trivial",
    remove: "Remove",
    clear: "Clear All",
    monsterCount: "monsters",
    formula: "Formula",
    dmg2014: "DMG 2014",
    dmg2024: "DMG 2024",
    totalCR: "Total CR",
    crBudget: "CR Budget",
  },
  "pt-BR": {
    title: "Calculadora de Encontro D&D 5e",
    subtitle: "Calcule a dificuldade do encontro com base no nível do grupo e monstros",
    partySize: "Tamanho do Grupo",
    partyLevel: "Nível do Grupo",
    players: "jogadores",
    addMonster: "Adicionar Monstro",
    searchPlaceholder: "Buscar monstros...",
    encounter: "Encontro",
    noMonsters: "Adicione monstros para calcular a dificuldade",
    totalXP: "XP Total",
    adjustedXP: "XP Ajustado",
    multiplier: "Multiplicador",
    perPlayer: "por jogador",
    difficulty: "Dificuldade",
    thresholds: "Limites do Grupo",
    easy: "Fácil",
    medium: "Médio",
    hard: "Difícil",
    deadly: "Mortal",
    trivial: "Trivial",
    remove: "Remover",
    clear: "Limpar Tudo",
    monsterCount: "monstros",
    formula: "Fórmula",
    dmg2014: "DMG 2014",
    dmg2024: "DMG 2024",
    totalCR: "CR Total",
    crBudget: "Budget de CR",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────
export function PublicEncounterBuilder({ monsters, locale = "en" }: PublicEncounterBuilderProps) {
  const L = LABELS[locale];
  const [partySize, setPartySize] = useState(4);
  const [partyLevel, setPartyLevel] = useState(5);
  const [encounter, setEncounter] = useState<EncounterMonster[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [formulaVersion, setFormulaVersion] = useState<FormulaVersion>("2014");

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return monsters
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 15);
  }, [search, monsters]);

  // Encounter calculations using shared cr-calculator
  const { totalXP, totalCount, adjustedXP, difficulty, thresholds } = useMemo(() => {
    let count = 0;
    const monstersFlat: { cr: string }[] = [];
    for (const m of encounter) {
      count += m.count;
      for (let i = 0; i < m.count; i++) {
        monstersFlat.push({ cr: String(m.cr) });
      }
    }

    if (monstersFlat.length === 0) {
      return {
        totalXP: 0,
        totalCount: 0,
        adjustedXP: 0,
        difficulty: "trivial" as Difficulty,
        thresholds: { easy: 0, medium: 0, hard: 0, deadly: 0 },
      };
    }

    const result = calculateDifficulty(formulaVersion, partyLevel, partySize, monstersFlat);
    const xp = monstersFlat.reduce((sum, m) => sum + crToXP(m.cr), 0);

    return {
      totalXP: xp,
      totalCount: count,
      adjustedXP: result.totalValue,
      difficulty: (result.difficulty === "easy" && result.totalValue < result.thresholds[0] ? "trivial" : result.difficulty) as Difficulty,
      thresholds: {
        easy: result.thresholds[0],
        medium: result.thresholds[1],
        hard: result.thresholds[2],
        deadly: result.thresholds[3],
      },
    };
  }, [encounter, partySize, partyLevel, formulaVersion]);

  const addMonster = useCallback((monster: MonsterOption) => {
    setEncounter((prev) => {
      const existing = prev.find((m) => m.name === monster.name && String(m.cr) === String(monster.cr));
      if (existing) {
        return prev.map((m) =>
          m.id === existing.id ? { ...m, count: m.count + 1 } : m
        );
      }
      return [
        ...prev,
        { id: Math.random().toString(36).slice(2), name: monster.name, cr: monster.cr, count: 1, slug: monster.slug, token_url: monster.token_url, fallback_token_url: monster.fallback_token_url },
      ];
    });
    setSearch("");
    setShowSearch(false);
  }, []);

  const removeMonster = useCallback((id: string) => {
    setEncounter((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const adjustCount = useCallback((id: string, delta: number) => {
    setEncounter((prev) =>
      prev
        .map((m) => (m.id === id ? { ...m, count: Math.max(0, m.count + delta) } : m))
        .filter((m) => m.count > 0)
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)]">
            {L.title}
          </h1>
          <p className="text-gray-400 mt-1">{L.subtitle}</p>
        </div>
        {/* 2014/2024 Toggle */}
        <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800 shrink-0">
          <button
            onClick={() => setFormulaVersion("2014")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              formulaVersion === "2014"
                ? "bg-[#D4A853]/20 text-[#D4A853] border border-[#D4A853]/30"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            {L.dmg2014}
          </button>
          <button
            onClick={() => setFormulaVersion("2024")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              formulaVersion === "2024"
                ? "bg-[#D4A853]/20 text-[#D4A853] border border-[#D4A853]/30"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            {L.dmg2024}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Party config + Monster search */}
        <div className="lg:col-span-2 space-y-4">
          {/* Party config */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{L.partySize}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                    className="w-8 h-8 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold text-[#F5F0E8] w-8 text-center">{partySize}</span>
                  <button
                    onClick={() => setPartySize((n) => Math.min(10, n + 1))}
                    className="w-8 h-8 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-xs text-gray-500">{L.players}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{L.partyLevel}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPartyLevel((n) => Math.max(1, n - 1))}
                    className="w-8 h-8 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-xl font-bold text-[#F5F0E8] w-8 text-center">{partyLevel}</span>
                  <button
                    onClick={() => setPartyLevel((n) => Math.min(20, n + 1))}
                    className="w-8 h-8 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Monster search */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <label className="text-sm text-[#D4A853] font-semibold block mb-2">
              {L.addMonster}
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder={L.searchPlaceholder}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-[#F5F0E8] placeholder-gray-600 focus:outline-none focus:border-[#D4A853]/50"
              />
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-30 max-h-60 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.name + m.cr}
                      type="button"
                      onClick={() => addMonster(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <div className="w-6 h-6 shrink-0 rounded-full overflow-hidden bg-gray-800 border border-gray-700">
                        {(m.token_url || m.fallback_token_url) ? (
                          <img src={m.token_url || m.fallback_token_url || ""} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
                          </div>
                        )}
                      </div>
                      <span className="text-[#F5F0E8] flex-1 truncate">{m.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">CR {m.cr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Encounter monster list */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#D4A853]">
                {L.encounter} ({totalCount} {L.monsterCount})
              </h2>
              {encounter.length > 0 && (
                <button
                  onClick={() => setEncounter([])}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {L.clear}
                </button>
              )}
            </div>

            {encounter.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">{L.noMonsters}</p>
            ) : (
              <div className="space-y-2">
                {encounter.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-gray-800/50 bg-gray-950/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Token */}
                      <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-gray-800 border border-gray-700">
                        {(m.token_url || m.fallback_token_url) ? (
                          <img
                            src={m.token_url || m.fallback_token_url || ""}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
                          </div>
                        )}
                      </div>
                      {/* Count controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustCount(m.id, -1)}
                          className="w-6 h-6 rounded text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-[#F5F0E8]">
                          {m.count}
                        </span>
                        <button
                          onClick={() => adjustCount(m.id, 1)}
                          className="w-6 h-6 rounded text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      {/* Name with stat block link */}
                      {m.slug ? (
                        <a
                          href={`/monsters/${m.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#F5F0E8] truncate hover:text-[#D4A853] transition-colors"
                          title={locale === "pt-BR" ? "Ver ficha" : "View stat block"}
                        >
                          {m.name}
                        </a>
                      ) : (
                        <span className="text-sm text-[#F5F0E8] truncate">{m.name}</span>
                      )}
                      <span className="text-xs text-gray-500 shrink-0">CR {m.cr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {(crToXP(String(m.cr)) * m.count).toLocaleString()} XP
                      </span>
                      <button
                        onClick={() => removeMonster(m.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                        title={L.remove}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Difficulty panel */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sticky top-20 space-y-4">
            {/* Difficulty badge */}
            <div className={`rounded-xl border-2 p-4 text-center ${DIFFICULTY_COLORS[difficulty]}`}>
              <p className="text-xs opacity-70 mb-1">{L.difficulty}</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-cinzel)] uppercase">
                {L[difficulty]}
              </p>
            </div>

            {/* XP / CR breakdown */}
            <div className="space-y-2 text-sm">
              {formulaVersion === "2014" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{L.totalXP}</span>
                    <span className="text-[#F5F0E8] font-mono">{totalXP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-2">
                    <span className="text-[#D4A853] font-semibold">{L.adjustedXP}</span>
                    <span className="text-[#D4A853] font-bold font-mono">{adjustedXP.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{L.totalXP}</span>
                    <span className="text-[#F5F0E8] font-mono">{totalXP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-2">
                    <span className="text-[#D4A853] font-semibold">{L.totalCR}</span>
                    <span className="text-[#D4A853] font-bold font-mono">{adjustedXP}</span>
                  </div>
                </>
              )}
              {encounter.length > 0 && partySize > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{L.perPlayer}</span>
                  <span className="text-gray-400 font-mono">{Math.round(totalXP / partySize).toLocaleString()} XP</span>
                </div>
              )}
            </div>

            {/* Thresholds bar */}
            <div>
              <p className="text-xs text-gray-500 mb-2">{L.thresholds}</p>
              <div className="space-y-1.5">
                {(["easy", "medium", "hard", "deadly"] as const).map((level) => {
                  const threshold = thresholds[level];
                  const pct = Math.min(100, (adjustedXP / threshold) * 100);
                  return (
                    <div key={level} className="flex items-center gap-2">
                      <span className={`text-xs w-14 ${DIFFICULTY_COLORS[level].split(" ")[0]}`}>
                        {L[level]}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            level === "easy" ? "bg-green-500" :
                            level === "medium" ? "bg-yellow-500" :
                            level === "hard" ? "bg-orange-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-600 font-mono w-12 text-right">
                        {threshold.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
