"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { PlayerBottomBar } from "@/components/player/PlayerBottomBar";
import { TurnUpcomingBanner } from "@/components/player/TurnUpcomingBanner";
import { TurnNotificationOverlay } from "@/components/player/TurnNotificationOverlay";
import { getHpBarColor, getHpThresholdKey, getHpStatus, getHpPercentage, HP_STATUS_STYLES } from "@/lib/utils/hp-status";
import { HPLegendOverlay } from "@/components/combat/HPLegendOverlay";
import type { RulesetVersion } from "@/lib/types/database";
import { Swords, Skull, User, Bug, HeartPulse, Shield, Zap, BookOpen, ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { PlayerSoundboard } from "@/components/audio/PlayerSoundboard";
import type { PlayerAudioFile } from "@/lib/types/audio";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { WeatherOverlay, type WeatherEffect } from "@/components/player/WeatherOverlay";
import { DeathSaveTracker } from "@/components/combat/DeathSaveTracker";
import { TurnPushNotification } from "@/components/player/TurnPushNotification";
import { PlayerSpellBrowser } from "@/components/player/PlayerSpellBrowser";
import { PlayerHpActions } from "@/components/player/PlayerHpActions";
import { SpellSlotTracker } from "@/components/player/SpellSlotTracker";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { CombatActionLog } from "@/components/combat/CombatActionLog";
import { BENEFICIAL_CONDITIONS } from "@/components/combat/ConditionSelector";

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
  spell_save_dc?: number | null;
  /** Player character class (e.g. "Wizard") — used for spell browser pre-filter */
  class?: string;
  /** HP status label for monsters (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) */
  hp_status?: string;
  /** HP percentage (0-100) for monsters */
  hp_percentage?: number;
  /** Group ID for monster grouping */
  monster_group_id?: string | null;
  /** Order within a monster group */
  group_order?: number | null;
  /** Death saves state for players at 0 HP */
  death_saves?: { successes: number; failures: number };
  /** Turn count per condition — shown for other players only (anti-metagaming: hidden for monsters) */
  condition_durations?: Record<string, number>;
}


/** Abbreviated tier labels for mobile */
const TIER_SHORT: Record<string, string> = {
  FULL: "FULL",
  LIGHT: "LGT",
  MODERATE: "MOD",
  HEAVY: "HVY",
  CRITICAL: "CRT",
};

