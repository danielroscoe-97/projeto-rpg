"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Shield, ChevronDown } from "lucide-react";
import { ProGate } from "@/components/billing/ProGate";
import { useCombatStore } from "@/lib/stores/combat-store";
import { getMonsterById } from "@/lib/srd/srd-search";
import {
  calculateDifficulty,
  type DifficultyLevel,
  type FormulaVersion,
} from "@/lib/utils/cr-calculator";
import type { RulesetVersion } from "@/lib/types/database";

const DIFFICULTY_STYLES: Record<DifficultyLevel, { bg: string; text: string; border: string }> = {
  easy:   { bg: "bg-green-900/30",  text: "text-green-400",  border: "border-green-500/40" },
  medium: { bg: "bg-yellow-900/30", text: "text-yellow-400", border: "border-yellow-500/40" },
  hard:   { bg: "bg-orange-900/30", text: "text-orange-400", border: "border-orange-500/40" },
  deadly: { bg: "bg-red-900/30",    text: "text-red-400",    border: "border-red-500/40" },
};

interface CRCalculatorProps {
  rulesetVersion: RulesetVersion;
}

function CRCalculatorInner({ rulesetVersion }: CRCalculatorProps) {
  const t = useTranslations("combat");
  const combatants = useCombatStore((s) => s.combatants);

  const [partyLevel, setPartyLevel] = useState(1);
  const [partySize, setPartySize] = useState(4);
  const [formulaOverride, setFormulaOverride] = useState<FormulaVersion | null>(null);
  const [expanded, setExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const formula: FormulaVersion = formulaOverride ?? rulesetVersion;

  // Close popover on outside click
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  // Extract non-player combatants with CR data
  const monsters = useMemo(() => {
    return combatants
      .filter((c) => !c.is_player && !c.is_defeated)
      .map((c) => {
        // Use actual CR from SRD data when monster_id is available
        if (c.monster_id && c.ruleset_version) {
          const srd = getMonsterById(c.monster_id, c.ruleset_version as RulesetVersion);
          if (srd?.cr) return { cr: srd.cr };
        }
        // Fallback: rough HP→CR heuristic for custom NPCs
        return { cr: estimateCRFromHP(c.max_hp) };
      });
  }, [combatants]);

  const playerCount = useMemo(
    () => combatants.filter((c) => c.is_player && !c.is_defeated).length,
    [combatants]
  );

  // Auto-set party size from player combatants if available
  const effectiveSize = playerCount > 0 ? playerCount : partySize;

  const result = useMemo(
    () => calculateDifficulty(formula, partyLevel, effectiveSize, monsters),
    [formula, partyLevel, effectiveSize, monsters]
  );

  const style = DIFFICULTY_STYLES[result.difficulty];

  if (monsters.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      {/* Compact badge — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${style.bg} ${style.text} ${style.border} hover:brightness-125`}
        aria-expanded={expanded}
        data-testid="cr-calculator-toggle"
      >
        <Shield className="w-3 h-3" aria-hidden="true" />
        <span data-testid="cr-difficulty-badge">
          {t(`cr_${result.difficulty}`)}
        </span>
        <span className="font-normal opacity-60 text-[10px]">
          {formula === "2014"
            ? `${result.totalValue} XP`
            : `CR ${result.totalValue}`}
        </span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded popover details */}
      {expanded && (
        <div className={`absolute top-full left-0 mt-1.5 z-50 w-72 rounded-md border ${style.border} ${style.bg} bg-card shadow-lg backdrop-blur-sm`}>
          <div className="px-3 py-2.5 space-y-2">
            {/* Party config */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                {t("cr_party_level")}
                <input
                  type="number"
                  value={partyLevel}
                  onChange={(e) => setPartyLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={20}
                  className="w-12 bg-card border border-border rounded px-1.5 py-0.5 text-foreground text-xs text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  data-testid="cr-party-level"
                />
              </label>
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                {t("cr_party_size")}
                <input
                  type="number"
                  value={effectiveSize}
                  onChange={(e) => setPartySize(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={10}
                  disabled={playerCount > 0}
                  className="w-12 bg-card border border-border rounded px-1.5 py-0.5 text-foreground text-xs text-center font-mono disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  data-testid="cr-party-size"
                />
              </label>
            </div>

            {/* Formula toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("cr_formula")}:</span>
              <button
                type="button"
                onClick={() => setFormulaOverride(formula === "2014" ? "2024" : "2014")}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  formula === "2014"
                    ? "bg-blue-900/30 text-blue-400 border-blue-500/40"
                    : "bg-purple-900/30 text-purple-400 border-purple-500/40"
                }`}
                data-testid="cr-formula-toggle"
              >
                DMG {formula}
              </button>
            </div>

            {/* Thresholds */}
            <div className="flex justify-between text-[10px] text-muted-foreground/60 pt-1 border-t border-border/30">
              <span>{t("cr_easy")}: {result.thresholds[0]}</span>
              <span>{t("cr_medium")}: {result.thresholds[1]}</span>
              <span>{t("cr_hard")}: {result.thresholds[2]}</span>
              <span>{t("cr_deadly")}: {result.thresholds[3]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CR Calculator wrapped with Pro gate — renders as a compact inline badge.
 * Click the badge to expand party/formula configuration.
 * Free users see ProBadge instead.
 */
export function CRCalculator({ rulesetVersion }: CRCalculatorProps) {
  return (
    <ProGate flagKey="cr_calculator">
      <CRCalculatorInner rulesetVersion={rulesetVersion} />
    </ProGate>
  );
}

// ── HP → CR estimation (rough heuristic for combatants without CR data) ──────

function estimateCRFromHP(hp: number): string {
  if (hp <= 6) return "0";
  if (hp <= 35) return "1/4";
  if (hp <= 49) return "1/2";
  if (hp <= 70) return "1";
  if (hp <= 85) return "2";
  if (hp <= 100) return "3";
  if (hp <= 115) return "4";
  if (hp <= 130) return "5";
  if (hp <= 145) return "6";
  if (hp <= 160) return "7";
  if (hp <= 175) return "8";
  if (hp <= 190) return "9";
  if (hp <= 210) return "10";
  if (hp <= 235) return "11";
  if (hp <= 255) return "12";
  if (hp <= 275) return "13";
  if (hp <= 300) return "14";
  if (hp <= 325) return "15";
  if (hp <= 350) return "16";
  if (hp <= 375) return "17";
  if (hp <= 400) return "18";
  if (hp <= 430) return "19";
  return "20";
}
