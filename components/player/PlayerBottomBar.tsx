"use client";

import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import {
  getHpBarColor,
  getHpFraction,
  getHpThresholdKey,
} from "@/lib/utils/hp-status";
import type { RulesetVersion } from "@/lib/types/database";
import { Shield, Zap, Search } from "lucide-react";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import { PlayerHpActions } from "@/components/player/PlayerHpActions";
import { SpellSlotTracker } from "@/components/player/SpellSlotTracker";

interface PlayerBottomBarProps {
  character: {
    id: string;
    name: string;
    current_hp: number;
    max_hp: number;
    temp_hp?: number;
    ac?: number;
    spell_save_dc?: number | null;
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
  /** Callback when the player reports HP changes (damage/heal/temp) */
  onHpAction?: (combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => void;
  /** Realtime connection status — used to disable HP action buttons when offline */
  connectionStatus?: string;
  /** Spell slots state for the player's character */
  spellSlots?: Record<string, { max: number; used: number }> | null;
  /** Callback when player toggles a spell slot dot */
  onToggleSlot?: (level: string, slotIndex: number) => void;
  /** Callback when player triggers Long Rest (restores all spell slots) */
  onLongRest?: () => void;
}

export function PlayerBottomBar({ character, rulesetVersion, deathSaves, isPlayerTurn, onDeathSave, hpDelta, onEndTurn, endTurnPending, onHpAction, connectionStatus, spellSlots, onToggleSlot, onLongRest }: PlayerBottomBarProps) {
  const t = useTranslations("player");

  // B.07: AC/DC mid-combat flash — detect changes and flash amber for 1.5s
  const prevAcRef = useRef<number | undefined>(undefined);
  const prevDcRef = useRef<number | null | undefined>(undefined);
  const [acFlash, setAcFlash] = useState(false);
  const [dcFlash, setDcFlash] = useState(false);
  const acFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dcFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (prevAcRef.current !== undefined && character.ac !== prevAcRef.current) {
      setAcFlash(true);
      if (acFlashTimerRef.current) clearTimeout(acFlashTimerRef.current);
      acFlashTimerRef.current = setTimeout(() => { setAcFlash(false); acFlashTimerRef.current = null; }, 1500);
    }
    prevAcRef.current = character.ac;
    if (prevDcRef.current !== undefined && character.spell_save_dc !== prevDcRef.current) {
      setDcFlash(true);
      if (dcFlashTimerRef.current) clearTimeout(dcFlashTimerRef.current);
      dcFlashTimerRef.current = setTimeout(() => { setDcFlash(false); dcFlashTimerRef.current = null; }, 1500);
    }
    prevDcRef.current = character.spell_save_dc;
  }, [character.ac, character.spell_save_dc]);
  useEffect(() => {
    return () => {
      if (acFlashTimerRef.current) clearTimeout(acFlashTimerRef.current);
      if (dcFlashTimerRef.current) clearTimeout(dcFlashTimerRef.current);
    };
  }, []);

  const currentHp = character.current_hp;
  const maxHp = character.max_hp;
  const tempHp = character.temp_hp ?? 0;
  const hpPct = getHpFraction(currentHp, maxHp);
  const hpBarColor = getHpBarColor(currentHp, maxHp);
  const hpThresholdKey = getHpThresholdKey(currentHp, maxHp);
  const hasTempHp = tempHp > 0;

  // Show death saves instead of HP bar when at 0 HP
  const showDeathSaves = currentHp === 0 && maxHp > 0 && !character.is_defeated;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-sm border-t-2 safe-area-pb lg:hidden transition-all duration-300 ease-in-out ${isPlayerTurn ? "border-amber-500 bg-amber-900/10" : "border-border/50"}`}
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
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("command-palette:open"))}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] -my-2 ml-auto text-muted-foreground hover:text-gold transition-colors shrink-0"
                aria-label={t("search_compendium")}
              >
                <Search className="w-4 h-4" />
              </button>
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

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("command-palette:open"))}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] -my-2 text-muted-foreground hover:text-gold transition-colors shrink-0"
                aria-label={t("search_compendium")}
              >
                <Search className="w-4 h-4" />
              </button>

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
                  <span className="text-temp-hp ml-1 text-xs">
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
                  <span className={`text-sm font-mono font-semibold transition-colors duration-[1500ms] ${acFlash ? "text-amber-400" : "text-foreground"}`}>
                    {character.ac}
                  </span>
                </div>
              )}
              {character.spell_save_dc != null && (
                <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                  <span className={`text-sm font-mono font-semibold transition-colors duration-[1500ms] ${dcFlash ? "text-amber-400" : "text-foreground"}`}>
                    {character.spell_save_dc}
                  </span>
                </div>
              )}
            </div>
            {/* HP self-management actions — mobile (C.13) */}
            {onHpAction && (
              <PlayerHpActions
                characterId={character.id}
                currentHp={currentHp}
                maxHp={maxHp}
                tempHp={tempHp}
                connectionStatus={connectionStatus ?? "disconnected"}
                onHpAction={onHpAction}
              />
            )}
            {/* Spell Slot Tracker — mobile bottom bar (F-41) */}
            {spellSlots && Object.keys(spellSlots).length > 0 && onToggleSlot && onLongRest && (
              <SpellSlotTracker
                spellSlots={spellSlots}
                onToggleSlot={onToggleSlot}
                onLongRest={onLongRest}
                collapsible
              />
            )}
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