function HpStatusBadge({ status, percentage }: { status: string; percentage?: number }) {
  const t = useTranslations("player");
  const style = (HP_STATUS_STYLES as Record<string, (typeof HP_STATUS_STYLES)[keyof typeof HP_STATUS_STYLES]>)[status] ?? HP_STATUS_STYLES.LIGHT;
  const label = t(`hp_status_${status.toLowerCase()}` as Parameters<typeof t>[0]);
  const shortLabel = TIER_SHORT[status] ?? status.slice(0, 3);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm lg:text-xs font-medium ${style.colorClass} ${style.bgClass}`}
      aria-label={`${label}${percentage != null ? ` ${percentage}%` : ""}`}
    >
      {style.icon === "heartpulse" ? (
        <HeartPulse className="w-4 h-4 lg:w-3.5 lg:h-3.5" aria-hidden="true" />
      ) : style.icon === "skull" ? (
        <Skull className="w-4 h-4 lg:w-3.5 lg:h-3.5" aria-hidden="true" />
      ) : style.icon === "warning" ? (
        <span aria-hidden="true">⚠</span>
      ) : style.icon === "danger" ? (
        <span aria-hidden="true">‼</span>
      ) : (
        <span aria-hidden="true">♥</span>
      )}
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
      {percentage != null && status !== "FULL" && (
        <span className="font-normal opacity-70">· {percentage}%</span>
      )}
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
  /** The registered player name for this session (used to identify "my" turn) */
  registeredName?: string;
  /** Session ID — used for push notification subscription */
  sessionId?: string;
  /** Callback when the player ends their own turn */
  onEndTurn?: () => void;
  /** Callback when the player marks a death save (optimistic update + broadcast) */
  onDeathSave?: (combatantId: string, result: "success" | "failure") => void;
  /** Whether custom audio URLs are still loading */
  isLoadingAudioUrls?: boolean;
  /** HP delta visual feedback — shows floating +/-X on HP change */
  hpDelta?: { combatantId: string; delta: number; type: "damage" | "heal" | "temp"; timestamp: number } | null;
  /** Death save resolution overlay — "stabilized" or "fallen" */
  deathSaveResolution?: { combatantId: string; result: "stabilized" | "fallen"; timestamp: number } | null;
  /** Callback when the player reports HP changes (damage/heal/temp) */
  onHpAction?: (combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => void;
  /** Realtime connection status — used to disable HP action buttons when offline */
  connectionStatus?: string;
  /** Spell slots state for the player's character (F-41) */
  spellSlots?: Record<string, { max: number; used: number }> | null;
  /** Callback when player toggles a spell slot dot */
  onToggleSlot?: (level: string, slotIndex: number) => void;
  /** Callback when player triggers Long Rest */
  onLongRest?: () => void;
  /** Callback when player self-toggles a beneficial condition on their own character */
  onSelfConditionToggle?: (combatantId: string, condition: string) => void;
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
  registeredName,
  sessionId,
  onEndTurn,
  onDeathSave,
  isLoadingAudioUrls = false,
  hpDelta,
  deathSaveResolution,
  onHpAction,
  connectionStatus,
  spellSlots,
  onToggleSlot,
  onLongRest,
  onSelfConditionToggle,
}: PlayerInitiativeBoardProps) {
  const t = useTranslations("player");
  const tc = useTranslations("combat");
  const turnRef = useRef<HTMLLIElement | null>(null);
  // End Turn delivery confirmation states: idle → pending → confirmed/retry/error
  const [endTurnState, setEndTurnState] = useState<"idle" | "pending" | "confirmed" | "retry" | "error">("idle");
  const [showActionLog, setShowActionLog] = useState(false);
  const endTurnTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endTurnPending = endTurnState !== "idle";
  const clearEndTurnTimers = useCallback(() => {
    for (const t of endTurnTimersRef.current) clearTimeout(t);
    endTurnTimersRef.current = [];
  }, []);
  useEffect(() => { return () => clearEndTurnTimers(); }, [clearEndTurnTimers]);
  const handleEndTurn = useCallback(() => {
    if (endTurnState !== "idle" || !onEndTurn) return;
    setEndTurnState("pending");
    onEndTurn();
    // 5s timeout → retry
    const retryTimer = setTimeout(() => {
      setEndTurnState("retry");
      onEndTurn(); // Re-broadcast
      // 10s total → error
      const errorTimer = setTimeout(() => {
        setEndTurnState("error");
        const resetTimer = setTimeout(() => setEndTurnState("idle"), 5000);
        endTurnTimersRef.current.push(resetTimer);
      }, 5000);
      endTurnTimersRef.current.push(errorTimer);
    }, 5000);
    endTurnTimersRef.current.push(retryTimer);
  }, [endTurnState, onEndTurn]);
  // When turn actually advances → confirmed (checkmark 500ms then reset)
  useEffect(() => {
    if (endTurnState === "pending" || endTurnState === "retry") {
      clearEndTurnTimers();
      setEndTurnState("confirmed");
      const t = setTimeout(() => setEndTurnState("idle"), 500);
      endTurnTimersRef.current.push(t);
    } else {
      setEndTurnState("idle");
      clearEndTurnTimers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to turn changes
  }, [currentTurnIndex]);

  // Death save handler — broadcasts to DM channel
  const [deathSavePending, setDeathSavePending] = useState(false);
  const deathSaveCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (deathSaveCooldownRef.current) clearTimeout(deathSaveCooldownRef.current); }; }, []);
  // Reset pending state when turn changes
  useEffect(() => { setDeathSavePending(false); }, [currentTurnIndex]);
  const handleDeathSave = useCallback((result: "success" | "failure") => {
    if (deathSavePending || !ownCharRef.current || !onDeathSave) return;
    setDeathSavePending(true);
    onDeathSave(ownCharRef.current.id, result);
    deathSaveCooldownRef.current = setTimeout(() => setDeathSavePending(false), 2000);
  }, [deathSavePending, onDeathSave]);
  // Spell browser state
  const [spellsOpen, setSpellsOpen] = useState(false);

  // B.07: AC/DC mid-combat flash — detect changes and flash amber for 1.5s
  const prevAcRef = useRef<number | undefined>(undefined);
  const prevDcRef = useRef<number | null | undefined>(undefined);
  const [acFlash, setAcFlash] = useState(false);
  const [dcFlash, setDcFlash] = useState(false);
  const acFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dcFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const pc = registeredName ? combatants.find((c) => c.is_player && c.name === registeredName) : null;
    if (!pc) return;
    // AC changed
    if (prevAcRef.current !== undefined && pc.ac !== prevAcRef.current) {
      setAcFlash(true);
      if (acFlashTimerRef.current) clearTimeout(acFlashTimerRef.current);
      acFlashTimerRef.current = setTimeout(() => { setAcFlash(false); acFlashTimerRef.current = null; }, 1500);
    }
    prevAcRef.current = pc.ac;
    // DC changed
    if (prevDcRef.current !== undefined && pc.spell_save_dc !== prevDcRef.current) {
      setDcFlash(true);
      if (dcFlashTimerRef.current) clearTimeout(dcFlashTimerRef.current);
      dcFlashTimerRef.current = setTimeout(() => { setDcFlash(false); dcFlashTimerRef.current = null; }, 1500);
    }
    prevDcRef.current = pc.spell_save_dc;
  }, [combatants, registeredName]);
  useEffect(() => {
    return () => {
      if (acFlashTimerRef.current) clearTimeout(acFlashTimerRef.current);
      if (dcFlashTimerRef.current) clearTimeout(dcFlashTimerRef.current);
    };
  }, []);

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

  // Update max revealed index when turn advances or combatants change in round 1
  useEffect(() => {
    if (roundNumber >= 2) {
      // When round 2 starts, reveal all
      setMaxRevealedIndex(combatants.length - 1);
    } else if (roundNumber === 1) {
      // B3: Recalculate when combatants are added — include new combatant if their
      // position is at or before the current turn index
      setMaxRevealedIndex((prev) => Math.max(prev, currentTurnIndex));
    }
  }, [currentTurnIndex, roundNumber, combatants.length]);

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
  // Only the combatant matching registeredName is "own character"
  const ownChar = registeredName
    ? playerChars.find((c) => c.name === registeredName) ?? null
    : null;
  const ownCharRef = useRef(ownChar);
  ownCharRef.current = ownChar;
  const hasOwnChar = ownChar !== null;

  // Count revealed vs total for round 1 display
  const revealedCount = roundNumber >= 2
    ? combatants.length
    : Math.min(maxRevealedIndex + 1, combatants.length);

  // Story 3.1 + 3.2: Turn notification state
  const currentCombatant = combatants[currentTurnIndex];
  // "É sua vez!" only when it's THIS player's turn, not any player
  const isPlayerTurn = registeredName
    ? currentCombatant?.is_player === true && currentCombatant.name === registeredName
    : currentCombatant?.is_player ?? false;

  // Resolve next combatant for the "Next up" display
  const nextCombatant = nextCombatantId
    ? combatants.find((c) => c.id === nextCombatantId)
    : null;

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

  // Monster group expand/collapse state
  const [expandedPlayerGroups, setExpandedPlayerGroups] = useState<Record<string, boolean>>({});
  const togglePlayerGroup = useCallback((groupId: string) => {
    setExpandedPlayerGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  // Pre-compute monster group data once per combatants change (P-07: avoids IIFE mutation during render)
  const groupMap = useMemo(() => {
    const map = new Map<string, { members: PlayerCombatant[]; indices: number[] }>();
    combatants.forEach((c, idx) => {
      if (c.monster_group_id) {
        if (!map.has(c.monster_group_id)) {
          map.set(c.monster_group_id, { members: [], indices: [] });
        }
        const g = map.get(c.monster_group_id)!;
        g.members.push(c);
        g.indices.push(idx);
      }
    });
    return map;
  }, [combatants]);

  // First-member IDs for group header rendering (stable Set, no mutation during render)
  const groupFirstMemberIds = useMemo(() => {
    const ids = new Set<string>();
    groupMap.forEach((group) => {
      if (group.members[0]) ids.add(group.members[0].id);
    });
    return ids;
  }, [groupMap]);

  // "Você é o próximo!" — show when next_combatant_id matches THIS player
  const isPlayerUpcoming = !!(
    nextCombatantId &&
    !isPlayerTurn &&
    ownChar &&
    ownChar.id === nextCombatantId
  );

  // Current player's character for bottom bar
  const primaryPlayerChar = ownChar;

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

      {/* ── STICKY TURN INDICATOR ── */}
      {/* Always visible at the top when scrolling — h-14 fixed height */}
      {(currentCombatant || currentTurnIndex === -1) && (
        <div
          className="sticky top-0 z-30 -mx-2 px-2 bg-background/95 backdrop-blur-sm border-b border-border"
          data-testid="sticky-turn-header"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTurnIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-14 flex items-center gap-2 max-w-2xl mx-auto px-2"
            >
              <span className="text-gold text-lg leading-none select-none" aria-hidden="true">▶</span>
              {currentTurnIndex === -1 ? (
                <span className="text-foreground font-medium text-base">{t("dm_turn")}</span>
              ) : currentCombatant && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-semibold text-base truncate max-w-[200px]">
                      {isPlayerTurn ? t("your_turn_banner") : t("turn_of", { name: currentCombatant.name })}
                    </span>
                    {currentCombatant.is_player ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        <User className="w-3 h-3" aria-hidden="true" />
                        {t("player_tag")}
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                        <Bug className="w-3 h-3" aria-hidden="true" />
                        {t("monster_tag")}
                      </span>
                    )}
                  </div>
                  {nextCombatant && (
                    <span className="text-muted-foreground text-xs">
                      {t("next_up", { name: nextCombatant.name })}
                    </span>
                  )}
                </div>
              )}
              {/* Dice roller — accessible during the whole combat */}
              <DiceRoller />
              <button
                type="button"
                onClick={() => setShowActionLog(v => !v)}
                className="shrink-0 p-1.5 text-muted-foreground hover:text-gold transition-colors rounded"
                aria-label={tc("combat_log_title")}
                data-testid="player-action-log-btn"
              >
                <ScrollText className="w-4 h-4" />
              </button>
              {currentCombatant && (
                <span className="shrink-0 text-xs font-mono text-muted-foreground/70 tabular-nums" aria-label={`Rodada ${roundNumber}`}>
                  R{roundNumber}
                </span>
              )}
              {isPlayerTurn && onEndTurn && (
                <button
                  type="button"
                  onClick={handleEndTurn}
                  disabled={endTurnState !== "idle"}
                  className={`shrink-0 ml-auto px-4 py-2 font-medium text-sm rounded-lg transition-colors min-h-[44px] disabled:cursor-not-allowed ${
                    endTurnState === "confirmed" ? "bg-green-500/20 text-green-400" :
                    endTurnState === "retry" ? "bg-amber-500/20 text-amber-400" :
                    endTurnState === "error" ? "bg-red-500/20 text-red-400" :
                    "bg-gold/20 text-gold active:bg-gold/40 lg:hover:bg-gold/30 disabled:opacity-50"
                  }`}
                  data-testid="player-end-turn-btn"
                >
                  {endTurnState === "idle" ? t("end_turn") :
                   endTurnState === "pending" ? "..." :
                   endTurnState === "confirmed" ? "✓" :
                   endTurnState === "retry" ? t("end_turn_retry") :
                   t("end_turn_error")}
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Own Character Card(s) — prominent display (hidden on mobile when bottom bar is visible, shown on desktop) */}
      {hasOwnChar && ownChar && (
        <div className="hidden lg:block space-y-2">
          {[ownChar].map((pc) => {
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
                className={`bg-card border-2 border-gold rounded-lg px-4 py-4 relative${isPlayerTurn ? " ring-2 ring-gold/50 shadow-[0_0_12px_rgba(212,168,83,0.3)] motion-reduce:ring-gold/30 motion-reduce:shadow-none" : ""}${hpDelta && hpDelta.combatantId === pc.id && currentHp === 0 ? " animate-[pulse-red_500ms_ease-in-out_2]" : ""}${(pc.death_saves?.failures ?? 0) >= 3 ? " opacity-30 grayscale" : ""}`}
                data-testid={`own-character-${pc.id}`}
              >
                {/* Death save resolution overlay */}
                <AnimatePresence>
                  {deathSaveResolution && deathSaveResolution.combatantId === pc.id && (
                    <motion.div
                      key={deathSaveResolution.timestamp}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`absolute inset-0 z-10 flex items-center justify-center rounded-lg opacity-100 filter-none ${deathSaveResolution.result === "stabilized" ? "bg-green-500/20 ring-2 ring-green-400" : "bg-red-500/20 ring-2 ring-red-400"}`}
                      style={{ opacity: 1, filter: "none" }}
                    >
                      <span className={`text-2xl font-bold ${deathSaveResolution.result === "stabilized" ? "text-green-400" : "text-red-400"}`}>
                        {deathSaveResolution.result === "stabilized" ? t("death_save_stabilized_overlay") : t("death_save_fallen_overlay")}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                {/* AC + Save DC — own character only (B.07: flash amber on mid-combat change) */}
                <div className="flex items-center gap-3 text-muted-foreground text-sm mb-2">
                  {pc.ac != null && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span className={`font-mono font-semibold transition-colors duration-[1500ms] ${acFlash ? "text-amber-400" : "text-foreground"}`}>{pc.ac}</span>
                    </div>
                  )}
                  {pc.spell_save_dc != null && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span className={`font-mono font-semibold transition-colors duration-[1500ms] ${dcFlash ? "text-amber-400" : "text-foreground"}`}>DC {pc.spell_save_dc}</span>
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
                    <span className={`text-foreground text-2xl font-mono font-bold relative${hpDelta && hpDelta.combatantId === pc.id ? (hpDelta.type === "damage" ? " animate-[flash-red_150ms_ease-in-out_2]" : " animate-[flash-green_150ms_ease-in-out_2]") : ""}`}>
                      {currentHp}<span className="text-muted-foreground text-base font-normal"> / {maxHp}</span>
                      {hpThresholdKey && (
                        <span className="text-xs font-mono ml-2 text-muted-foreground">
                          {t(hpThresholdKey)} · {getHpPercentage(currentHp, maxHp)}%
                        </span>
                      )}
                      {/* Floating HP delta */}
                      <AnimatePresence>
                        {hpDelta && hpDelta.combatantId === pc.id && (
                          <motion.span
                            key={hpDelta.timestamp}
                            initial={{ opacity: 1, y: 0 }}
                            animate={{ opacity: 1, y: -20 }}
                            exit={{ opacity: 0, y: -40 }}
                            transition={{ duration: 1.5 }}
                            className={`absolute -right-2 -top-2 text-lg font-bold pointer-events-none ${hpDelta.type === "damage" ? "text-red-400" : hpDelta.type === "temp" ? "text-purple-400" : "text-green-400"}`}
                          >
                            {hpDelta.delta > 0 ? "+" : ""}{hpDelta.delta}
                            {hpDelta.type === "temp" && <span className="text-xs ml-0.5">temp</span>}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </div>
                  {hasTempHp && (
                    <div className="text-sm text-temp-hp font-mono mb-1">
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
                {/* HP self-management actions — desktop own-char card (C.13) */}
                {onHpAction && (
                  <div className="mt-2">
                    <PlayerHpActions
                      characterId={pc.id}
                      currentHp={currentHp}
                      maxHp={maxHp}
                      tempHp={tempHp}
                      connectionStatus={connectionStatus ?? "disconnected"}
                      onHpAction={onHpAction}
                    />
                  </div>
                )}
                {/* Spell Slot Tracker — desktop own-char card (F-41) */}
                {spellSlots && Object.keys(spellSlots).length > 0 && onToggleSlot && onLongRest && (
                  <div className="mt-3">
                    <SpellSlotTracker
                      spellSlots={spellSlots}
                      onToggleSlot={onToggleSlot}
                      onLongRest={onLongRest}
                      collapsible={false}
                    />
                  </div>
                )}
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
                {/* Beneficial conditions self-picker — desktop own-char card */}
                {onSelfConditionToggle && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {BENEFICIAL_CONDITIONS.map((condition) => {
                      const isActive = pc.conditions.includes(condition);
                      return (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => onSelfConditionToggle(pc.id, condition)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-900/20 text-emerald-400/70 hover:bg-emerald-900/40 hover:text-emerald-300"
                          }`}
                          aria-pressed={isActive}
                          title={isActive ? `Remove ${condition}` : `Apply ${condition}`}
                        >
                          {condition}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Spell browser — desktop own-char card */}
                <button
                  type="button"
                  onClick={() => setSpellsOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 mt-2 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {tc("spell_open")}
                </button>

                {/* Death saves — desktop own-char card */}
                {currentHp === 0 && maxHp > 0 && !pc.is_defeated && (
                  <div className="mt-3">
                    {isPlayerTurn ? (
                      <p className="text-xs text-red-300 mb-1">{t("death_saves_your_turn")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-1">{t("death_saves_waiting")}</p>
                    )}
                    <DeathSaveTracker
                      successes={pc.death_saves?.successes ?? 0}
                      failures={pc.death_saves?.failures ?? 0}
                      onAddSuccess={() => handleDeathSave("success")}
                      onAddFailure={() => handleDeathSave("failure")}
                      readOnly={!isPlayerTurn}
                      playerContext
                    />
                  </div>
                )}
              </div>
            );
          })}
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

          // Monster group handling
          if (combatant.monster_group_id && groupMap.has(combatant.monster_group_id)) {
            const gid = combatant.monster_group_id;
            const isFirstMember = groupFirstMemberIds.has(combatant.id);
            if (!isFirstMember) {
              // Not the first member — skip if group is collapsed, otherwise render normally below
              if (!expandedPlayerGroups[gid]) return null;
            } else {
              // First member of the group — render group header
              const group = groupMap.get(gid)!;
              const activeMembers = group.members.filter((m) => !m.is_defeated);
              const isGroupExpanded = expandedPlayerGroups[gid] ?? false;
              const hasGroupTurn = group.indices.includes(currentTurnIndex);

              // Aggregate HP status — worst-case badge + average label
              const tierSeverity: Record<string, number> = { FULL: 0, LIGHT: 1, MODERATE: 2, HEAVY: 3, CRITICAL: 4 };
              const tierLabel: Record<number, string> = { 0: "FULL", 1: "LIGHT", 2: "MODERATE", 3: "HEAVY", 4: "CRITICAL" };
              const worstSeverity = activeMembers.length > 0
                ? Math.max(...activeMembers.map((m) => tierSeverity[m.hp_status ?? "LIGHT"] ?? 1))
                : 4;
              const aggStatus = worstSeverity >= 4 ? "CRITICAL" : worstSeverity >= 3 ? "HEAVY" : worstSeverity >= 2 ? "MODERATE" : worstSeverity >= 1 ? "LIGHT" : "FULL";
              const avgSeverity = activeMembers.length > 0
                ? activeMembers.reduce((sum, m) => sum + (tierSeverity[m.hp_status ?? "LIGHT"] ?? 1), 0) / activeMembers.length
                : 4;
              const avgStatus = tierLabel[Math.round(avgSeverity)] ?? "MODERATE";

              // Extract group name (remove trailing number/letter suffix)
              const baseName = group.members[0]?.name.replace(/\s+[\dA-Z]+$/i, "").trim() || group.members[0]?.name || "";

              return (
                <motion.li key={`group-${gid}`} layout>
                  {/* Group header */}
                  <div
                    className={`flex items-center gap-2 px-4 py-2.5 bg-card border rounded-lg cursor-pointer transition-all duration-300 ${
                      hasGroupTurn ? "border-gold ring-1 ring-gold/30 bg-amber-400/5" : "border-border"
                    } border-l-4 border-l-red-500/40`}
                    onClick={() => togglePlayerGroup(gid)}
                    role="button"
                    aria-expanded={isGroupExpanded}
                    data-testid={`player-group-header-${gid}`}
                  >
                    {isGroupExpanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <span className="text-foreground font-medium text-base lg:text-sm truncate">{baseName}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      ({activeMembers.length}/{group.members.length})
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <HpStatusBadge status={aggStatus} />
                      {avgStatus !== aggStatus && (
                        <span className="text-muted-foreground text-[10px] hidden sm:inline">
                          média {avgStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Expanded members rendered below via the normal loop */}
                </motion.li>
              );
            }
          }
          const isCurrentTurn = index === currentTurnIndex;
          const isPlayer = combatant.is_player;
          const isOwnChar = ownChar !== null && combatant.id === ownChar.id;
          const isNewlyRevealed = revealedIds.has(combatant.id);

          // Only own character gets full HP bar; other players get status badge
          const showFullHp = isOwnChar;
          const hpPct = showFullHp && combatant.max_hp && combatant.max_hp > 0
            ? Math.max(0, Math.min(1, (combatant.current_hp ?? 0) / combatant.max_hp))
            : 0;
          const hpBarColor = showFullHp ? getHpBarColor(combatant.current_hp ?? 0, combatant.max_hp ?? 0) : "";
          const hpThresholdKey = showFullHp ? getHpThresholdKey(combatant.current_hp ?? 0, combatant.max_hp ?? 0) : null;
          const hasTempHp = showFullHp && (combatant.temp_hp ?? 0) > 0;
          // For other players (not own char), compute hp_status from their HP values
          const otherPlayerHpStatus = isPlayer && !isOwnChar && combatant.current_hp != null && combatant.max_hp != null
            ? getHpStatus(combatant.current_hp, combatant.max_hp)
            : null;
          const otherPlayerHpPct = isPlayer && !isOwnChar && combatant.current_hp != null && combatant.max_hp != null
            ? getHpPercentage(combatant.current_hp, combatant.max_hp)
            : undefined;

          // CRITICAL visual — player view gets full treatment (opacity + grayscale + pulsing border)
          const isCritical = isPlayer
            ? (combatant.max_hp != null && combatant.max_hp > 0 && (combatant.current_hp ?? 0) / combatant.max_hp <= 0.1)
            : combatant.hp_status === "CRITICAL";

          // Visual differentiation: players = blue left border, monsters = red left border
          const typeBorderClass = isPlayer
            ? "border-l-4 border-l-blue-500/60"
            : "border-l-4 border-l-red-500/40";

          return (
            <motion.li
              key={combatant.id}
              ref={isCurrentTurn ? turnRef : undefined}
              initial={isNewlyRevealed ? { scale: 0.8, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              layout
              className={`bg-card border rounded-lg transition-all duration-300 min-h-[48px] ${typeBorderClass} ${
                isCurrentTurn
                  ? "border-t border-r border-b border-amber-400 border-t-2 border-r-2 border-b-2 bg-amber-400/5 px-4 py-3 lg:px-4 lg:py-3 shadow-[0_0_8px_rgba(251,191,36,0.15)]"
                  : isOwnChar
                    ? "border-t border-r border-b border-border bg-card px-4 py-3"
                    : "border-t border-r border-b border-border px-4 py-3"
              } ${combatant.is_defeated ? "opacity-40 grayscale-[80%]" : isCritical ? "opacity-50 grayscale-[50%] border-2 border-red-500 animate-pulse" : ""} ${
                roundNumber === 1 && index === maxRevealedIndex ? "animate-fade-in" : ""
              } ${
                isNewlyRevealed ? "ring-2 ring-gold/60 shadow-[0_0_16px_rgba(212,168,83,0.4)]" : ""
              }`}
              role="listitem"
              aria-current={isCurrentTurn ? true : undefined}
              data-testid={`player-combatant-${combatant.id}`}
            >
              {/* Name row */}
              <div className="flex items-center gap-2 min-h-[36px] lg:min-h-0">
                {isCurrentTurn && (
                  <span
                    className="text-amber-400 shrink-0 text-base leading-none select-none"
                    aria-label={t("current_turn")}
                  >
                    ▶
                  </span>
                )}
                <span className={`text-foreground font-medium flex-1 truncate text-base lg:text-sm${combatant.is_defeated ? " line-through" : ""}`}>
                  {combatant.name}
                </span>
                {/* Type indicator: player or monster */}
                {isOwnChar ? (
                  <span className="shrink-0 text-xs text-blue-400/70 font-medium">
                    {t("your_character")}
                  </span>
                ) : isPlayer ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-400/60">
                    <User className="w-3 h-3" aria-hidden="true" />
                    {t("player_tag")}
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs text-red-400/50">
                    <Bug className="w-3 h-3" aria-hidden="true" />
                  </span>
                )}
                {combatant.is_defeated && (
                  <span className="text-sm lg:text-xs text-red-400 font-medium shrink-0">
                    {t("defeated")}
                  </span>
                )}
              </div>

              {/* HP display — full bar for own character only, status badge for everyone else */}
              {showFullHp ? (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground text-sm lg:text-xs">{t("hp_label")}</span>
                    <span className="text-muted-foreground text-base lg:text-sm font-mono">
                      {combatant.current_hp} / {combatant.max_hp}
                      {hpThresholdKey && (
                        <span className="text-sm lg:text-xs font-mono ml-1 text-muted-foreground">
                          {t(hpThresholdKey)} · {getHpPercentage(combatant.current_hp ?? 0, combatant.max_hp ?? 0)}%
                        </span>
                      )}
                      {hasTempHp && (
                        <span className="text-temp-hp ml-1 text-sm lg:text-xs">
                          {t("temp_hp", { value: combatant.temp_hp ?? 0 })}
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    className="h-4 lg:h-2.5 bg-white/[0.06] rounded-full overflow-hidden"
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
              ) : (combatant.hp_status || otherPlayerHpStatus) ? (
                <div className="mt-1.5">
                  <HpStatusBadge status={combatant.hp_status || otherPlayerHpStatus!} percentage={isPlayer ? otherPlayerHpPct : undefined} />
                </div>
              ) : null}

              {/* Condition badges */}
              {combatant.conditions.length > 0 && (
                <div className="flex flex-wrap gap-2 lg:gap-1.5 mt-1.5" role="list" aria-label={`${combatant.name} conditions`}>
                  {combatant.conditions.map((condition) => (
                    <ConditionBadge
                      key={condition}
                      condition={condition}
                      rulesetVersion={(combatant.ruleset_version as RulesetVersion) ?? rulesetVersion}
                      turnCount={isPlayer && !isOwnChar ? combatant.condition_durations?.[condition] : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Beneficial conditions self-picker — own character in list (mobile + desktop) */}
              {isOwnChar && onSelfConditionToggle && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {BENEFICIAL_CONDITIONS.map((condition) => {
                    const isActive = combatant.conditions.includes(condition);
                    return (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => onSelfConditionToggle(combatant.id, condition)}
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-900/20 text-emerald-400/70 hover:bg-emerald-900/40 hover:text-emerald-300"
                        }`}
                        aria-pressed={isActive}
                        title={isActive ? `Remove ${condition}` : `Apply ${condition}`}
                      >
                        {condition}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Death Save Tracker — own character at 0 HP, not defeated */}
              {isOwnChar && (combatant.current_hp ?? 0) === 0 && (combatant.max_hp ?? 0) > 0 && !combatant.is_defeated && (() => {
                const isMyTurn = isCurrentTurn && isPlayerTurn;
                return (
                  <div className="mt-2">
                    {isMyTurn ? (
                      <p className="text-xs text-red-300 mb-1">{t("death_saves_your_turn")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-1">{t("death_saves_waiting")}</p>
                    )}
                    <DeathSaveTracker
                      successes={combatant.death_saves?.successes ?? 0}
                      failures={combatant.death_saves?.failures ?? 0}
                      onAddSuccess={() => handleDeathSave("success")}
                      onAddFailure={() => handleDeathSave("failure")}
                      readOnly={!isMyTurn}
                      playerContext
                    />
                  </div>
                );
              })()}
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>

      {/* In-app notification overlay toggle */}
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

      {/* Push notification opt-in (Web Push API — native notifications when app is backgrounded) */}
      {sessionId && registeredName && (
        <TurnPushNotification sessionId={sessionId} playerName={registeredName} />
      )}

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
            spell_save_dc: primaryPlayerChar.spell_save_dc,
            conditions: primaryPlayerChar.conditions,
            is_defeated: primaryPlayerChar.is_defeated,
            ruleset_version: primaryPlayerChar.ruleset_version,
          }}
          rulesetVersion={rulesetVersion}
          deathSaves={primaryPlayerChar.death_saves}
          isPlayerTurn={isPlayerTurn}
          onDeathSave={handleDeathSave}
          hpDelta={hpDelta && hpDelta.combatantId === primaryPlayerChar.id ? hpDelta : null}
          onEndTurn={onEndTurn}
          endTurnPending={endTurnPending}
          onHpAction={onHpAction}
          connectionStatus={connectionStatus}
          spellSlots={spellSlots}
          onToggleSlot={onToggleSlot}
          onLongRest={onLongRest}
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
          isLoadingAudio={isLoadingAudioUrls}
        />
      )}

      {/* Spell browser FAB — mobile only, hidden during turn notification */}
      <div
        className={`fixed left-4 z-30 lg:hidden transition-opacity duration-200 ${
          isPlayerTurn && !overlayDismissed && notificationsEnabled ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ bottom: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setSpellsOpen(true)}
          className="w-11 h-11 rounded-full bg-surface-overlay border border-gold/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label={tc("spell_open")}
        >
          <BookOpen className="w-5 h-5 text-gold" />
        </button>
      </div>

      {/* Spell browser dialog */}
      <PlayerSpellBrowser
        open={spellsOpen}
        onOpenChange={setSpellsOpen}
        playerClass={primaryPlayerChar?.class}
        rulesetVersion={rulesetVersion}
      />

      <CombatActionLog open={showActionLog} onClose={() => setShowActionLog(false)} playerId={ownChar?.id} />
    </div>
  );
}
