"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore } from "@/lib/stores/combat-store";
import { persistInitiativeAndStartCombat, persistInitiativeOrder, persistNewCombatant } from "@/lib/supabase/session";
import { EncounterSetup } from "@/components/combat/EncounterSetup";
import { CombatantRow } from "@/components/combat/CombatantRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";

import { AddCombatantForm } from "@/components/combat/AddCombatantForm";
import { MonsterSearchPanel } from "@/components/combat/MonsterSearchPanel";
import type { RulesetVersion, PlayerCharacter } from "@/lib/types/database";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { assignInitiativeOrder, sortByInitiative, rollInitiativeForCombatant } from "@/lib/utils/initiative";
import { getNumberedName } from "@/lib/stores/combat-store";
import { generateCreatureName } from "@/lib/utils/creature-name-generator";
import { createEncounterWithCombatants } from "@/lib/supabase/encounter";
import { useRouter } from "next/navigation";
import { useCombatKeyboardShortcuts } from "@/lib/hooks/useCombatKeyboardShortcuts";
import { useCombatActions } from "@/lib/hooks/useCombatActions";
import { useCombatResilience } from "@/lib/hooks/useCombatResilience";
import { KeyboardCheatsheet } from "@/components/combat/KeyboardCheatsheet";
import { setLastHpMode, type HpMode } from "@/components/combat/HpAdjuster";
import { broadcastEvent, getDmChannel, registerHiddenLookup } from "@/lib/realtime/broadcast";
import { toast } from "sonner";
import type { Combatant } from "@/lib/types/combat";
import { loadCombatBackup } from "@/lib/stores/combat-persist";
import { DmAudioControls } from "@/components/audio/DmAudioControls";
import { DmSoundboard } from "@/components/audio/DmSoundboard";
import { useAudioStore } from "@/lib/stores/audio-store";
import { getPresetById } from "@/lib/utils/audio-presets";
import { useCombatLogStore } from "@/lib/stores/combat-log-store";
import { computeCombatStats, getMaxRound } from "@/lib/utils/combat-stats";
import type { CombatantStats } from "@/lib/utils/combat-stats";
import { CombatLeaderboard } from "@/components/combat/CombatLeaderboard";
import { CombatTimer } from "@/components/combat/CombatTimer";
import { TurnTimer } from "@/components/combat/TurnTimer";
import { AnimatePresence } from "framer-motion";
import { BackgroundSelector } from "@/components/combat/BackgroundSelector";
import { PlayerDrawer } from "@/components/combat/PlayerDrawer";
import { Users } from "lucide-react";
import type { WeatherEffect } from "@/components/player/WeatherOverlay";
import { JoinRequestBanner, type JoinRequest } from "@/components/session/JoinRequestBanner";
import { rejoinAsPlayer } from "@/lib/supabase/player-registration";

interface CombatSessionClientProps {
  sessionId: string | null;
  encounterId: string | null;
  initialCombatants: import("@/lib/types/combat").Combatant[];
  isActive: boolean;
  roundNumber: number;
  currentTurnIndex: number;
  rulesetVersion?: RulesetVersion;
  campaignId?: string | null;
  preloadedPlayers?: PlayerCharacter[];
}

