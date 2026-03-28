"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { PlayerBottomBar } from "@/components/player/PlayerBottomBar";
import { TurnUpcomingBanner } from "@/components/player/TurnUpcomingBanner";
import { TurnNotificationOverlay } from "@/components/player/TurnNotificationOverlay";
import { getHpBarColor, getHpThresholdKey } from "@/lib/utils/hp-status";
import { HPLegendOverlay } from "@/components/combat/HPLegendOverlay";
import type { RulesetVersion } from "@/lib/types/database";
import { Swords, Skull } from "lucide-react";
import { PlayerSoundboard } from "@/components/audio/PlayerSoundboard";
import type { PlayerAudioFile } from "@/lib/types/audio";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { WeatherOverlay, type WeatherEffect } from "@/components/player/WeatherOverlay";

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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm lg:text-xs font-medium ${style.colorClass} ${style.bgClass}`}
      aria-label={label}
    >
      {style.icon === "skull" ? (
        <Skull className="w-4 h-4 lg:w-3.5 lg:h-3.5" aria-hidden="true" />
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
    <div className="mt-3 flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        placeholder={t("note_placeholder")}
        className="flex-1 bg-transparent border border-border rounded px-3 py-2 text-foreground text-base lg:text-sm focus:outline-none focus:ring-1 focus:ring-gold min-h-[48px]"
        maxLength={100}
        data-testid={`player-note-input-${combatantId}`}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="px-4 py-2 text-base lg:text-sm font-medium rounded bg-gold/20 text-gold active:bg-gold/40 lg:hover:bg-gold/30 transition-colors min-h-[48px]"
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
  /** ID of the next combatant after the current one (Story 3.1) */
  nextCombatantId?: string | null;
  /** Callback when a player edits their own character's note */
  onPlayerNote?: (combatantId: string, note: string) => void;
  /** Weather effect from DM broadcast */
  weatherEffect?: string;
  /** Realtime channel ref for broadcasting audio events */
  channelRef?: React.RefObject<RealtimeChannel | null>;
  /** Player's custom audio files */
  customAudioFiles?: PlayerAudioFile[];
  /** Signed URLs for custom audio files */
  customAudioUrls?: Record<string, string>;
}

export function PlayerInitiativeBoard({
  combatants,
  currentTurnIndex,
  roundNumber,
  rulesetVersion,
  combatLog,
  nextCombatantId,
  weatherEffect,
  onPlayerNote,
  channelRef,
  customAudioFiles = [],
  customAudioUrls = {},
}: PlayerInitiativeBoardProps) {
  const t = useTranslations("player");
  const turnRef = useRef<HTMLLIElement | null>(null);
  // Track highest revealed index during round 1 (persists across re-renders)
  const [maxRevealedIndex, setMaxRevealedIndex] = useState(currentTurnIndex);

  // Track known combatant IDs to detect newly revealed combatants (dramatic entrance)
  const knownIdsRef = useRef<Set<string>>(new Set(combatants.map((c) => c.id)));
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newIds = new Set<string>();
    for (const c of combatants) {
      if (!knownIdsRef.current.has(c.id)) {
        newIds.add(c.id);
      }
    }
    if (newIds.size > 0) {
      setRevealedIds(newIds);
      // Clear the glow effect after animation completes
      const timer = setTimeout(() => setRevealedIds(new Set()), 1500);
      // Update known IDs
      knownIdsRef.current = new Set(combatants.map((c) => c.id));
      return () => clearTimeout(timer);
    }
    knownIdsRef.current = new Set(combatants.map((c) => c.id));
  }, [combatants]);

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

  // Story 3.1 + 3.2: Turn notification state
  const currentCombatant = combatants[currentTurnIndex];
  const isPlayerTurn = currentCombatant?.is_player ?? false;

  // "É sua vez!" overlay — shows on turn start, dismissible
  // Player can disable via localStorage (B2-1 AC #8)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("turn_notifications_disabled") !== "true";
  });
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  // Reset dismissed state when turn changes (so overlay shows again on next turn)
  const prevTurnRef = useRef(currentTurnIndex);
  useEffect(() => {
    if (currentTurnIndex !== prevTurnRef.current) {
      prevTurnRef.current = currentTurnIndex;
      setOverlayDismissed(false);
    }
  }, [currentTurnIndex]);

  // "Você é o próximo!" — show when next_combatant_id matches a player combatant
  const isPlayerUpcoming = !!(
    nextCombatantId &&
    !isPlayerTurn &&
    playerChars.some((c) => c.id === nextCombatantId)
  );

  // Last 5 log entries for display
  const visibleLog = combatLog?.slice(-5) ?? [];

  // First player character for bottom bar (primary character)
  const primaryPlayerChar = playerChars[0] ?? null;

  return (
    <div className="relative bg-black lg:bg-transparent min-h-screen lg:min-h-0 space-y-3 pb-32 lg:pb-0">
      {/* Weather overlay — above background (z-10), below content (z-30) */}
      <WeatherOverlay effect={(weatherEffect ?? "none") as WeatherEffect} />

      {/* Story 3.2: "É sua vez!" — full-screen overlay with spring animation, auto-dismiss 3s */}
      <TurnNotificationOverlay
        visible={isPlayerTurn && !overlayDismissed && notificationsEnabled}
        playerName={currentCombatant?.name ?? ""}
        onDismiss={() => setOverlayDismissed(true)}
      />

      {/* Story 3.1: "Você é o próximo!" — shown when player is next (not current) */}
      <TurnUpcomingBanner visible={isPlayerUpcoming} />

      {/* Combat Log */}
      {visibleLog.length > 0 && (
        <div className="bg-card border border-border rounded-lg px-3 py-2">
          <h3 className="text-muted-foreground text-sm lg:text-xs font-medium mb-1.5">{t("combat_log_title")}</h3>
          <ul className="space-y-1 lg:space-y-0.5 max-h-36 lg:max-h-28 overflow-y-auto">
            {visibleLog.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`} className="flex items-baseline gap-2 text-sm lg:text-xs min-h-[32px] lg:min-h-0 items-center lg:items-baseline">
                <span className={`shrink-0 ${LOG_TYPE_COLORS[entry.type]}`}>●</span>
                <span className="text-foreground/80 flex-1">{entry.text}</span>
                <span className="text-muted-foreground text-xs lg:text-[10px] shrink-0">
                  {formatRelativeTime(entry.timestamp, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Own Character Card(s) — prominent display (hidden on mobile when bottom bar is visible, shown on desktop) */}
      {hasOwnChar && (
        <div className="hidden lg:block space-y-2">
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
                    className="h-4 bg-white/[0.06] rounded-full overflow-hidden"
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

      {/* Mobile-only: player note input above initiative list (since own-character card is in bottom bar) */}
      {hasOwnChar && onPlayerNote && (
        <div className="lg:hidden">
          {playerChars.map((pc) => (
            <PlayerNoteInput
              key={pc.id}
              combatantId={pc.id}
              onSubmit={onPlayerNote}
            />
          ))}
        </div>
      )}

      {/* Round 1 reveal indicator */}
      {roundNumber === 1 && (
        <div className="text-center py-2">
          <p className="text-muted-foreground text-sm lg:text-xs">
            {t("reveal_count", { revealed: revealedCount })}
          </p>
        </div>
      )}

      {/* HP legend for first-time players (B2-6) */}
      <HPLegendOverlay />

      {/* DM's turn indicator — shown when a hidden NPC has the current turn */}
      {currentTurnIndex === -1 && (
        <div
          className="bg-card border border-amber-400/50 rounded-lg px-4 py-3 text-center"
          data-testid="dm-turn-indicator"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-gold text-lg lg:text-sm leading-none select-none">▶</span>
            <span className="text-foreground font-medium text-lg lg:text-sm">{t("dm_turn")}</span>
          </div>
        </div>
      )}

      {/* Initiative Order */}
      <ul
        className="space-y-2 lg:space-y-2"
        role="list"
        aria-label={t("initiative_order")}
        data-testid="player-initiative-board"
      >
        <AnimatePresence mode="popLayout">
        {combatants.map((combatant, index) => {
          // Progressive reveal: hide unrevealed combatants in round 1
          if (!isRevealed(index)) return null;
          const isCurrentTurn = index === currentTurnIndex;
          const isPlayer = combatant.is_player;
          const isNewlyRevealed = revealedIds.has(combatant.id);

          // Player characters: show full HP bar
          const hpPct = isPlayer && combatant.max_hp && combatant.max_hp > 0
            ? Math.max(0, Math.min(1, (combatant.current_hp ?? 0) / combatant.max_hp))
            : 0;
          const hpBarColor = isPlayer ? getHpBarColor(combatant.current_hp ?? 0, combatant.max_hp ?? 0) : "";
          const hpThresholdKey = isPlayer ? getHpThresholdKey(combatant.current_hp ?? 0, combatant.max_hp ?? 0) : null;
          const hasTempHp = isPlayer && (combatant.temp_hp ?? 0) > 0;

          return (
            <motion.li
              key={combatant.id}
              ref={isCurrentTurn ? turnRef : undefined}
              initial={isNewlyRevealed ? { scale: 0.8, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              layout
              className={`bg-card border rounded-lg transition-all duration-300 min-h-[48px] ${
                isCurrentTurn
                  ? "border-amber-400 border-2 bg-gold/5 px-4 py-4 lg:px-4 lg:py-3"
                  : "border-border px-4 py-3"
              } ${combatant.is_defeated ? "opacity-50" : ""} ${
                isPlayer ? "border-gold/40" : ""
              } ${roundNumber === 1 && index === maxRevealedIndex ? "animate-fade-in" : ""} ${
                isNewlyRevealed ? "ring-2 ring-gold/60 shadow-[0_0_16px_rgba(212,168,83,0.4)]" : ""
              }`}
              role="listitem"
              aria-current={isCurrentTurn ? true : undefined}
              data-testid={`player-combatant-${combatant.id}`}
            >
              {/* Name row */}
              <div className="flex items-center gap-2 mb-2 min-h-[48px] lg:min-h-0">
                {isCurrentTurn && (
                  <span
                    className="text-gold shrink-0 text-lg lg:text-sm leading-none select-none"
                    aria-label={t("current_turn")}
                  >
                    ▶
                  </span>
                )}
                <span className={`text-foreground font-medium flex-1 truncate ${
                  isCurrentTurn ? "text-2xl lg:text-sm" : "text-xl lg:text-sm"
                }`}>
                  {combatant.name}
                  {isPlayer && (
                    <span className="text-gold/60 text-sm lg:text-xs ml-1">({t("you_label")})</span>
                  )}
                </span>
                {combatant.is_defeated && (
                  <span className="text-sm lg:text-xs text-red-400 font-medium shrink-0">
                    {t("defeated")}
                  </span>
                )}
              </div>

              {/* HP display — full bar for players, status label for monsters */}
              {isPlayer ? (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground text-sm lg:text-xs">{t("hp_label")}</span>
                    <span className="text-muted-foreground text-base lg:text-sm font-mono">
                      {combatant.current_hp} / {combatant.max_hp}
                      {hpThresholdKey && (
                        <span className="text-sm lg:text-xs font-mono ml-1 text-muted-foreground">
                          {t(hpThresholdKey)}
                        </span>
                      )}
                      {hasTempHp && (
                        <span className="text-[#9f7aea] ml-1 text-sm lg:text-xs">
                          {t("temp_hp", { value: combatant.temp_hp ?? 0 })}
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    className="h-6 lg:h-2.5 bg-white/[0.06] rounded-full overflow-hidden"
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
                <div className="flex flex-wrap gap-2 lg:gap-1.5" role="list" aria-label={`${combatant.name} conditions`}>
                  {combatant.conditions.map((condition) => (
                    <ConditionBadge
                      key={condition}
                      condition={condition}
                      rulesetVersion={(combatant.ruleset_version as RulesetVersion) ?? rulesetVersion}
                    />
                  ))}
                </div>
              )}
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>

      {/* Notification toggle */}
      <div className="flex justify-center py-2">
        <button
          type="button"
          onClick={() => {
            const next = !notificationsEnabled;
            setNotificationsEnabled(next);
            localStorage.setItem("turn_notifications_disabled", next ? "false" : "true");
          }}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          data-testid="notification-toggle"
        >
          {notificationsEnabled ? t("notifications_on") : t("notifications_off")}
        </button>
      </div>

      {/* Bottom-anchored bar for player's own character (mobile only) */}
      {primaryPlayerChar && primaryPlayerChar.current_hp != null && primaryPlayerChar.max_hp != null && (
        <PlayerBottomBar
          character={{
            id: primaryPlayerChar.id,
            name: primaryPlayerChar.name,
            current_hp: primaryPlayerChar.current_hp,
            max_hp: primaryPlayerChar.max_hp,
            temp_hp: primaryPlayerChar.temp_hp,
            ac: primaryPlayerChar.ac,
            conditions: primaryPlayerChar.conditions,
            is_defeated: primaryPlayerChar.is_defeated,
            ruleset_version: primaryPlayerChar.ruleset_version,
          }}
          rulesetVersion={rulesetVersion}
        />
      )}

      {/* Soundboard — visible only during active combat with channel */}
      {channelRef && (
        <PlayerSoundboard
          isPlayerTurn={isPlayerTurn}
          playerName={currentCombatant?.name ?? ""}
          channelRef={channelRef}
          customAudioFiles={customAudioFiles}
          customAudioUrls={customAudioUrls}
        />
      )}
    </div>
  );
}
