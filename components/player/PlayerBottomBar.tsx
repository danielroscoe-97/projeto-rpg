"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { getHpBarColor, getHpThresholdKey } from "@/lib/utils/hp-status";
import type { RulesetVersion } from "@/lib/types/database";
import { Shield } from "lucide-react";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";

interface PlayerBottomBarProps {
  character: {
    id: string;
    name: string;
    current_hp: number;
    max_hp: number;
    temp_hp?: number;
    ac?: number;
    conditions: string[];
    is_defeated: boolean;
    ruleset_version: string | null;
  };
  rulesetVersion: RulesetVersion;
  /** Callback when a player edits their own character's note */
  onPlayerNote?: (combatantId: string, note: string) => void;
  /** Death saves state — shown when HP=0 */
  deathSaves?: { successes: number; failures: number };
  /** Whether it's the player's turn */
  isPlayerTurn?: boolean;
  /** Callback when player marks a death save */
  onDeathSave?: (result: "success" | "failure") => void;
  /** HP delta visual feedback */
  hpDelta?: { combatantId: string; delta: number; type: "damage" | "heal" | "temp"; timestamp: number } | null;
  /** Callback when player ends their turn */
  onEndTurn?: () => void;
  /** Whether end turn is pending */
  endTurnPending?: boolean;
}

export function PlayerBottomBar({ character, rulesetVersion, deathSaves, isPlayerTurn, onDeathSave, hpDelta, onEndTurn, endTurnPending }: PlayerBottomBarProps) {
  const t = useTranslations("player");

  const currentHp = character.current_hp;
  const maxHp = character.max_hp;
  const tempHp = character.temp_hp ?? 0;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
  const hpBarColor = getHpBarColor(currentHp, maxHp);
  const hpThresholdKey = getHpThresholdKey(currentHp, maxHp);
  const hasTempHp = tempHp > 0;

  // Show death saves instead of HP bar when at 0 HP
  const showDeathSaves = currentHp === 0 && maxHp > 0 && !character.is_defeated;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-sm border-t-2 safe-area-pb lg:hidden transition-all duration-300 ease-in-out ${isPlayerTurn ? "border-amber-500 animate-pulse bg-amber-900/10" : "border-border/50"}`}
      data-testid={`player-bottom-bar-${character.id}`}
    >
      <div className="px-4 py-2.5 space-y-1.5">
        {showDeathSaves ? (
          /* Death saves mode — replaces HP bar when at 0 HP */
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-foreground text-sm font-semibold truncate max-w-[100px]">
                {character.name}
              </span>
              <span className="text-xs text-red-400 font-medium">0 HP</span>
            </div>
            {isPlayerTurn && (
              <p className="text-xs text-red-300 mb-1">{t("death_saves_your_turn")}</p>
            )}
            <DeathSaveTracker
              successes={deathSaves?.successes ?? 0}
              failures={deathSaves?.failures ?? 0}
              onAddSuccess={() => onDeathSave?.("success")}
              onAddFailure={() => onDeathSave?.("failure")}
              readOnly={!isPlayerTurn}
              playerContext
            />
          </div>
        ) : (
          /* Normal HP mode */
          <>
            <div className="flex items-center gap-3">
              <span className="text-foreground text-sm font-semibold truncate max-w-[100px]">
                {character.name}
              </span>

              {character.is_defeated && (
                <span className="text-xs text-red-400 font-medium shrink-0">
                  {t("defeated")}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <div
                  className="h-4 bg-white/[0.06] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={currentHp}
                  aria-valuemin={0}
                  aria-valuemax={maxHp}
                  aria-label={t("hp_aria", { name: character.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${hpBarColor}`}
                    style={{ width: `${hpPct * 100}%` }}
                  />
                </div>
              </div>

              <span className={`text-foreground text-sm font-mono font-bold shrink-0 relative ${hpDelta ? (hpDelta.type === "damage" ? "animate-[flash-red_150ms_ease-in-out_2]" : "animate-[flash-green_150ms_ease-in-out_2]") : ""}`}>
                {currentHp}<span className="text-muted-foreground text-xs font-normal">/{maxHp}</span>
                {hasTempHp && (
                  <span className="text-[#9f7aea] ml-1 text-xs">
                    +{tempHp}
                  </span>
                )}
                {/* Floating HP delta */}
                <AnimatePresence>
                  {hpDelta && (
                    <motion.span
                      key={hpDelta.timestamp}
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 1, y: -20 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ duration: 1.5 }}
                      className={`absolute -right-1 -top-4 text-sm font-bold pointer-events-none ${hpDelta.type === "damage" ? "text-red-400" : hpDelta.type === "temp" ? "text-purple-400" : "text-green-400"}`}
                    >
                      {hpDelta.delta > 0 ? "+" : ""}{hpDelta.delta}
                      {hpDelta.type === "temp" && <span className="text-[10px] ml-0.5">temp</span>}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>

              {character.ac != null && (
                <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-foreground text-sm font-mono font-semibold">
                    {character.ac}
                  </span>
                </div>
              )}
              {/* Inline End Turn button — mobile only, during player's turn */}
              {isPlayerTurn && onEndTurn && (
                <button
                  type="button"
                  onClick={onEndTurn}
                  disabled={endTurnPending}
                  className="shrink-0 px-3 py-1.5 bg-gold/20 text-gold font-medium text-xs rounded-lg active:bg-gold/40 transition-colors min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="player-bottom-bar-end-turn"
                >
                  {endTurnPending ? "..." : t("end_turn")}
                </button>
              )}
            </div>
          </>
        )}

        {/* Condition badges — only if present */}
        {character.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label={`${character.name} ${t("bottom_bar_conditions_label")}`}>
            {character.conditions.map((condition) => (
              <ConditionBadge
                key={condition}
                condition={condition}
                rulesetVersion={(character.ruleset_version as RulesetVersion) ?? rulesetVersion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