export function CombatSessionClient({
  sessionId,
  encounterId,
  initialCombatants,
  isActive,
  roundNumber,
  currentTurnIndex,
  rulesetVersion = "2014",
  campaignId = null,
  preloadedPlayers = [],
}: CombatSessionClientProps) {
  const router = useRouter();
  const t = useTranslations("combat");
  const [addMode, setAddMode] = useState<"choose" | "monster" | "manual" | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  // Session created on-demand by EncounterSetup for sharing before combat
  const [onDemandSessionId, setOnDemandSessionId] = useState<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<CombatantStats[] | null>(null);
  const [leaderboardMeta, setLeaderboardMeta] = useState<{ name: string; rounds: number }>({ name: "", rounds: 0 });
  const [weatherEffect, setWeatherEffect] = useState<WeatherEffect>("none");
  const [showWeatherSelector, setShowWeatherSelector] = useState(false);
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  const { combatants, is_active, setError } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);
  const encounter_name = useCombatStore((s) => s.encounter_name);
  const combatStartedAt = useCombatStore((s) => s.combatStartedAt);
  const turnStartedAt = useCombatStore((s) => s.turnStartedAt);

  const {
    turnPending,
    handleAdvanceTurn,
    handleApplyDamage,
    handleApplyHealing,
    handleSetTempHp,
    handleToggleCondition,
    handleSetDefeated,
    handleRemoveCombatant,
    handleAddCombatant: addCombatantAction,
    handleReorderCombatants,
    handleUpdateStats,
    handleSetInitiative,
    handleSwitchVersion,
    handleUpdateDmNotes,
    handleUpdatePlayerNotes,
    handleToggleHidden,
    handleEndEncounter: doEndEncounter,
    getSessionId,
  } = useCombatActions({ sessionId, onNavigate: (path) => router.push(path) });

  // Intercept end encounter: compute stats and show leaderboard before navigating
  const handleEndEncounter = useCallback(() => {
    const logEntries = useCombatLogStore.getState().entries;
    const stats = computeCombatStats(logEntries);
    const rounds = getMaxRound(logEntries);
    const name = useCombatStore.getState().encounter_name;

    // If there are actionable stats, show the leaderboard overlay
    if (stats.length > 0 && stats.some((s) => s.totalDamageDealt > 0)) {
      setLeaderboardData(stats);
      setLeaderboardMeta({ name, rounds });
      // Broadcast stats to player view
      const sid = getSessionId();
      if (sid) {
        broadcastEvent(sid, {
          type: "session:combat_stats",
          stats,
          encounter_name: name,
          rounds,
        });
      }
    } else {
      // No meaningful stats — proceed directly
      doEndEncounter();
    }
  }, [doEndEncounter, getSessionId]);

  const handleDismissLeaderboard = useCallback(() => {
    setLeaderboardData(null);
    useCombatLogStore.getState().clear();
    doEndEncounter();
  }, [doEndEncounter]);

  // Register hidden lookup so broadcast.ts can filter events for hidden combatants
  useEffect(() => {
    registerHiddenLookup(
      (id: string) => {
        const c = useCombatStore.getState().combatants.find((x) => x.id === id);
        return c?.is_hidden ?? false;
      },
      () => useCombatStore.getState().combatants
    );
    return () => { registerHiddenLookup(() => false); };
  }, []);

  // Hydrate the store from server-fetched data (skip for fresh encounters).
  useEffect(() => {
    const store = useCombatStore.getState();
    if (encounterId && sessionId) {
      store.clearEncounter();
      store.setEncounterId(encounterId, sessionId);
      store.hydrateCombatants(initialCombatants);
      if (isActive) {
        const clampedIndex =
          initialCombatants.length > 0
            ? Math.max(0, Math.min(currentTurnIndex, initialCombatants.length - 1))
            : 0;
        store.hydrateActiveState(clampedIndex, Math.max(1, roundNumber));
      }
      // Fallback: if server returned no combatants, try localStorage backup
      if (initialCombatants.length === 0) {
        const backup = loadCombatBackup();
        if (backup && backup.encounter_id === encounterId && backup.combatants.length > 0) {
          store.hydrateCombatants(backup.combatants);
          if (backup.is_active) {
            store.hydrateActiveState(
              backup.current_turn_index,
              backup.round_number
            );
          }
        }
      }
    } else {
      store.clearEncounter();
    }
  }, [encounterId, sessionId, isActive, initialCombatants, currentTurnIndex, roundNumber]);

  const handleStartCombat = async (encounterName?: string) => {
    const store = useCombatStore.getState();
    const current = store.combatants;
    const sorted = assignInitiativeOrder(sortByInitiative(current));
    store.hydrateCombatants(sorted);

    if (encounterName) {
      useCombatStore.setState({ encounter_name: encounterName });
    }

    if (store.encounter_id) {
      try {
        // Insert any combatants added client-side (e.g. campaign players)
        // that don't exist in the DB yet (Bug #56)
        const existingIds = new Set(initialCombatants.map((c) => c.id));
        const brandNew = sorted.filter((c) => !existingIds.has(c.id));
        if (brandNew.length > 0) {
          await Promise.all(
            brandNew.map((c) => persistNewCombatant(store.encounter_id!, c))
          );
        }
        await persistInitiativeAndStartCombat(store.encounter_id, sorted);
        store.startCombat();
        // Auto-expand group if first combatant belongs to one
        const firstCombatant = sorted[0];
        if (firstCombatant?.monster_group_id) {
          store.toggleGroupExpanded(firstCombatant.monster_group_id);
        }
        // Notify players that combat has started
        broadcastEvent(sessionId ?? "", {
          type: "session:state_sync",
          combatants: sorted,
          current_turn_index: 0,
          round_number: 1,
          encounter_id: store.encounter_id!,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error_start_combat"));
      }
      return;
    }

    try {
      const { session_id, encounter_id } = await createEncounterWithCombatants(
        sorted,
        rulesetVersion,
        campaignId,
        encounterName,
        onDemandSessionId
      );
      store.setEncounterId(encounter_id, session_id);
      await persistInitiativeAndStartCombat(encounter_id, sorted);
      store.startCombat();
      // Auto-expand group if first combatant belongs to one
      const firstNew = sorted[0];
      if (firstNew?.monster_group_id) {
        store.toggleGroupExpanded(firstNew.monster_group_id);
      }
      // Notify players that combat has started
      broadcastEvent(session_id, {
        type: "session:state_sync",
        combatants: sorted,
        current_turn_index: 0,
        round_number: 1,
        encounter_id: encounter_id,
      });
      router.replace(`/app/session/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_start_combat"));
    }
  };

  const handleAddCombatant = useCallback((newCombatant: Parameters<typeof addCombatantAction>[0]) => {
    addCombatantAction(newCombatant);
    setAddMode(null);
  }, [addCombatantAction]);

  // Convert an SRD monster into a combatant and add it mid-combat
  const handleSelectMonster = useCallback((monster: SrdMonster, options?: { isHidden?: boolean }) => {
    const currentCombatants = useCombatStore.getState().combatants;
    const numberedName = getNumberedName(monster.name, currentCombatants);
    const existingNames = currentCombatants
      .filter((c) => !c.is_player && c.display_name)
      .map((c) => c.display_name!);
    const displayName = generateCreatureName(monster.type, existingNames);
    const rollResult = rollInitiativeForCombatant("tmp", monster.dex ?? undefined);

    addCombatantAction({
      name: numberedName,
      current_hp: monster.hit_points,
      max_hp: monster.hit_points,
      temp_hp: 0,
      ac: monster.armor_class,
      spell_save_dc: null,
      initiative: rollResult.total,
      initiative_breakdown: { roll: rollResult.rolls[0], modifier: rollResult.modifier },
      initiative_order: null,
      conditions: [],
      ruleset_version: monster.ruleset_version,
      is_defeated: false,
      is_hidden: options?.isHidden ?? false,
      is_player: false,
      monster_id: monster.id,
      token_url: monster.token_url ?? null,
      creature_type: monster.type ?? null,
      display_name: displayName,
      monster_group_id: null,
      group_order: null,
      dm_notes: "",
      player_notes: "",
      player_character_id: null,
      combatant_role: null,
    });
  }, [addCombatantAction]);

  // Add a group of N monsters mid-combat
  const handleSelectMonsterGroup = useCallback((monster: SrdMonster, qty: number, options?: { isHidden?: boolean }) => {
    const groupId = crypto.randomUUID();
    const currentCombatants = useCombatStore.getState().combatants;
    const newCombatants: Omit<Combatant, "id">[] = [];
    // Generate ONE display name for the group, append numbers
    const existingNames = currentCombatants
      .filter((c) => !c.is_player && c.display_name)
      .map((c) => c.display_name!);
    const groupDisplayBase = generateCreatureName(monster.type ?? null, existingNames);
    for (let i = 1; i <= qty; i++) {
      newCombatants.push({
        name: `${monster.name} ${i}`,
        current_hp: monster.hit_points,
        max_hp: monster.hit_points,
        temp_hp: 0,
        ac: monster.armor_class,
        spell_save_dc: null,
        initiative: null,
        initiative_order: null,
        conditions: [],
        ruleset_version: monster.ruleset_version,
        is_defeated: false,
        is_hidden: options?.isHidden ?? false,
        is_player: false,
        monster_id: monster.id,
        token_url: monster.token_url ?? null,
        creature_type: monster.type ?? null,
        display_name: `${groupDisplayBase} ${i}`,
        monster_group_id: groupId,
        group_order: i,
        dm_notes: "",
        player_notes: "",
        player_character_id: null,
        combatant_role: null,
      });
    }
    for (const c of newCombatants) {
      addCombatantAction(c);
    }
  }, [addCombatantAction]);

  /** Apply HP change to multiple targets (AoE). Each target is independent (fail-safe). */
  const handleApplyToMultiple = useCallback((targetIds: string[], amount: number, mode: HpMode) => {
    let appliedCount = 0;
    for (const id of targetIds) {
      try {
        if (mode === "damage") {
          handleApplyDamage(id, amount);
        } else if (mode === "heal") {
          handleApplyHealing(id, amount);
        } else {
          handleSetTempHp(id, amount);
        }
        appliedCount++;
      } catch {
        // Fail-safe: skip this target and continue with others
      }
    }
    if (appliedCount > 1) {
      toast(t("hp_applied_multiple", { count: appliedCount }), { duration: 2000 });
    }
  }, [handleApplyDamage, handleApplyHealing, handleSetTempHp, t]);

  // Combat resilience: beforeunload flush + offline→online reconciliation
  useCombatResilience();

  // Keyboard shortcuts for DM combat view (NFR25)
  useCombatKeyboardShortcuts({
    enabled: is_active,
    onNextTurn: handleAdvanceTurn,
    combatantCount: combatants.length,
    focusedIndex,
    onFocusChange: (idx) => {
      const clamped = Math.max(0, Math.min(idx, combatants.length - 1));
      setFocusedIndex(clamped);
      const el = document.querySelector(`[data-testid="initiative-list"] > :nth-child(${clamped + 1})`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    onToggleExpand: () => {
      const c = combatants[focusedIndex];
      if (c) {
        const btn = document.querySelector(`[data-testid="expand-toggle-${c.id}"]`) as HTMLButtonElement | null;
        btn?.click();
      }
    },
    onOpenHpDamage: () => {
      const c = combatants[focusedIndex];
      if (c) {
        setLastHpMode("damage");
        const btn = document.querySelector(`[data-testid="hp-btn-${c.id}"]`) as HTMLButtonElement | null;
        btn?.click();
      }
    },
    onOpenHpHeal: () => {
      const c = combatants[focusedIndex];
      if (c) {
        setLastHpMode("heal");
        const btn = document.querySelector(`[data-testid="hp-btn-${c.id}"]`) as HTMLButtonElement | null;
        btn?.click();
      }
    },
    onOpenConditions: () => {
      const c = combatants[focusedIndex];
      if (c) {
        const btn = document.querySelector(`[data-testid="conditions-btn-${c.id}"]`) as HTMLButtonElement | null;
        btn?.click();
      }
    },
    onUndo: () => {
      const entry = useCombatStore.getState().undoLastAction();
      if (!entry) {
        toast(t("undo_empty"));
        return;
      }
      switch (entry.type) {
        case "hp":
          toast(t("undo_hp"));
          break;
        case "condition":
          toast(entry.wasAdded ? t("undo_condition_add", { condition: entry.condition }) : t("undo_condition_remove", { condition: entry.condition }));
          break;
        case "defeated":
          toast(t("undo_defeated"));
          break;
        case "turn":
          toast(t("undo_turn"));
          break;
      }
    },
    onReorder: (fromIndex: number, toIndex: number) => {
      const moved = combatants[fromIndex];
      if (!moved) return;

      // Build block-based representation to preserve all groups
      type Block = { id: string; groupId: string | null; members: Combatant[] };
      const blocks: Block[] = [];
      const seenGroups = new Set<string>();
      for (const c of combatants) {
        if (c.monster_group_id) {
          if (seenGroups.has(c.monster_group_id)) continue;
          seenGroups.add(c.monster_group_id);
          blocks.push({
            id: `group:${c.monster_group_id}`,
            groupId: c.monster_group_id,
            members: combatants.filter((m) => m.monster_group_id === c.monster_group_id),
          });
        } else {
          blocks.push({ id: c.id, groupId: null, members: [c] });
        }
      }

      // Find which block the moved combatant belongs to, and the target block
      const movedBlockIdx = blocks.findIndex((b) =>
        b.members.some((m) => m.id === moved.id)
      );
      // Find the block that contains the combatant at toIndex
      const targetCombatant = combatants[toIndex];
      const targetBlockIdx = targetCombatant
        ? blocks.findIndex((b) => b.members.some((m) => m.id === targetCombatant.id))
        : blocks.length - 1;

      if (movedBlockIdx === -1 || movedBlockIdx === targetBlockIdx) return;

      // Move the block
      const [movedBlock] = blocks.splice(movedBlockIdx, 1);
      blocks.splice(targetBlockIdx, 0, movedBlock);

      const reordered = blocks.flatMap((b) => b.members);
      handleReorderCombatants(reordered, moved.id);
    },
    cheatsheetOpen,
    onToggleCheatsheet: () => setCheatsheetOpen((v) => !v),
  });

  // Handle accepting a late-join or rejoin request
  const handleAcceptJoinRequest = useCallback((req: JoinRequest) => {
    const sid = getSessionId();

    if (req.isRejoin) {
      // Rejoin request — character already exists in combat, just approve
      broadcastEvent(sid, {
        type: "combat:rejoin_response",
        request_id: req.request_id,
        accepted: true,
      } as import("@/lib/types/realtime").RealtimeEvent);

      // If taking over an active session, broadcast session_revoked so the old device disconnects
      if (req.isActiveSession && req.senderTokenId) {
        broadcastEvent(sid, {
          type: "combat:session_revoked",
          revoked_token_id: req.senderTokenId,
        } as import("@/lib/types/realtime").RealtimeEvent);
      }
    } else {
      // Late-join request — create new combatant
      handleAddCombatant({
        name: req.player_name,
        current_hp: req.hp ?? 0,
        max_hp: req.hp ?? 0,
        temp_hp: 0,
        ac: req.ac ?? 0,
        spell_save_dc: null,
        initiative: req.initiative,
        initiative_order: null,
        conditions: [],
        ruleset_version: null,
        is_defeated: false,
        is_hidden: false,
        is_player: true,
        monster_id: null,
        token_url: null,
        creature_type: null,
        display_name: null,
        monster_group_id: null,
        group_order: null,
        dm_notes: "",
        player_notes: "",
        player_character_id: null,
        combatant_role: null,
      } as Omit<Combatant, "id">);
      broadcastEvent(sid, {
        type: "combat:late_join_response",
        request_id: req.request_id,
        accepted: true,
      } as import("@/lib/types/realtime").RealtimeEvent);
    }

    setJoinRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
  }, [getSessionId, handleAddCombatant]);

  // Handle rejecting a late-join or rejoin request
  const handleRejectJoinRequest = useCallback((req: JoinRequest) => {
    const sid = getSessionId();
    const eventType = req.isRejoin ? "combat:rejoin_response" : "combat:late_join_response";
    broadcastEvent(sid, {
      type: eventType,
      request_id: req.request_id,
      accepted: false,
    } as import("@/lib/types/realtime").RealtimeEvent);
    setJoinRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
  }, [getSessionId]);

  // Bulk accept/reject all pending join requests
  const handleAcceptAllJoinRequests = useCallback(() => {
    joinRequests.forEach((req) => handleAcceptJoinRequest(req));
  }, [joinRequests, handleAcceptJoinRequest]);

  const handleRejectAllJoinRequests = useCallback(() => {
    joinRequests.forEach((req) => handleRejectJoinRequest(req));
  }, [joinRequests, handleRejectJoinRequest]);

  // Listen for late-join requests from players
  useEffect(() => {
    const sid = getSessionId();
    if (!sid || !is_active) return;
    const ch = getDmChannel(sid);
    let active = true;

    const handleLateJoin = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const { player_name, hp: pHp, ac: pAc, initiative: pInit, request_id } = payload as {
        player_name: string; hp: number | null; ac: number | null; initiative: number; request_id: string;
      };
      setJoinRequests((prev) => {
        if (prev.some((r) => r.request_id === request_id)) return prev;
        return [...prev, { request_id, player_name, hp: pHp, ac: pAc, initiative: pInit }];
      });
    };

    const handleRejoinRequest = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const { character_name, request_id, is_active_session, sender_token_id } = payload as {
        character_name: string; request_id: string; is_active_session: boolean; sender_token_id: string;
      };
      setJoinRequests((prev) => {
        if (prev.some((r) => r.request_id === request_id)) return prev;
        return [...prev, {
          request_id,
          player_name: character_name,
          hp: null,
          ac: null,
          initiative: 0,
          isRejoin: true,
          isActiveSession: is_active_session,
          senderTokenId: sender_token_id,
        }];
      });
    };

    // Remove any stale bindings before adding new ones.
    try {
      const bindings = (ch as unknown as { bindings: Record<string, { filter: { event: string } }[]> }).bindings;
      const broadcastBindings = bindings?.broadcast;
      if (Array.isArray(broadcastBindings)) {
        for (let i = broadcastBindings.length - 1; i >= 0; i--) {
          const event = broadcastBindings[i]?.filter?.event;
          if (event === "combat:late_join_request" || event === "combat:rejoin_request") {
            broadcastBindings.splice(i, 1);
          }
        }
      }
    } catch { /* bindings structure may differ across versions — ignore */ }

    ch.on("broadcast", { event: "combat:late_join_request" }, handleLateJoin);
    ch.on("broadcast", { event: "combat:rejoin_request" }, handleRejoinRequest);

    return () => {
      active = false;
      setJoinRequests([]);
    };
  }, [is_active, getSessionId]);

  // Listen for audio:play_sound events from players
  useEffect(() => {
    const sid = getSessionId();
    if (!sid || !is_active) return;
    const ch = getDmChannel(sid);
    let active = true;

    const handleAudioPlay = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const { sound_id, source, player_name } = payload as {
        sound_id: string; source: "preset" | "custom"; player_name: string;
      };

      // SECURITY: Never trust audio_url from player payload — resolve from preloaded store
      const store = useAudioStore.getState();
      const resolvedUrl = source === "custom" ? store.playerAudioUrls[sound_id] : undefined;
      if (source === "custom" && !resolvedUrl) return; // Unknown custom sound — ignore

      const sanitizedName = typeof player_name === "string" ? player_name.slice(0, 30) : "???";
      store.playSound(sound_id, source, sanitizedName, resolvedUrl);

      // Discrete toast
      const preset = source === "preset" ? getPresetById(sound_id) : null;
      const label = preset ? `${preset.icon} ${preset.id}` : sound_id;
      toast(`🔊 ${sanitizedName}: ${label}`, { duration: 2000 });
    };

    // Clean stale audio bindings before adding new one
    try {
      const bindings = (ch as unknown as { bindings: Record<string, { filter: { event: string } }[]> }).bindings;
      const broadcastBindings = bindings?.broadcast;
      if (Array.isArray(broadcastBindings)) {
        for (let i = broadcastBindings.length - 1; i >= 0; i--) {
          if (broadcastBindings[i]?.filter?.event === "audio:play_sound") {
            broadcastBindings.splice(i, 1);
          }
        }
      }
    } catch { /* ignore */ }

    ch.on("broadcast", { event: "audio:play_sound" }, handleAudioPlay);

    return () => { active = false; };
  }, [is_active, getSessionId]);

  // Listen for player:end_turn — player passed their own turn
  // Use ref to avoid re-subscribing on every handleAdvanceTurn identity change
  const handleAdvanceTurnRef = useRef(handleAdvanceTurn);
  handleAdvanceTurnRef.current = handleAdvanceTurn;

  useEffect(() => {
    const sid = getSessionId();
    if (!sid || !is_active) return;
    const ch = getDmChannel(sid);
    let active = true;

    const handlePlayerEndTurn = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const snap = useCombatStore.getState();
      const current = snap.combatants[snap.current_turn_index];
      if (!current?.is_player) return;
      if (!payload.player_name || current.name !== payload.player_name) return;
      handleAdvanceTurnRef.current();
    };

    ch.on("broadcast", { event: "player:end_turn" }, handlePlayerEndTurn);

    // Listen for player:death_save — player marked a death save on their turn
    const handlePlayerDeathSave = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const { combatant_id, result } = payload as { combatant_id: string; result: "success" | "failure" };
      if (!combatant_id || !result) return;
      if (result === "success") {
        useCombatStore.getState().addDeathSaveSuccess(combatant_id);
      } else {
        useCombatStore.getState().addDeathSaveFailure(combatant_id);
      }
      // Broadcast updated state to all players
      const c = useCombatStore.getState().combatants.find((x) => x.id === combatant_id);
      if (c) {
        broadcastEvent(getSessionId()!, {
          type: "combat:hp_update",
          combatant_id,
          current_hp: c.current_hp,
          temp_hp: c.temp_hp,
          max_hp: c.max_hp,
          is_player: c.is_player,
          death_saves: c.death_saves,
        });
      }
      if (c?.is_defeated) {
        broadcastEvent(getSessionId()!, { type: "combat:defeated_change", combatant_id, is_defeated: true });
      }
    };

    ch.on("broadcast", { event: "player:death_save" }, handlePlayerDeathSave);

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-stable: handleAdvanceTurnRef
  }, [is_active, getSessionId]);

  // Show unified setup if not yet active
  if (!is_active) {
    return <EncounterSetup onStartCombat={handleStartCombat} campaignId={campaignId} preloadedPlayers={preloadedPlayers} sessionId={sessionId} onSessionCreated={setOnDemandSessionId} />;
  }

  // Active combat view
  return (
    <div className="w-full max-w-6xl mx-auto px-2" data-testid="active-combat">
      <div className="sticky top-0 z-30 bg-background pb-3 space-y-3 border-b border-white/[0.06] -mx-2 px-2 pt-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-foreground font-semibold">
            {encounter_name && <span className="mr-2">{encounter_name}</span>}
            {t("round")} <span className="font-mono text-gold">{round_number}</span>
          </h2>
          {combatStartedAt && <CombatTimer startTime={combatStartedAt} />}
          {turnStartedAt && <TurnTimer startTime={turnStartedAt} />}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-muted-foreground text-xs">
            {t(combatants.length === 1 ? "combatants_count" : "combatants_count_plural", { count: combatants.length })}
          </span>
          <button
            type="button"
            onClick={handleEndEncounter}
            className="px-3 py-2 bg-red-900/20 text-red-400 font-medium rounded-md hover:bg-red-900/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
            aria-label="End encounter"
            data-testid="end-encounter-btn"
          >
            {t("end_session")}
          </button>
          <button
            type="button"
            onClick={() => setAddMode((prev) => (prev ? null : "choose"))}
            className="px-3 py-2 bg-emerald-900/30 text-emerald-400 font-medium rounded-md hover:bg-emerald-900/50 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
            aria-label="Add combatant"
            data-testid="add-combatant-btn"
          >
            {t("add_mid_combat")}
          </button>
          <button
            type="button"
            onClick={handleAdvanceTurn}
            disabled={turnPending}
            className="px-4 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            aria-label="Advance to next turn"
            data-testid="next-turn-btn"
          >
            {turnPending ? t("next_turn_saving") : t("next_turn")}
            <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0.5 bg-black/20 rounded">Space</kbd>
          </button>
          <DmSoundboard onBroadcast={(event, payload) => broadcastEvent(sessionId ?? "", { type: event, ...payload } as import("@/lib/types/realtime").RealtimeEvent)} />
          <DmAudioControls />
          <button
            type="button"
            onClick={() => setShowWeatherSelector((v) => !v)}
            className={`px-2 py-2 text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              weatherEffect !== "none"
                ? "bg-gold/10 text-gold border border-gold/30"
                : "text-muted-foreground hover:text-foreground bg-white/[0.04]"
            }`}
            aria-label={t("weather_title")}
            title={t("weather_title")}
            data-testid="weather-toggle-btn"
          >
            {weatherEffect === "rain" ? "\uD83C\uDF27\uFE0F" : weatherEffect === "snow" ? "\u2744\uFE0F" : weatherEffect === "fog" ? "\uD83C\uDF2B\uFE0F" : weatherEffect === "storm" ? "\u26C8\uFE0F" : weatherEffect === "ash" ? "\uD83C\uDF0B" : "\uD83C\uDF24\uFE0F"}
          </button>
          {campaignId && (
            <button
              type="button"
              onClick={() => setPlayerDrawerOpen((v) => !v)}
              className={`px-2 py-2 text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                playerDrawerOpen
                  ? "bg-gold/10 text-gold border border-gold/30"
                  : "text-muted-foreground hover:text-foreground bg-white/[0.04]"
              }`}
              aria-label="Players"
              title="Players"
              data-testid="player-drawer-toggle"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Players</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCheatsheetOpen((v) => !v)}
            className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm min-h-[44px] min-w-[44px] hidden md:inline-flex items-center justify-center"
            aria-label={t("shortcut_title")}
            title={t("shortcut_title")}
          >
            <kbd className="text-[11px] font-mono px-1.5 py-0.5 bg-white/[0.06] rounded border border-white/[0.08]">?</kbd>
          </button>
        </div>
      </div>

      <JoinRequestBanner
        requests={joinRequests}
        onAccept={handleAcceptJoinRequest}
        onReject={handleRejectJoinRequest}
        onAcceptAll={handleAcceptAllJoinRequests}
        onRejectAll={handleRejectAllJoinRequests}
      />

      {showWeatherSelector && (
        <div className="p-3 bg-white/[0.04] rounded-md" data-testid="weather-selector-panel">
          <BackgroundSelector
            currentWeather={weatherEffect}
            onWeatherChange={(effect) => {
              setWeatherEffect(effect);
              broadcastEvent(sessionId ?? "", {
                type: "session:weather_change",
                effect,
              });
            }}
          />
        </div>
      )}

      {addMode && (
        <div className="p-3 bg-white/[0.04] rounded-md space-y-3" data-testid="add-combatant-panel">
          {/* Mode chooser */}
          {addMode === "choose" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddMode("monster")}
                className="flex-1 px-4 py-3 bg-purple-900/30 text-purple-300 font-medium rounded-md hover:bg-purple-900/50 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
                data-testid="add-mode-monster"
              >
                {t("add_mid_combat_monster")}
              </button>
              <button
                type="button"
                onClick={() => setAddMode("manual")}
                className="flex-1 px-4 py-3 bg-blue-900/30 text-blue-300 font-medium rounded-md hover:bg-blue-900/50 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
                data-testid="add-mode-manual"
              >
                {t("add_mid_combat_manual")}
              </button>
            </div>
          )}

          {/* Monster search mode */}
          {addMode === "monster" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAddMode("choose")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="add-back-btn"
                >
                  &larr; {t("add_mid_combat_back")}
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode(null)}
                  className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
                  data-testid="add-close-btn"
                >
                  &times;
                </button>
              </div>
              <MonsterSearchPanel
                rulesetVersion={rulesetVersion}
                onSelectMonster={handleSelectMonster}
                onSelectMonsterGroup={handleSelectMonsterGroup}
              />
            </div>
          )}

          {/* Manual entry mode */}
          {addMode === "manual" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAddMode("choose")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="add-back-btn"
                >
                  &larr; {t("add_mid_combat_back")}
                </button>
              </div>
              <AddCombatantForm
                onAdd={handleAddCombatant}
                onClose={() => setAddMode(null)}
              />
            </div>
          )}
        </div>
      )}
      </div>{/* end sticky controls */}

      <div className="mt-4">
      <CombatList
        combatants={combatants}
        currentTurnIndex={current_turn_index}
        focusedIndex={focusedIndex}
        onReorder={handleReorderCombatants}
        onApplyDamage={handleApplyDamage}
        onApplyHealing={handleApplyHealing}
        onSetTempHp={handleSetTempHp}
        onToggleCondition={handleToggleCondition}
        onSetDefeated={handleSetDefeated}
        onRemoveCombatant={handleRemoveCombatant}
        onUpdateStats={handleUpdateStats}
        onSetInitiative={handleSetInitiative}
        onSwitchVersion={handleSwitchVersion}
        onUpdateDmNotes={handleUpdateDmNotes}
        onUpdatePlayerNotes={handleUpdatePlayerNotes}
        onApplyToMultiple={handleApplyToMultiple}
        onToggleHidden={handleToggleHidden}
        onAdvanceTurn={handleAdvanceTurn}
        onAddDeathSaveSuccess={(id) => {
          useCombatStore.getState().addDeathSaveSuccess(id);
          const c = useCombatStore.getState().combatants.find((x) => x.id === id);
          if (c) broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp, max_hp: c.max_hp, is_player: c.is_player });
        }}
        onAddDeathSaveFailure={(id) => {
          useCombatStore.getState().addDeathSaveFailure(id);
          const c = useCombatStore.getState().combatants.find((x) => x.id === id);
          if (c?.is_defeated) broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id: id, is_defeated: true });
          if (c) broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp, max_hp: c.max_hp, is_player: c.is_player });
        }}
        t={t}
      />
      </div>{/* end scrollable area */}

      <KeyboardCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />

      <AnimatePresence>
        {leaderboardData && (
          <CombatLeaderboard
            stats={leaderboardData}
            encounterName={leaderboardMeta.name}
            rounds={leaderboardMeta.rounds}
            onClose={handleDismissLeaderboard}
          />
        )}
      </AnimatePresence>

      <PlayerDrawer
        campaignId={campaignId}
        open={playerDrawerOpen}
        onClose={() => setPlayerDrawerOpen(false)}
      />
    </div>
  );
}

// ─── Combat list with drag-and-drop ─────────────────────────────────────────

interface CombatListProps {
  combatants: Combatant[];
  currentTurnIndex: number;
  focusedIndex: number;
  onReorder: (newOrder: Combatant[], movedId?: string) => void;
  onApplyDamage: (id: string, amount: number) => void;
  onApplyHealing: (id: string, amount: number) => void;
  onSetTempHp: (id: string, value: number) => void;
  onToggleCondition: (id: string, condition: string) => void;
  onSetDefeated: (id: string, isDefeated: boolean) => void;
  onRemoveCombatant: (id: string) => void;
  onUpdateStats: (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  onSetInitiative: (id: string, value: number | null) => void;
  onSwitchVersion: (id: string, version: import("@/lib/types/database").RulesetVersion) => void;
  onUpdateDmNotes: (id: string, notes: string) => void;
  onUpdatePlayerNotes: (id: string, notes: string) => void;
  onApplyToMultiple: (targetIds: string[], amount: number, mode: HpMode) => void;
  onToggleHidden: (id: string) => void;
  onAdvanceTurn: () => void;
  onAddDeathSaveSuccess?: (id: string) => void;
  onAddDeathSaveFailure?: (id: string) => void;
  t: ReturnType<typeof import("next-intl").useTranslations>;
}

function CombatList({
  combatants,
  currentTurnIndex,
  focusedIndex,
  onReorder,
  onApplyDamage,
  onApplyHealing,
  onSetTempHp,
  onToggleCondition,
  onSetDefeated,
  onRemoveCombatant,
  onUpdateStats,
  onSetInitiative,
  onSwitchVersion,
  onUpdateDmNotes,
  onUpdatePlayerNotes,
  onApplyToMultiple,
  onToggleHidden,
  onAdvanceTurn,
  onAddDeathSaveSuccess,
  onAddDeathSaveFailure,
  t,
}: CombatListProps) {
  // Auto-scroll to active combatant when turn advances (skip initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    requestAnimationFrame(() => {
      const activeCard = document.querySelector('[aria-current="true"]') as HTMLElement | null;
      activeCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [currentTurnIndex]);

  return (
    <div
      role="list"
      aria-label={t("initiative_order")}
      data-testid="initiative-list"
      className="space-y-2"
    >
      <SortableCombatantList
        combatants={combatants}
        onReorder={onReorder}
        renderItem={(c, dragHandleProps) => {
          const index = combatants.findIndex((x) => x.id === c.id);
          return (
            <div className={index === focusedIndex ? "ring-1 ring-gold/40 rounded-lg" : ""}>
              <CombatantRow
                combatant={c}
                isCurrentTurn={index === currentTurnIndex}
                showActions
                dragHandleProps={dragHandleProps}
                onApplyDamage={onApplyDamage}
                onApplyHealing={onApplyHealing}
                onSetTempHp={onSetTempHp}
                onToggleCondition={onToggleCondition}
                onSetDefeated={onSetDefeated}
                onRemoveCombatant={onRemoveCombatant}
                onUpdateStats={onUpdateStats}
                onSetInitiative={onSetInitiative}
                onSwitchVersion={onSwitchVersion}
                onUpdateDmNotes={onUpdateDmNotes}
                onUpdatePlayerNotes={onUpdatePlayerNotes}
                allCombatants={combatants}
                onApplyToMultiple={onApplyToMultiple}
                onToggleHidden={onToggleHidden}
                onAdvanceTurn={onAdvanceTurn}
                onAddDeathSaveSuccess={onAddDeathSaveSuccess}
                onAddDeathSaveFailure={onAddDeathSaveFailure}
              />
            </div>
          );
        }}
      />
    </div>
  );
}
