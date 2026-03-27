"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { getHpBarColor, getHpThresholdKey } from "@/lib/utils/hp-status";
import type { RulesetVersion } from "@/lib/types/database";
import { Swords, Skull } from "lucide-react";

export interface CombatLogEntry {
  text: string;
  timestamp: number;
  type: "damage" | "heal" | "turn" | "condition";
}

interface PlayerCombatant {
  id: string;
  name: string;
  /** Only present for is_player=true */
  current_hp?: number;
  max_hp?: number;
  temp_hp?: number;
  ac?: number;
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  monster_id: string | null;
  ruleset_version: string | null;
  /** HP status label for monsters (LIGHT/MODERATE/HEAVY/CRITICAL) */
  hp_status?: string;
}

/** Visual config for monster HP status labels */
const HP_STATUS_STYLES: Record<string, { colorClass: string; bgClass: string; icon: "heart" | "warning" | "danger" | "skull" }> = {
  LIGHT: { colorClass: "text-green-400", bgClass: "bg-green-400/10", icon: "heart" },
  MODERATE: { colorClass: "text-amber-400", bgClass: "bg-amber-400/10", icon: "warning" },
  HEAVY: { colorClass: "text-red-500", bgClass: "bg-red-500/10", icon: "danger" },
  CRITICAL: { colorClass: "text-gray-300", bgClass: "bg-gray-900/40", icon: "skull" },
};

