"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { roll, type RollResult, type RollMode } from "@/lib/dice/roll";
import { DICE_LABELS, getDicePresets, type PresetGroup } from "@/lib/data/dice-presets";

// ── Types ─────────────────────────────────────────────────────────
type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

interface HistoryEntry {
  id: string;
  result: RollResult;
  timestamp: number;
}

interface PublicDiceRollerProps {
  locale?: "en" | "pt-BR";
}

// ── Constants ─────────────────────────────────────────────────────
const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20, 100];

const DIE_COLORS: Record<DieType, string> = {
  4: "border-emerald-500/40 hover:border-emerald-400 text-emerald-400",
  6: "border-blue-500/40 hover:border-blue-400 text-blue-400",
  8: "border-purple-500/40 hover:border-purple-400 text-purple-400",
  10: "border-pink-500/40 hover:border-pink-400 text-pink-400",
  12: "border-orange-500/40 hover:border-orange-400 text-orange-400",
  20: "border-gold/40 hover:border-gold text-gold",
  100: "border-red-500/40 hover:border-red-400 text-red-400",
};

const DIE_ACTIVE_COLORS: Record<DieType, string> = {
  4: "border-emerald-400 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/20",
  6: "border-blue-400 bg-blue-500/10 text-blue-300 shadow-blue-500/20",
  8: "border-purple-400 bg-purple-500/10 text-purple-300 shadow-purple-500/20",
  10: "border-pink-400 bg-pink-500/10 text-pink-300 shadow-pink-500/20",
  12: "border-orange-400 bg-orange-500/10 text-orange-300 shadow-orange-500/20",
  20: "border-gold bg-gold/10 text-gold shadow-gold/20",
  100: "border-red-400 bg-red-500/10 text-red-300 shadow-red-500/20",
};

const LABELS = DICE_LABELS;

