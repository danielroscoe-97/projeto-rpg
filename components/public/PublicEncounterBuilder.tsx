"use client";

import { useState, useMemo, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────
interface MonsterOption {
  name: string;
  cr: string | number;
  type: string;
}

interface EncounterMonster {
  id: string;
  name: string;
  cr: string | number;
  count: number;
}

interface PublicEncounterBuilderProps {
  monsters: MonsterOption[];
  locale?: "en" | "pt-BR";
}

// ── XP Thresholds (SRD 5.1, CC-BY-4.0) ───────────────────────────
// These thresholds are from the SRD and are public domain
const XP_THRESHOLDS: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

// CR → XP mapping (SRD)
const CR_XP: Record<string, number> = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
  "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
  "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
  "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
  "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000,
  "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
};

function getXPForCR(cr: string | number): number {
  return CR_XP[String(cr)] ?? 0;
}

// Encounter multiplier based on number of monsters (SRD)
function getMultiplier(monsterCount: number, partySize: number): number {
  // Adjust thresholds for party size
  let effectiveCount = monsterCount;
  if (partySize < 3) effectiveCount = Math.max(1, monsterCount + 1);
  else if (partySize > 5) effectiveCount = Math.max(1, monsterCount - 1);

  if (effectiveCount <= 1) return 1;
  if (effectiveCount === 2) return 1.5;
  if (effectiveCount <= 6) return 2;
  if (effectiveCount <= 10) return 2.5;
  if (effectiveCount <= 14) return 3;
  return 4;
}

type Difficulty = "trivial" | "easy" | "medium" | "hard" | "deadly";

function getDifficulty(adjustedXP: number, thresholds: { easy: number; medium: number; hard: number; deadly: number }): Difficulty {
  if (adjustedXP >= thresholds.deadly) return "deadly";
  if (adjustedXP >= thresholds.hard) return "hard";
  if (adjustedXP >= thresholds.medium) return "medium";
  if (adjustedXP >= thresholds.easy) return "easy";
  return "trivial";
}

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

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return monsters
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 15);
  }, [search, monsters]);

  // Party thresholds
  const thresholds = useMemo(() => {
    const t = XP_THRESHOLDS[partyLevel] ?? XP_THRESHOLDS[1];
    return {
      easy: t.easy * partySize,
      medium: t.medium * partySize,
      hard: t.hard * partySize,
      deadly: t.deadly * partySize,
    };
  }, [partySize, partyLevel]);

  // Encounter calculations
  const { totalXP, totalCount, adjustedXP, difficulty, multiplier } = useMemo(() => {
    if (encounter.length === 0) {
      return { totalXP: 0, totalCount: 0, adjustedXP: 0, difficulty: "trivial" as Difficulty, multiplier: 1 };
    }

    let xp = 0;
    let count = 0;
    for (const m of encounter) {
      xp += getXPForCR(m.cr) * m.count;
      count += m.count;
    }

    const mult = getMultiplier(count, partySize);
    const adj = Math.round(xp * mult);
    const diff = getDifficulty(adj, thresholds);

    return { totalXP: xp, totalCount: count, adjustedXP: adj, difficulty: diff, multiplier: mult };
  }, [encounter, partySize, thresholds]);

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
        { id: Math.random().toString(36).slice(2), name: monster.name, cr: monster.cr, count: 1 },
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
      <div>
        <h1 className="text-3xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 mt-1">{L.subtitle}</p>
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
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors flex items-center justify-between"
                    >
                      <span className="text-[#F5F0E8]">{m.name}</span>
                      <span className="text-xs text-gray-500">CR {m.cr}</span>
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
                      <span className="text-sm text-[#F5F0E8] truncate">{m.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">CR {m.cr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {(getXPForCR(m.cr) * m.count).toLocaleString()} XP
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

            {/* XP breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{L.totalXP}</span>
                <span className="text-[#F5F0E8] font-mono">{totalXP.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{L.multiplier}</span>
                <span className="text-[#F5F0E8] font-mono">×{multiplier}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2">
                <span className="text-[#D4A853] font-semibold">{L.adjustedXP}</span>
                <span className="text-[#D4A853] font-bold font-mono">{adjustedXP.toLocaleString()}</span>
              </div>
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