function HpStatusBadge({ status }: { status: string }) {
  const t = useTranslations("player");
  const style = HP_STATUS_STYLES[status] ?? HP_STATUS_STYLES.LIGHT;
  const label = t(`hp_status_${status.toLowerCase()}` as Parameters<typeof t>[0]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.colorClass} ${style.bgClass}`}
      aria-label={label}
    >
      {style.icon === "skull" ? (
        <Skull className="w-3.5 h-3.5" aria-hidden="true" />
      ) : style.icon === "warning" ? (
        <span aria-hidden="true">⚠</span>
      ) : style.icon === "danger" ? (
        <span aria-hidden="true">‼</span>
      ) : (
        <span aria-hidden="true">♥</span>
      )}
      {label}
    </span>
  );
}

/** Inline note input for players to signal the DM (e.g. "concentrating on Bless") */
function PlayerNoteInput({ combatantId, onSubmit }: { combatantId: string; onSubmit: (id: string, note: string) => void }) {
  const t = useTranslations("player");
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    onSubmit(combatantId, value.trim());
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      savedTimerRef.current = null;
      setSaved(false);
    }, 2000);
  }, [combatantId, onSubmit, value]);

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        placeholder={t("note_placeholder")}
        className="flex-1 bg-transparent border border-border rounded px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold min-h-[44px]"
        maxLength={100}
        data-testid={`player-note-input-${combatantId}`}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="px-3 py-2 text-sm font-medium rounded bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[44px]"
        data-testid={`player-note-send-${combatantId}`}
      >
        {saved ? t("note_sent") : t("note_send")}
      </button>
    </div>
  );
}


function formatRelativeTime(timestamp: number, t: ReturnType<typeof useTranslations<"player">>): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return t("log_time_now");
  const min = Math.floor(diff / 60);
  return t("log_time_minutes", { min });
}

const LOG_TYPE_COLORS: Record<CombatLogEntry["type"], string> = {
  damage: "text-red-400",
  heal: "text-green-400",
  turn: "text-gold",
  condition: "text-purple-400",
};

interface PlayerInitiativeBoardProps {
  combatants: PlayerCombatant[];
  currentTurnIndex: number;
  roundNumber: number;
  rulesetVersion: RulesetVersion;
  combatLog?: CombatLogEntry[];
  /** Callback when a player edits their own character's note */
  onPlayerNote?: (combatantId: string, note: string) => void;
}

export function PlayerInitiativeBoard({
  combatants,
  currentTurnIndex,
  roundNumber,
  rulesetVersion,
  combatLog,
  onPlayerNote,
}: PlayerInitiativeBoardProps) {
  const t = useTranslations("player");
  const turnRef = useRef<HTMLLIElement | null>(null);
  const prevTurnIndexRef = useRef(currentTurnIndex);
  const [showYourTurn, setShowYourTurn] = useState(false);
  const yourTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track highest revealed index during round 1 (persists across re-renders)
  const [maxRevealedIndex, setMaxRevealedIndex] = useState(currentTurnIndex);

  // Update max revealed index when turn advances in round 1
  useEffect(() => {
    if (roundNumber === 1 && currentTurnIndex > maxRevealedIndex) {
      setMaxRevealedIndex(currentTurnIndex);
    }
    // When round 2 starts, reveal all
    if (roundNumber >= 2) {
      setMaxRevealedIndex(combatants.length - 1);
    }
  }, [currentTurnIndex, roundNumber, combatants.length, maxRevealedIndex]);

  // Progressive reveal: in round 1, only show combatants up to current turn
  const isRevealed = useCallback((index: number) => {
    if (roundNumber >= 2) return true;
    return index <= maxRevealedIndex;
  }, [roundNumber, maxRevealedIndex]);

  // Auto-scroll to current turn combatant when turn changes
  useEffect(() => {
    turnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentTurnIndex]);

  // Separate player characters from others for "own character" highlight
  const playerChars = combatants.filter((c) => c.is_player);
  const hasOwnChar = playerChars.length > 0;

  // Count revealed vs total for round 1 display
  const revealedCount = roundNumber >= 2
    ? combatants.length
    : Math.min(maxRevealedIndex + 1, combatants.length);

  // TASK 2: Turn notification with vibration
  useEffect(() => {
    if (prevTurnIndexRef.current === currentTurnIndex) return;
    prevTurnIndexRef.current = currentTurnIndex;

    const currentCombatant = combatants[currentTurnIndex];
    if (!currentCombatant?.is_player) return;

    // Vibrate
    try {
      if (navigator.vibrate) navigator.vibrate(200);
    } catch {
      // vibrate not supported
    }

    // Show banner
    setShowYourTurn(true);
    if (yourTurnTimerRef.current) clearTimeout(yourTurnTimerRef.current);
    yourTurnTimerRef.current = setTimeout(() => {
      yourTurnTimerRef.current = null;
      setShowYourTurn(false);
    }, 3000);

    return () => {
      if (yourTurnTimerRef.current) clearTimeout(yourTurnTimerRef.current);
    };
  }, [currentTurnIndex, combatants]);

  // Check if it's currently the player's turn (for pulse animation)
  const isPlayerTurn = combatants[currentTurnIndex]?.is_player ?? false;

  // Last 5 log entries for display
  const visibleLog = combatLog?.slice(-5) ?? [];

  return (
    <div className="space-y-3">
      {/* Your Turn Banner */}
      {showYourTurn && (
        <div className="bg-gold/20 border border-gold rounded-lg px-4 py-3 text-center animate-pulse">
          <span className="text-gold font-semibold text-sm">
            🎯 {t("your_turn_banner")}
          </span>
        </div>
      )}

      {/* Combat Log */}
      {visibleLog.length > 0 && (
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <h3 className="text-muted-foreground text-xs font-medium mb-1.5">{t("combat_log_title")}</h3>
          <ul className="space-y-0.5 max-h-28 overflow-y-auto">
            {visibleLog.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`} className="flex items-baseline gap-2 text-xs">
                <span className={`shrink-0 ${LOG_TYPE_COLORS[entry.type]}`}>●</span>
                <span className="text-foreground/80 flex-1">{entry.text}</span>
                <span className="text-muted-foreground text-[10px] shrink-0">
                  {formatRelativeTime(entry.timestamp, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Own Character Card(s) — prominent display */}
      {hasOwnChar && (
        <div className="space-y-2">
          {playerChars.map((pc) => {
            const pcIndex = combatants.findIndex((c) => c.id === pc.id);
            const pcTurnReached = roundNumber >= 2 || pcIndex <= maxRevealedIndex;
            const currentHp = pc.current_hp ?? 0;
            const maxHp = pc.max_hp ?? 0;
            const tempHp = pc.temp_hp ?? 0;
            const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
            const hpBarColor = getHpBarColor(currentHp, maxHp);
            const hpThresholdKey = getHpThresholdKey(currentHp, maxHp);
            const hasTempHp = tempHp > 0;

            return (
              <div
                key={pc.id}
                className={`bg-card border-2 border-gold rounded-lg px-4 py-4${isPlayerTurn ? " ring-2 ring-gold/50 shadow-[0_0_12px_rgba(212,168,83,0.3)] motion-reduce:ring-gold/30 motion-reduce:shadow-none" : ""}`}
                data-testid={`own-character-${pc.id}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="w-4 h-4 text-gold select-none" aria-hidden="true" />
                  <span className="text-foreground text-lg font-semibold truncate flex-1">
                    {pc.name}
                  </span>
                  {pc.is_defeated && (
                    <span className="text-xs text-red-400 font-medium">{t("defeated")}</span>
                  )}
                  {!pcTurnReached && !pc.is_defeated && (
                    <span className="text-xs text-muted-foreground/60">{t("turn_not_reached")}</span>
                  )}
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
                    <span className="text-foreground text-2xl font-mono font-bold">
                      {currentHp}<span className="text-muted-foreground text-base font-normal"> / {maxHp}</span>
                      {hpThresholdKey && (
                        <span className="text-xs font-mono ml-2 text-muted-foreground">
                          {t(hpThresholdKey)}
                        </span>
                      )}
                    </span>
                  </div>
                  {hasTempHp && (
                    <div className="text-sm text-[#9f7aea] font-mono mb-1">
                      {t("temp_hp", { value: tempHp })}
                    </div>
                  )}
                  <div
                    className="h-3 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={currentHp}
                    aria-valuemin={0}
                    aria-valuemax={maxHp}
                    aria-label={t("hp_aria", { name: pc.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${hpBarColor}`}
                      style={{ width: `${hpPct * 100}%` }}
                    />
                  </div>
                </div>
                {pc.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label={`${pc.name} conditions`}>
                    {pc.conditions.map((condition) => (
                      <ConditionBadge
                        key={condition}
                        condition={condition}
                        rulesetVersion={(pc.ruleset_version as RulesetVersion) ?? rulesetVersion}
                      />
                    ))}
                  </div>
                )}
                {/* Player note input — players can signal the DM */}
                {onPlayerNote && (
                  <PlayerNoteInput
                    combatantId={pc.id}
                    onSubmit={onPlayerNote}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Round 1 reveal indicator */}
      {roundNumber === 1 && (
        <div className="text-center py-2">
          <p className="text-muted-foreground text-xs">
            {t("reveal_count", { revealed: revealedCount })}
          </p>
        </div>
      )}

      {/* Initiative Order */}
      <ul
        className="space-y-2"
        role="list"
        aria-label={t("initiative_order")}
        data-testid="player-initiative-board"
      >
        {combatants.map((combatant, index) => {
          // Progressive reveal: hide unrevealed combatants in round 1
          if (!isRevealed(index)) return null;
          const isCurrentTurn = index === currentTurnIndex;
          const isPlayer = combatant.is_player;

          // Player characters: show full HP bar
          const hpPct = isPlayer && combatant.max_hp && combatant.max_hp > 0
            ? Math.max(0, Math.min(1, (combatant.current_hp ?? 0) / combatant.max_hp))
            : 0;
          const hpBarColor = isPlayer ? getHpBarColor(combatant.current_hp ?? 0, combatant.max_hp ?? 0) : "";
          const hpThresholdKey = isPlayer ? getHpThresholdKey(combatant.current_hp ?? 0, combatant.max_hp ?? 0) : null;
          const hasTempHp = isPlayer && (combatant.temp_hp ?? 0) > 0;

          return (
            <li
              key={combatant.id}
              ref={isCurrentTurn ? turnRef : undefined}
              className={`bg-card border rounded-lg px-4 py-3 min-h-[64px] transition-all duration-300 ${
                isCurrentTurn ? "border-gold bg-gold/5" : "border-border"
              } ${combatant.is_defeated ? "opacity-50" : ""} ${
                isPlayer ? "border-gold/40" : ""
              } ${roundNumber === 1 && index === maxRevealedIndex ? "animate-fade-in" : ""}`}
              role="listitem"
              aria-current={isCurrentTurn ? true : undefined}
              data-testid={`player-combatant-${combatant.id}`}
            >
              {/* Name row */}
              <div className="flex items-center gap-2 mb-2">
                {isCurrentTurn && (
                  <span
                    className="text-gold shrink-0 text-sm leading-none select-none"
                    aria-label={t("current_turn")}
                  >
                    ▶
                  </span>
                )}
                <span className="text-foreground text-sm font-medium flex-1 truncate">
                  {combatant.name}
                  {isPlayer && (
                    <span className="text-gold/60 text-xs ml-1">({t("you_label")})</span>
                  )}
                </span>
                {combatant.is_defeated && (
                  <span className="text-xs text-red-400 font-medium shrink-0">
                    {t("defeated")}
                  </span>
                )}
              </div>

              {/* HP display — full bar for players, status label for monsters */}
              {isPlayer ? (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
                    <span className="text-muted-foreground text-sm font-mono">
                      {combatant.current_hp} / {combatant.max_hp}
                      {hpThresholdKey && (
                        <span className="text-xs font-mono ml-1 text-muted-foreground">
                          {t(hpThresholdKey)}
                        </span>
                      )}
                      {hasTempHp && (
                        <span className="text-[#9f7aea] ml-1 text-xs">
                          {t("temp_hp", { value: combatant.temp_hp ?? 0 })}
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={combatant.current_hp}
                    aria-valuemin={0}
                    aria-valuemax={combatant.max_hp}
                    aria-label={t("hp_aria", { name: combatant.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${hpBarColor}`}
                      style={{ width: `${hpPct * 100}%` }}
                    />
                  </div>
                </div>
              ) : combatant.hp_status ? (
                <div className="mb-2">
                  <HpStatusBadge status={combatant.hp_status} />
                </div>
              ) : null}

              {/* Condition badges */}
              {combatant.conditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5" role="list" aria-label={`${combatant.name} conditions`}>
                  {combatant.conditions.map((condition) => (
                    <ConditionBadge
                      key={condition}
                      condition={condition}
                      rulesetVersion={(combatant.ruleset_version as RulesetVersion) ?? rulesetVersion}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