// ── Component ─────────────────────────────────────────────────────
export function PublicDiceRoller({ locale = "en" }: PublicDiceRollerProps) {
  const L = LABELS[locale];
  const [tray, setTray] = useState<Record<number, number>>({});
  const [mod, setMod] = useState(0);
  const [mode, setMode] = useState<RollMode>("normal");
  const [customNotation, setCustomNotation] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const hasAnyDie = Object.values(tray).some((n) => n > 0);

  const addDie = (sides: DieType) => {
    setTray((prev) => {
      const current = prev[sides] ?? 0;
      if (current >= 20) return prev;
      return { ...prev, [sides]: current + 1 };
    });
  };

  const removeDie = (sides: DieType) => {
    setTray((prev) => {
      const current = prev[sides] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev, [sides]: current - 1 };
      if (next[sides] === 0) delete next[sides];
      return next;
    });
  };

  const clearTray = () => {
    setTray({});
    setMod(0);
  };

  const addToHistory = useCallback((result: RollResult) => {
    const entry: HistoryEntry = {
      id: Math.random().toString(36).slice(2),
      result,
      timestamp: Date.now(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const handleRoll = useCallback(() => {
    if (!hasAnyDie) return;
    setRolling(true);

    // Build notation from tray
    const parts: string[] = [];
    for (const [sides, count] of Object.entries(tray)) {
      if (count > 0) parts.push(`${count}d${sides}`);
    }
    const notation = parts.join("+") + (mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : "");

    setTimeout(() => {
      const result = roll(notation, "Dice Roller", mode);
      setLastResult(result);
      addToHistory(result);
      setRolling(false);
      setTray({});
      setMod(0);
    }, 300);
  }, [tray, mod, mode, hasAnyDie, addToHistory]);

  const handleCustomRoll = useCallback(() => {
    const n = customNotation.trim();
    if (!n) return;
    setRolling(true);
    setTimeout(() => {
      const result = roll(n, n, mode);
      setLastResult(result);
      addToHistory(result);
      setRolling(false);
      setCustomNotation("");
    }, 300);
  }, [customNotation, mode, addToHistory]);

  const handlePresetRoll = useCallback((notation: string, label: string) => {
    setRolling(true);
    setTimeout(() => {
      const result = roll(notation, label, mode);
      setLastResult(result);
      addToHistory(result);
      setRolling(false);
    }, 300);
  }, [mode, addToHistory]);

  // Scroll to result on roll
  useEffect(() => {
    if (lastResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [lastResult]);

  const presetGroups = getDicePresets(L, locale);
  const trayNotation = Object.entries(tray)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n}d${s}`)
    .join(" + ") + (mod !== 0 ? ` ${mod > 0 ? "+" : "−"} ${Math.abs(mod)}` : "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 mt-1">{L.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dice Tray + Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dice buttons */}
          <div className="rounded-xl border border-white/[0.04] bg-card p-4">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {DIE_TYPES.map((sides) => {
                const count = tray[sides] ?? 0;
                const isActive = count > 0;
                return (
                  <div key={sides} className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => addDie(sides)}
                      className={`compendium-card relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 transition-all font-[family-name:var(--font-cinzel)] font-bold text-base sm:text-lg shadow-md ${
                        isActive
                          ? `${DIE_ACTIVE_COLORS[sides]} shadow-lg scale-105`
                          : `${DIE_COLORS[sides]} bg-gray-900/80`
                      }`}
                    >
                      d{sides}
                      {count > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gold text-gray-950 text-xs font-bold flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                    {count > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => removeDie(sides)}
                          className="w-5 h-5 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-xs flex items-center justify-center transition-colors"
                        >
                          −
                        </button>
                        <span className="text-[10px] text-gray-500">
                          {locale === "pt-BR" ? "clique +1" : "click +1"}
                        </span>
                      </div>
                    ) : (
                      <span className="h-5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modifier + Mode row */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* Modifier */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 shrink-0">{L.modifier}:</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMod((m) => m - 1)}
                    className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-mono text-foreground">
                    {mod >= 0 ? `+${mod}` : mod}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMod((m) => m + 1)}
                    className="w-7 h-7 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Mode selector */}
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-400 shrink-0">{L.mode}:</label>
                <div className="flex flex-wrap gap-1">
                  {(["normal", "advantage", "disadvantage", "critical", "resistance"] as RollMode[]).map((m) => (
                    <button
                      key={m}
                      aria-pressed={mode === m}
                      onClick={() => setMode(m)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        mode === m
                          ? m === "advantage"
                            ? "bg-green-600/20 border border-green-500/50 text-green-400"
                            : m === "disadvantage"
                              ? "bg-red-600/20 border border-red-500/50 text-red-400"
                              : m === "critical"
                                ? "bg-yellow-600/20 border border-yellow-500/50 text-yellow-400"
                                : m === "resistance"
                                  ? "bg-blue-600/20 border border-blue-500/50 text-blue-400"
                                  : "bg-gray-700/50 border border-gray-600 text-gray-200"
                          : "border border-gray-700 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {L[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tray summary + Roll button */}
            <div className="mt-4 flex items-center gap-3">
              {hasAnyDie && (
                <>
                  <span className="text-sm text-gray-400 font-mono flex-1">
                    {trayNotation}
                  </span>
                  <button
                    type="button"
                    onClick={clearTray}
                    className="px-3 py-1.5 rounded text-xs text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
                  >
                    {L.clearTray}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleRoll}
                disabled={!hasAnyDie || rolling}
                className={`px-6 py-2.5 rounded-lg font-bold text-base transition-all ${
                  hasAnyDie
                    ? "bg-gold text-gray-950 hover:bg-gold/90 shadow-lg shadow-gold/20"
                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                } ${rolling ? "animate-pulse scale-95" : ""}`}
              >
                {L.rollButton}
              </button>
            </div>
          </div>

          {/* Result display */}
          <div ref={resultRef}>
            {lastResult && (
              <div className={`rounded-xl border p-5 text-center transition-all ${
                lastResult.isNat20
                  ? "border-gold bg-gold/10 shadow-lg shadow-gold/20"
                  : lastResult.isNat1
                    ? "border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20"
                    : "border-gray-700 bg-gray-900/50"
              }`}>
                {lastResult.label && (
                  <p className="text-xs text-gray-400 mb-1">{lastResult.label}</p>
                )}
                <div className="flex items-center justify-center gap-3">
                  {lastResult.mode !== "normal" && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      lastResult.mode === "advantage" ? "bg-green-600/20 text-green-400" :
                      lastResult.mode === "disadvantage" ? "bg-red-600/20 text-red-400" :
                      lastResult.mode === "critical" ? "bg-yellow-600/20 text-yellow-400" :
                      "bg-blue-600/20 text-blue-400"
                    }`}>
                      {L[lastResult.mode]}
                    </span>
                  )}
                  <span className={`text-6xl sm:text-7xl font-bold font-[family-name:var(--font-cinzel)] ${
                    lastResult.isNat20 ? "text-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]" :
                    lastResult.isNat1 ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]" :
                    "text-foreground"
                  }`}>
                    {lastResult.mode === "resistance" && lastResult.resistanceTotal !== undefined
                      ? lastResult.resistanceTotal
                      : lastResult.total}
                  </span>
                </div>
                {lastResult.isNat20 && (
                  <p className="text-gold font-bold mt-1">Natural 20!</p>
                )}
                {lastResult.isNat1 && (
                  <p className="text-red-400 font-bold mt-1">Natural 1!</p>
                )}
                <p className="text-sm text-gray-400 mt-2 font-mono">
                  {lastResult.notation}{" "}
                  [{lastResult.dice.map((d) => d.value).join(", ")}]
                  {lastResult.modifier !== 0 && ` ${lastResult.modifier > 0 ? "+" : "−"} ${Math.abs(lastResult.modifier)}`}
                  {" = "}{lastResult.total}
                  {lastResult.mode === "resistance" && lastResult.resistanceTotal !== undefined && (
                    <> {" → ÷2 = "}{lastResult.resistanceTotal}</>
                  )}
                </p>
                {lastResult.discardedDice.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {locale === "pt-BR" ? "Descartado" : "Discarded"}: [{lastResult.discardedDice.map((d) => d.value).join(", ")}]
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Custom notation */}
          <div className="rounded-xl border border-white/[0.04] bg-card p-4">
            <label className="text-sm text-gray-400 block mb-2">{L.customLabel}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customNotation}
                onChange={(e) => setCustomNotation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomRoll()}
                placeholder={L.customPlaceholder}
                aria-label={L.customLabel}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:border-gold/50 font-mono"
              />
              <button
                type="button"
                onClick={handleCustomRoll}
                disabled={!customNotation.trim()}
                className="px-4 py-2 rounded-lg bg-gold text-gray-950 font-semibold text-sm hover:bg-gold/90 disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
              >
                {L.customRoll}
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="rounded-xl border border-white/[0.04] bg-card p-4">
            <h2 className="text-sm font-semibold text-gold mb-3 font-[family-name:var(--font-cinzel)] tracking-wide">{L.presets}</h2>
            <div className="space-y-3">
              {presetGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs text-gray-500 mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.presets.map((preset) => (
                      <button
                        key={preset.notation + preset.name}
                        type="button"
                        onClick={() => handlePresetRoll(preset.notation, preset.name)}
                        className="px-2.5 py-1 rounded-lg border border-gray-700 text-xs text-gray-300 hover:border-gold/40 hover:text-gold transition-colors"
                      >
                        {preset.name}{" "}
                        <span className="text-gray-500 font-mono">{preset.notation}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: History panel */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-white/[0.04] bg-card p-4 sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gold font-[family-name:var(--font-cinzel)] tracking-wide">{L.history}</h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {L.clearHistory}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">
                  {L.emptyHistory}
                </p>
              ) : (
                history.map((entry) => (
                  <HistoryRow key={entry.id} entry={entry} locale={locale} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History Row ───────────────────────────────────────────────────
function HistoryRow({ entry, locale }: { entry: HistoryEntry; locale: string }) {
  const { result, timestamp } = entry;
  const time = new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const displayTotal =
    result.mode === "resistance" && result.resistanceTotal !== undefined
      ? result.resistanceTotal
      : result.total;

  const natClass = result.isNat20
    ? "border-gold/30"
    : result.isNat1
      ? "border-red-500/30"
      : "border-gray-800/50";

  return (
    <div className={`rounded-lg border ${natClass} bg-gray-950/50 p-2.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-gray-600 shrink-0">{time}</span>
          {result.label && (
            <span className="text-xs text-gray-400 truncate">{result.label}</span>
          )}
          {result.mode !== "normal" && (
            <span className={`px-1 py-0.5 rounded text-[10px] font-bold uppercase ${
              result.mode === "advantage" ? "text-green-500" :
              result.mode === "disadvantage" ? "text-red-500" :
              result.mode === "critical" ? "text-yellow-500" :
              "text-blue-500"
            }`}>
              {result.mode.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>
        <span className={`text-lg font-bold font-[family-name:var(--font-cinzel)] shrink-0 ${
          result.isNat20 ? "text-gold" :
          result.isNat1 ? "text-red-400" :
          "text-foreground"
        }`}>
          {displayTotal}
        </span>
      </div>
      <p className="text-[10px] text-gray-600 font-mono mt-0.5">
        {result.notation} [{result.dice.map((d) => d.value).join(", ")}]
        {result.modifier !== 0 && ` ${result.modifier > 0 ? "+" : "−"} ${Math.abs(result.modifier)}`}
      </p>
    </div>
  );
}
