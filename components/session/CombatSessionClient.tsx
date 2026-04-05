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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { MonsterGroupHeader, getGroupInitiative, getGroupBaseName } from "@/components/combat/MonsterGroupHeader";
import { setLastHpMode, type HpMode } from "@/components/combat/HpAdjuster";
import { broadcastEvent, getDmChannel, registerHiddenLookup } from "@/lib/realtime/broadcast";
import { toast } from "sonner";
import type { Combatant } from "@/lib/types/combat";
import { loadCombatBackup } from "@/lib/stores/combat-persist";
import dynamic from "next/dynamic";

const DmAtmospherePanel = dynamic(() => import("@/components/audio/DmAtmospherePanel").then(m => m.DmAtmospherePanel), {
  ssr: false,
});
import { useAudioStore } from "@/lib/stores/audio-store";
import { getPresetById } from "@/lib/utils/audio-presets";
import { useCombatLogStore } from "@/lib/stores/combat-log-store";
import { computeCombatStats, getMaxRound, buildCombatReport } from "@/lib/utils/combat-stats";
import type { CombatantStats } from "@/lib/utils/combat-stats";
import type { CombatReport } from "@/lib/types/combat-report";
import { CombatActionLog } from "@/components/combat/CombatActionLog";
import { CombatRecap } from "@/components/combat/CombatRecap";
import { DifficultyPoll } from "@/components/combat/DifficultyPoll";
import { PollResult, calculateAverage } from "@/components/combat/PollResult";
import { createClient } from "@/lib/supabase/client";
import { CombatTimer } from "@/components/combat/CombatTimer";
// StickyTurnHeader removed — turn info now inline in round header (desktop) and compact row (mobile)
import { TurnTimer } from "@/components/combat/TurnTimer";
import { AnimatePresence } from "framer-motion";
import { PlayerDrawer } from "@/components/combat/PlayerDrawer";
import { Users, ScrollText, Pause, Play } from "lucide-react";
import { BENEFICIAL_CONDITIONS } from "@/components/combat/ConditionSelector";
// WEATHER_DISABLED: import type { WeatherEffect } from "@/components/player/WeatherOverlay";
import { JoinRequestBanner, type JoinRequest } from "@/components/session/JoinRequestBanner";
import { PlayersOnlinePanel } from "@/components/session/PlayersOnlinePanel";
import { DmPostitSender } from "@/components/combat/DmPostitSender";
import { rejoinAsPlayer } from "@/lib/supabase/player-registration";
import { generateEncounterName } from "@/lib/utils/encounter-name";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { DmPostCombatFeedback } from "@/components/combat/DmPostCombatFeedback";
import { PostCombatMethodologyNudge } from "@/components/combat/PostCombatMethodologyNudge";
import {
  persistEncounterSnapshot,
  persistDmFeedback,
  detectCombatResult,
  buildPartySnapshot,
  buildCreaturesSnapshot,
  computeDataQualityFlags,
} from "@/lib/supabase/encounter-snapshot";
import type { EncounterPreset } from "@/lib/types/encounter-preset";
import { incrementPresetUsage } from "@/lib/supabase/encounter-presets";

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
  preloadedPreset?: EncounterPreset | null;
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
  preloadedPreset = null,
}: CombatSessionClientProps) {
  const router = useRouter();
  const t = useTranslations("combat");
  const tMeth = useTranslations("methodology");
  const [addMode, setAddMode] = useState<"open" | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  // Session created on-demand by EncounterSetup for sharing before combat
  const [onDemandSessionId, setOnDemandSessionId] = useState<string | null>(null);
  // Sprint 2: Track preset origin for usage counting and Sprint 3 snapshot
  const presetOriginRef = useRef<string | null>(preloadedPreset?.id ?? null);
  const [leaderboardData, setLeaderboardData] = useState<CombatantStats[] | null>(null);
  const [leaderboardMeta, setLeaderboardMeta] = useState<{ name: string; rounds: number; combatDuration: number }>({ name: "", rounds: 0, combatDuration: 0 });
  const [combatReport, setCombatReport] = useState<CombatReport | null>(null);
  const [reportShareUrl, setReportShareUrl] = useState<string | null>(null);
  const [previousDurationMs, setPreviousDurationMs] = useState<number | null>(null);
  // WEATHER_DISABLED: const [weatherEffect, setWeatherEffect] = useState<WeatherEffect>("none");
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  // Broadcast-driven player status — fed to PlayersOnlinePanel for < 2s latency (spec 4.3.6)
  const [playerBroadcastStatuses, setPlayerBroadcastStatuses] = useState<Record<string, "online" | "idle" | "offline">>({});
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [showActionLog, setShowActionLog] = useState(false);
  const [pendingEncounterName, setPendingEncounterName] = useState("");
  const [pendingStats, setPendingStats] = useState<{
    stats: CombatantStats[];
    rounds: number;
    combatDuration: number;
    logEntries: import("@/lib/stores/combat-log-store").CombatLogEntry[];
    combatantsSnapshot: Combatant[];
    turnTimeAccumulated: Record<string, number>;
    turnTimeSnapshots: Record<number, Record<string, number>>;
    idToName: Record<string, string>;
  } | null>(null);
  // C.15: Post-combat state machine (leaderboard → dm_feedback → poll → result)
  type PostCombatPhase = "leaderboard" | "dm_feedback" | "poll" | "result" | null;
  const [postCombatPhase, setPostCombatPhase] = useState<PostCombatPhase>(null);
  const [pollVotes, setPollVotes] = useState<Map<string, number>>(new Map());

  const { combatants, is_active, setError, expandedGroups, toggleGroupExpanded, setGroupInitiative } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);
  const encounter_name = useCombatStore((s) => s.encounter_name);
  const combatStartedAt = useCombatStore((s) => s.combatStartedAt);
  const turnStartedAt = useCombatStore((s) => s.turnStartedAt);
  const isPaused = useCombatStore((s) => s.isPaused);

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

  const proceedAfterNaming = useCallback((finalName: string) => {
    useCombatStore.setState({ encounter_name: finalName });
    const pending = pendingStats;

    // Sprint 3: Persist encounter snapshot (fire-and-forget — never blocks UI)
    const encIdForSnapshot = useCombatStore.getState().encounter_id;
    if (encIdForSnapshot && pending) {
      const snapshotCombatants = pending.combatantsSnapshot;
      const partySnapshot = buildPartySnapshot(snapshotCombatants, preloadedPlayers);
      const creaturesSnapshot = buildCreaturesSnapshot(snapshotCombatants);
      const combatResult = detectCombatResult(snapshotCombatants);
      const qualityFlags = computeDataQualityFlags(snapshotCombatants, preloadedPlayers);
      const combatStarted = useCombatStore.getState().combatStartedAt;
      persistEncounterSnapshot(encIdForSnapshot, {
        party_snapshot: partySnapshot,
        creatures_snapshot: creaturesSnapshot,
        combat_result: combatResult,
        started_at: combatStarted ? new Date(combatStarted).toISOString() : null,
        ended_at: new Date().toISOString(),
        ...qualityFlags,
        // CTA-10: Persist time analytics for longitudinal analysis
        duration_seconds: pending.combatDuration > 0 ? Math.round(pending.combatDuration / 1000) : undefined,
        turn_time_data: Object.keys(pending.turnTimeAccumulated).length > 0 ? pending.turnTimeAccumulated : undefined,
      }).catch(() => { /* fire-and-forget */ });
    }

    if (pending && pending.stats.length > 0 && pending.stats.some((s) => s.totalDamageDealt > 0)) {
      setLeaderboardData(pending.stats);
      setLeaderboardMeta({ name: finalName, rounds: pending.rounds, combatDuration: pending.combatDuration });
      // Build CombatReport for the new Recap UI
      const report = buildCombatReport({
        entries: pending.logEntries,
        combatants: pending.combatantsSnapshot,
        turnTimeAccumulated: pending.turnTimeAccumulated,
        turnTimeSnapshots: pending.turnTimeSnapshots,
        idToName: pending.idToName,
        encounterName: finalName,
        combatDuration: pending.combatDuration,
        roundNumber: pending.rounds,
        t,
      });
      setCombatReport(report);

      // F4: Auto-persist combat report — capture URL for share link dedup
      const encId = useCombatStore.getState().encounter_id;
      fetch("/api/combat-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report,
          campaignId: campaignId ?? undefined,
          encounterId: encId ?? undefined,
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (data?.url) setReportShareUrl(data.url); })
        .catch(() => { /* non-fatal */ });

      // CTA-11: Fetch previous encounter duration for trend comparison (fire-and-forget)
      if (campaignId) {
        (async () => {
          try {
            const sb = createClient();
            const { data } = await sb
              .from("encounters")
              .select("duration_seconds, session_id!inner(campaign_id)")
              .eq("session_id.campaign_id", campaignId)
              .not("duration_seconds", "is", null)
              .neq("id", encIdForSnapshot ?? "")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (data?.duration_seconds) setPreviousDurationMs(data.duration_seconds * 1000);
          } catch { /* non-fatal */ }
        })();
      }

      setPostCombatPhase("leaderboard"); // C.15: Start post-combat state machine
      setShowActionLog(false); // Close action log to avoid overlapping with recap
      setPollVotes(new Map()); // Reset votes for new encounter
      const sid = getSessionId();
      if (sid) {
        // P3-A: Map real names to display_name for player privacy (anti-metagaming)
        const combatants = useCombatStore.getState().combatants;
        const playerSafeStats = pending.stats.map((s) => {
          const c = combatants.find((x) => x.name === s.name);
          return c?.display_name ? { ...s, name: c.display_name } : s;
        });
        broadcastEvent(sid, {
          type: "session:combat_stats",
          stats: playerSafeStats,
          encounter_name: finalName,
          rounds: pending.rounds,
          combatDuration: pending.combatDuration,
        });
        // B6: Broadcast full recap so players see the "Spotify Wrapped" experience
        // Map names in awards/rankings/narratives using display_name for privacy
        const nameMap = new Map<string, string>();
        for (const c of combatants) {
          if (c.display_name) nameMap.set(c.name, c.display_name);
        }
        const mapName = (n: string) => nameMap.get(n) ?? n;
        const playerSafeReport = {
          ...report,
          awards: report.awards.map((a) => ({ ...a, combatantName: mapName(a.combatantName) })),
          rankings: playerSafeStats,
          narratives: report.narratives.map((n) => ({
            ...n,
            text: [...nameMap.entries()].reduce((txt, [real, display]) => txt.replaceAll(real, display), n.text),
            actors: n.actors.map(mapName),
          })),
        };
        broadcastEvent(sid, {
          type: "session:combat_recap",
          report: playerSafeReport,
        });
      }
    } else {
      // No meaningful combat stats — skip leaderboard but still offer DM feedback
      setPostCombatPhase("dm_feedback");
      setPollVotes(new Map());
    }
    setPendingStats(null);
  }, [doEndEncounter, getSessionId, pendingStats]);

  // Intercept end encounter: show name modal, then compute stats and show leaderboard
  const handleEndEncounter = useCallback(() => {
    const logEntries = useCombatLogStore.getState().entries;
    const state = useCombatStore.getState();

    // Accumulate the final (active) turn's elapsed time before computing stats
    // CTA-12 fix: if paused, use pausedAt to exclude break time
    const finalAccumulated = { ...state.turnTimeAccumulated };
    const currentId = state.combatants[state.current_turn_index]?.id;
    const effectiveNow = (state.isPaused && state.pausedAt) ? state.pausedAt : Date.now();
    const elapsed = state.turnStartedAt ? effectiveNow - state.turnStartedAt : 0;
    if (currentId && elapsed > 0) {
      finalAccumulated[currentId] = (finalAccumulated[currentId] ?? 0) + elapsed;
    }

    // Build ID → name map for time injection
    const idToName: Record<string, string> = {};
    for (const c of state.combatants) {
      idToName[c.id] = c.name;
    }
    // P2-C: Include names of combatants removed mid-combat so their turn time isn't lost
    for (const [id, name] of Object.entries(state.removedCombatantNames)) {
      if (!idToName[id]) idToName[id] = name;
    }

    const stats = computeCombatStats(logEntries, finalAccumulated, idToName);
    const rounds = getMaxRound(logEntries);
    // CTA-12 fix: exclude active pause time from duration
    let combatDuration = state.combatStartedAt ? effectiveNow - state.combatStartedAt : 0;
    const existingName = state.encounter_name.trim();
    const suggestedName = existingName || generateEncounterName(state.combatants);

    setPendingEncounterName(suggestedName);
    setPendingStats({ stats, rounds, combatDuration, logEntries, combatantsSnapshot: [...state.combatants], turnTimeAccumulated: finalAccumulated, turnTimeSnapshots: { ...state.turnTimeSnapshots }, idToName });
    setNameModalOpen(true);
  }, []);

  const handleNameModalSkip = useCallback(() => {
    setNameModalOpen(false);
    proceedAfterNaming(pendingEncounterName);
  }, [pendingEncounterName, proceedAfterNaming]);

  const handleNameModalSave = useCallback(() => {
    setNameModalOpen(false);
    const finalName = pendingEncounterName.trim() || "Encounter";
    proceedAfterNaming(finalName);
  }, [pendingEncounterName, proceedAfterNaming]);

  // P1.05: Ref mirror for postCombatPhase — usable inside broadcast handlers without stale closure
  const postCombatPhaseRef = useRef<PostCombatPhase>(null);
  postCombatPhaseRef.current = postCombatPhase;

  // BUG-I2: Mutual exclusion — derived state prevents log during any post-combat phase
  const effectiveShowActionLog = showActionLog && !postCombatPhase;

  // C.15: Dismiss all post-combat screens — persist poll result + end encounter
  const handleDismissAll = useCallback(async () => {
    // P2.01: Clear UI immediately before async — prevents stale screen on network error
    setPostCombatPhase(null);
    setPollVotes(new Map());
    setCombatReport(null);
    setReportShareUrl(null);
    setLeaderboardData(null);
    useCombatLogStore.getState().clear();

    // P1.06: Snapshot Map before await — prevents race condition with late-arriving votes
    const snapshotVotes = new Map(pollVotes);
    if (snapshotVotes.size > 0) {
      // P2.02: Clamp avg to valid range before persisting
      const avg = Math.min(5.0, Math.max(1.0, calculateAverage(snapshotVotes)));
      const encounterId = useCombatStore.getState().encounter_id;
      if (encounterId) {
        const supabase = createClient();
        try {
          await supabase
            .from("encounters")
            .update({ difficulty_rating: avg, difficulty_votes: snapshotVotes.size })
            .eq("id", encounterId);
        } catch {
          // Non-fatal — poll data loss acceptable, encounter still ends
        }
      }

      // C.15-B: Broadcast aggregate results to players so they can see how the group voted
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const [name, v] of snapshotVotes) {
        if (name !== "DM" && v >= 1 && v <= 5) distribution[v] = (distribution[v] ?? 0) + 1;
      }
      const playerVotes = snapshotVotes.size - (snapshotVotes.has("DM") ? 1 : 0);
      broadcastEvent(getSessionId() ?? "", {
        type: "session:poll_results",
        avg,
        distribution,
        total_votes: playerVotes,
      });
    }
    doEndEncounter();
  }, [doEndEncounter, getSessionId, pollVotes]);

  // Hide navbar + reduce main padding when combat is active — saves ~72px vertical space
  useEffect(() => {
    if (is_active) {
      document.documentElement.setAttribute("data-combat-active", "true");
    }
    return () => {
      document.documentElement.removeAttribute("data-combat-active");
    };
  }, [is_active]);

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
      // P1-A: Save timer data before clearEncounter wipes localStorage
      let timerBackup: string | null = null;
      if (isActive) {
        try { timerBackup = localStorage.getItem("combat-timers"); } catch { /* ignore */ }
      }
      store.clearEncounter();
      store.setEncounterId(encounterId, sessionId);
      store.hydrateCombatants(initialCombatants);
      if (isActive) {
        const clampedIndex =
          initialCombatants.length > 0
            ? Math.max(0, Math.min(currentTurnIndex, initialCombatants.length - 1))
            : 0;
        store.hydrateActiveState(clampedIndex, Math.max(1, roundNumber));
        // P1-A: Restore timer data after hydration (clearEncounter wiped it)
        if (timerBackup) {
          try {
            const parsed = JSON.parse(timerBackup);
            useCombatStore.setState({
              combatStartedAt: parsed.combatStartedAt ?? null,
              turnStartedAt: parsed.turnStartedAt ?? null,
              turnTimeAccumulated: parsed.turnTimeAccumulated ?? {},
            });
            localStorage.setItem("combat-timers", timerBackup);
          } catch { /* ignore */ }
        }
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
    // Sprint 2: Track preset usage (fire-and-forget, once only)
    const presetId = presetOriginRef.current;
    if (presetId) {
      incrementPresetUsage(presetId).catch(() => { /* non-fatal */ });
      presetOriginRef.current = null;
    }

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
        // P2-A: Log first combatant's turn so all combatants have matching turn entries
        const firstCombatant = sorted[0];
        if (firstCombatant) {
          useCombatLogStore.getState().addEntry({ round: 1, type: "turn", actorName: firstCombatant.name, description: `Turn: ${firstCombatant.name}` });
        }
        // Auto-expand group if first combatant belongs to one
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
      // Detect if DM modified the preset (added/removed creatures or changed quantities)
      let wasModified = false;
      if (presetId && preloadedPreset?.creatures) {
        const presetSlugs = new Map<string, number>();
        for (const c of preloadedPreset.creatures) {
          presetSlugs.set(c.monster_slug ?? c.name, c.quantity);
        }
        const combatSlugs = new Map<string, number>();
        for (const c of sorted.filter((x) => !x.is_player && !x.is_lair_action)) {
          const key = c.monster_id ?? c.name.replace(/\s+\d+$/, "");
          combatSlugs.set(key, (combatSlugs.get(key) ?? 0) + 1);
        }
        wasModified = presetSlugs.size !== combatSlugs.size ||
          [...presetSlugs].some(([slug, qty]) => combatSlugs.get(slug) !== qty);
      }

      const { session_id, encounter_id } = await createEncounterWithCombatants(
        sorted,
        rulesetVersion,
        campaignId,
        encounterName,
        onDemandSessionId,
        undefined, // dmPlan
        presetId ?? null,
        wasModified,
      );
      store.setEncounterId(encounter_id, session_id);
      await persistInitiativeAndStartCombat(encounter_id, sorted);
      store.startCombat();
      // P2-A: Log first combatant's turn so all combatants have matching turn entries
      const firstNew = sorted[0];
      if (firstNew) {
        useCombatLogStore.getState().addEntry({ round: 1, type: "turn", actorName: firstNew.name, description: `Turn: ${firstNew.name}` });
      }
      // Auto-expand group if first combatant belongs to one
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
      legendary_actions_total: null,
      legendary_actions_used: 0,
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
    const groupRoll = rollInitiativeForCombatant("tmp", monster.dex ?? undefined);
    for (let i = 1; i <= qty; i++) {
      newCombatants.push({
        name: `${monster.name} ${i}`,
        current_hp: monster.hit_points,
        max_hp: monster.hit_points,
        temp_hp: 0,
        ac: monster.armor_class,
        spell_save_dc: null,
        initiative: groupRoll.total,
        initiative_breakdown: { roll: groupRoll.rolls[0], modifier: groupRoll.modifier },
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
        legendary_actions_total: null,
        legendary_actions_used: 0,
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
    enabled: is_active && !postCombatPhase,
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
        case "hidden":
          toast(t("undo_hidden"));
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
        legendary_actions_total: null,
        legendary_actions_used: 0,
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

    ch.on("broadcast", { event: "combat:late_join_request" }, handleLateJoin);
    ch.on("broadcast", { event: "combat:rejoin_request" }, handleRejoinRequest);

    return () => {
      active = false;
      setJoinRequests([]);
    };
  }, [is_active, getSessionId]);

  // Listen for player presence broadcasts — spec 4.3.6, feeds PlayersOnlinePanel < 2s latency
  useEffect(() => {
    const sid = getSessionId();
    if (!sid || !is_active) return;
    const ch = getDmChannel(sid);
    let active = true;

    const markStatus = (name: string, status: "online" | "idle" | "offline") => {
      if (!active || !name) return;
      setPlayerBroadcastStatuses((prev) =>
        prev[name] === status ? prev : { ...prev, [name]: status }
      );
    };

    ch.on("broadcast", { event: "player:disconnecting" }, ({ payload }) => {
      markStatus(payload?.player_name as string, "offline");
    });
    ch.on("broadcast", { event: "player:idle" }, ({ payload }) => {
      markStatus(payload?.player_name as string, "idle");
    });
    ch.on("broadcast", { event: "player:active" }, ({ payload }) => {
      markStatus(payload?.player_name as string, "online");
    });
    ch.on("broadcast", { event: "player:joined" }, ({ payload }) => {
      markStatus((payload?.name ?? payload?.player_name) as string, "online");
    });

    return () => { active = false; };
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

    ch.on("broadcast", { event: "audio:play_sound" }, handleAudioPlay);

    return () => { active = false; };
  }, [is_active, getSessionId]);

  // Listen for player:end_turn — player passed their own turn
  // Use ref to avoid re-subscribing on every handleAdvanceTurn identity change
  const handleAdvanceTurnRef = useRef(handleAdvanceTurn);
  handleAdvanceTurnRef.current = handleAdvanceTurn;
  // C.13: Refs for HP action handler — avoids re-subscribing on every callback identity change
  const handleApplyDamageRef = useRef(handleApplyDamage);
  handleApplyDamageRef.current = handleApplyDamage;
  const handleApplyHealingRef = useRef(handleApplyHealing);
  handleApplyHealingRef.current = handleApplyHealing;
  const handleSetTempHpRef = useRef(handleSetTempHp);
  handleSetTempHpRef.current = handleSetTempHp;

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

    // C.15: Listen for player:poll_vote — player voted on difficulty
    const handlePlayerPollVote = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const { player_name, vote } = payload as { player_name: string; vote: number };
      if (!player_name || !vote || vote < 1 || vote > 5) return;
      setPollVotes((prev) => {
        const next = new Map(prev);
        next.set(player_name, vote);
        return next;
      });
    };

    ch.on("broadcast", { event: "player:poll_vote" }, handlePlayerPollVote);

    // C.13: Listen for player:hp_action — player self-reported damage/heal/temp
    const handlePlayerHpAction = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      // P1.05: Ignore HP actions during post-combat phase — encounter is already ending
      if (postCombatPhaseRef.current !== null) return;

      const { combatant_id, action, amount, player_name } = payload as {
        combatant_id: string;
        action: "damage" | "heal" | "temp_hp";
        amount: number;
        player_name: string;
      };

      // Validate payload
      if (!combatant_id || !action || !amount) return;
      if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > 9999) return;
      if (!["damage", "heal", "temp_hp"].includes(action)) return;

      // Security: only allow self-modification of player combatants
      const combatant = useCombatStore.getState().combatants.find((c) => c.id === combatant_id);
      if (!combatant || !combatant.is_player) return;
      // B1: Verify player_name matches the combatant (prevents Player A acting on Player B's HP)
      if (combatant.name.toLowerCase() !== String(player_name).toLowerCase()) return;
      // P1.04: Ignore damage on already-dead player — prevents spurious death save toasts
      if (action === "damage" && (combatant.current_hp ?? 0) <= 0) return;

      const source = `${player_name} (self-report)`;

      switch (action) {
        case "damage":
          handleApplyDamageRef.current(combatant_id, amount, { source });
          toast(`${player_name}: \u2212${amount} HP`, { duration: 3000 });
          break;
        case "heal":
          handleApplyHealingRef.current(combatant_id, amount, source);
          toast(`${player_name}: +${amount} HP`, { duration: 3000 });
          break;
        case "temp_hp":
          handleSetTempHpRef.current(combatant_id, amount);
          // Log temp HP (not logged by handleSetTempHp natively)
          useCombatLogStore.getState().addEntry({
            round: useCombatStore.getState().round_number,
            type: "system",
            actorName: source,
            targetName: combatant.name,
            description: `${combatant.name} gained ${amount} temp HP`,
          });
          toast(`${player_name}: +${amount} temp HP`, { duration: 3000 });
          break;
      }
    };

    ch.on("broadcast", { event: "player:hp_action" }, handlePlayerHpAction);

    // F-38: DM explicitly ignores player chat messages (AC: DM does not see player chat)
    ch.on("broadcast", { event: "chat:player_message" }, () => { /* ignored by DM */ });

    // Listen for player:self_condition_toggle — player self-applied a beneficial condition
    const handleSelfConditionToggle = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      const { combatant_id, condition, player_name } = payload as { combatant_id: string; condition: string; player_name: string };
      if (!combatant_id || !condition || typeof condition !== "string") return;
      // Security: only allow beneficial conditions
      if (!(BENEFICIAL_CONDITIONS as readonly string[]).includes(condition)) return;
      // Security: combatant must exist and be a player — use ID as primary key, name as confirmation
      const combatant = useCombatStore.getState().combatants.find((c) => c.id === combatant_id);
      if (!combatant || !combatant.is_player) return;
      // Name confirmation prevents another client from sending another player's combatant_id
      if (combatant.name.toLowerCase() !== String(player_name ?? "").toLowerCase()) return;
      // Apply the toggle via the store
      useCombatStore.getState().toggleCondition(combatant_id, condition);
      // Broadcast updated conditions to all players
      const updated = useCombatStore.getState().combatants.find((c) => c.id === combatant_id);
      if (updated) {
        broadcastEvent(getSessionId()!, {
          type: "combat:condition_change",
          combatant_id,
          conditions: updated.conditions,
          condition_durations: updated.condition_durations,
        });
      }
    };

    ch.on("broadcast", { event: "player:self_condition_toggle" }, handleSelfConditionToggle);

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-stable: handleAdvanceTurnRef, handleApplyDamageRef, handleApplyHealingRef, handleSetTempHpRef
  }, [is_active, getSessionId]);

  // Show unified setup if not yet active
  if (!is_active) {
    return <EncounterSetup onStartCombat={handleStartCombat} campaignId={campaignId} preloadedPlayers={preloadedPlayers} preloadedPreset={preloadedPreset} sessionId={sessionId} onSessionCreated={setOnDemandSessionId} />;
  }

  // Active combat view
  return (
    <div className="w-full max-w-6xl mx-auto px-2" data-testid="active-combat">
      <div className="sticky top-0 z-30 bg-background pb-1 space-y-1 border-b border-white/[0.06] -mx-2 px-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-foreground font-semibold whitespace-nowrap text-sm">
            {encounter_name && <span className="mr-1.5 hidden sm:inline">{encounter_name}</span>}
            {t("round")} <span className="font-mono text-gold">{round_number}</span>
          </h2>
          {combatStartedAt && <CombatTimer startTime={combatStartedAt} isPaused={isPaused} />}
          {turnStartedAt && <TurnTimer startTime={turnStartedAt} isPaused={isPaused} />}
          {combatStartedAt && (
            <button
              type="button"
              onClick={() => useCombatStore.getState().toggleTimerPause()}
              className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-md transition-colors ${
                isPaused
                  ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
                  : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.04]"
              }`}
              aria-label={isPaused ? t("timer_resume") : t("timer_pause")}
              data-testid="timer-pause-btn"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
          {/* Inline turn indicator — replaces separate StickyTurnHeader */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs min-w-0 border-l border-white/[0.08] pl-2 ml-1">
            <span className="text-gold shrink-0" aria-hidden="true">▶</span>
            <span className={`truncate max-w-[140px] font-medium ${combatants[current_turn_index]?.is_player ? "text-gold" : "text-foreground"}`}>
              {combatants[current_turn_index]?.is_player
                ? t("sticky_pc_turn", { name: combatants[current_turn_index]?.name ?? "" })
                : combatants[current_turn_index]?.name ?? t("dm_turn_label")}
            </span>
            {combatants[(current_turn_index + 1) % combatants.length] && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                → {combatants[(current_turn_index + 1) % combatants.length]?.name}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdvanceTurn}
          disabled={turnPending}
          className="px-3 py-1.5 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] sm:min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap inline-flex items-center gap-2"
          aria-label="Advance to next turn"
          data-testid="next-turn-btn"
        >
          {turnPending ? t("next_turn_saving") : t("next_turn")}
          <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0.5 bg-black/20 rounded">Space</kbd>
        </button>
      </div>
      <div className="relative scroll-fade-hint">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-muted-foreground text-xs">
            {t(combatants.length === 1 ? "combatants_count" : "combatants_count_plural", { count: combatants.length })}
          </span>
          <button
            type="button"
            onClick={() => { if (!postCombatPhase) setShowActionLog(v => !v); }}
            className="px-2 py-1 text-muted-foreground hover:text-gold bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-[250ms] text-sm min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center rounded-md"
            aria-label={t("combat_log_title")}
            title={t("combat_log_title")}
            data-testid="action-log-btn"
          >
            <ScrollText className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleEndEncounter}
            className="px-2 py-1 bg-red-900/20 text-red-400 font-medium rounded-md hover:bg-red-900/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] sm:min-h-[32px]"
            aria-label="End encounter"
            data-testid="end-encounter-btn"
          >
            {t("end_session")}
          </button>
          <button
            type="button"
            onClick={() => setAddMode((prev) => (prev ? null : "open"))}
            className="px-2 py-1 bg-emerald-900/30 text-emerald-400 font-medium rounded-md hover:bg-emerald-900/50 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] sm:min-h-[32px]"
            aria-label="Add combatant"
            data-testid="add-combatant-btn"
          >
            {t("add_mid_combat")}
          </button>
          {/* WEATHER_DISABLED: weatherEffect + onWeatherChange removidos — reintroduzir no futuro */}
          <DmAtmospherePanel
            onBroadcast={(event, payload) => broadcastEvent(sessionId ?? "", { type: event, ...payload } as import("@/lib/types/realtime").RealtimeEvent)}
          />
          {campaignId && (
            <button
              type="button"
              onClick={() => setPlayerDrawerOpen((v) => !v)}
              className={`px-2 py-1 text-sm min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center gap-1.5 rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
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
          {/* Dice Roller — F-37 */}
          <DiceRoller />

          <button
            type="button"
            onClick={() => setCheatsheetOpen((v) => !v)}
            className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors text-sm min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] hidden md:inline-flex items-center justify-center"
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

      {/* Compact players row — inline dots + postit senders */}
      {sessionId && (
        <div className="flex items-center gap-2 text-xs px-1">
          <PlayersOnlinePanel
            sessionId={sessionId}
            broadcastStatuses={playerBroadcastStatuses}
            compact
          />
          {/* F-38: Per-player postit buttons + send to all */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            {combatants
              .filter((c) => c.is_player && !c.is_defeated)
              .map((c) => (
                <DmPostitSender
                  key={c.id}
                  channel={getDmChannel(sessionId)}
                  targetTokenId={c.name}
                  targetLabel={c.name}
                />
              ))}
            <DmPostitSender
              channel={getDmChannel(sessionId)}
              targetTokenId="all"
              targetLabel="Todos"
            />
          </div>
        </div>
      )}

      <Sheet open={!!addMode} onOpenChange={(open) => { if (!open) setAddMode(null); }}>
        <SheetContent side="bottom" data-testid="add-combatant-panel">
          <SheetHeader>
            <SheetTitle>{t("add_combatant_title")}</SheetTitle>
          </SheetHeader>
          <MonsterSearchPanel
            rulesetVersion={rulesetVersion}
            onSelectMonster={handleSelectMonster}
            onSelectMonsterGroup={handleSelectMonsterGroup}
            showManualAdd
            defaultManualOpen
            onManualAdd={(data) => {
              const currentCombatants = useCombatStore.getState().combatants;
              const numberedName = getNumberedName(data.name, currentCombatants);
              const existingNames = currentCombatants
                .filter((c) => !c.is_player && c.display_name)
                .map((c) => c.display_name!);
              const displayName = generateCreatureName(null, existingNames);
              addCombatantAction({
                name: numberedName,
                current_hp: data.hp ?? 0,
                max_hp: data.hp ?? 0,
                temp_hp: 0,
                ac: data.ac ?? 0,
                spell_save_dc: null,
                initiative: data.initiative ?? null,
                initiative_order: null,
                conditions: [],
                ruleset_version: null,
                is_defeated: false,
                is_hidden: false,
                is_player: false,
                monster_id: null,
                token_url: null,
                creature_type: null,
                display_name: displayName,
                monster_group_id: null,
                group_order: null,
                dm_notes: "",
                player_notes: "",
                player_character_id: null,
                combatant_role: null,
                legendary_actions_total: null,
                legendary_actions_used: 0,
              });
            }}
          />
        </SheetContent>
      </Sheet>
      {/* Turn indicator on mobile — visible only below sm breakpoint */}
      <div className="sm:hidden flex items-center gap-2 px-2 py-1 text-xs">
        <span className="text-gold shrink-0" aria-hidden="true">▶</span>
        <span className={`truncate font-medium ${combatants[current_turn_index]?.is_player ? "text-gold" : "text-foreground"}`}>
          {combatants[current_turn_index]?.is_player
            ? t("sticky_pc_turn", { name: combatants[current_turn_index]?.name ?? "" })
            : combatants[current_turn_index]?.name ?? t("dm_turn_label")}
        </span>
        {combatants[(current_turn_index + 1) % combatants.length] && (
          <span className="text-[10px] text-muted-foreground truncate">
            → {combatants[(current_turn_index + 1) % combatants.length]?.name}
          </span>
        )}
      </div>
      </div>{/* end sticky controls */}

      <div className="mt-1">
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
        onSetLegendaryActionsUsed={(id, count) => useCombatStore.getState().setLegendaryActionsUsed(id, count)}
        onAddDeathSaveSuccess={(id) => {
          useCombatStore.getState().addDeathSaveSuccess(id);
          const sid = getSessionId();
          if (!sid) return;
          const c = useCombatStore.getState().combatants.find((x) => x.id === id);
          if (c) broadcastEvent(sid, { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp, max_hp: c.max_hp, is_player: c.is_player });
        }}
        onAddDeathSaveFailure={(id) => {
          useCombatStore.getState().addDeathSaveFailure(id);
          const sid = getSessionId();
          if (!sid) return;
          const c = useCombatStore.getState().combatants.find((x) => x.id === id);
          if (c?.is_defeated) broadcastEvent(sid, { type: "combat:defeated_change", combatant_id: id, is_defeated: true });
          if (c) broadcastEvent(sid, { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp, max_hp: c.max_hp, is_player: c.is_player });
        }}
        expandedGroups={expandedGroups}
        onToggleGroupExpanded={toggleGroupExpanded}
        onSetGroupInitiative={setGroupInitiative}
        t={t}
      />
      </div>{/* end scrollable area */}

      <KeyboardCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />

      <AlertDialog open={nameModalOpen} onOpenChange={(open) => { if (!open) handleNameModalSkip(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("encounter_name_modal_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("encounter_name_modal_suggestion")}</AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={pendingEncounterName}
            onChange={(e) => setPendingEncounterName(e.target.value)}
            maxLength={60}
            className="w-full bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNameModalSave(); } }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleNameModalSkip}>
              {t("encounter_name_modal_skip")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleNameModalSave}>
              {t("encounter_name_modal_save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {postCombatPhase === "leaderboard" && combatReport && (
          <CombatRecap
            report={combatReport}
            // Sprint 3: After leaderboard, DM goes to dm_feedback
            onClose={() => setPostCombatPhase("dm_feedback")}
            existingShareUrl={reportShareUrl}
            campaignId={campaignId ?? undefined}
            encounterId={useCombatStore.getState().encounter_id ?? undefined}
            previousDurationMs={previousDurationMs}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {postCombatPhase === "dm_feedback" && (
          <DmPostCombatFeedback
            onSubmit={(rating, notes) => {
              const encId = useCombatStore.getState().encounter_id;
              if (encId) {
                persistDmFeedback(encId, rating, notes).catch(() => { /* fire-and-forget */ });
              }
              setPostCombatPhase("result");
            }}
            onSkip={() => setPostCombatPhase("result")}
          />
        )}
      </AnimatePresence>

      {postCombatPhase === "result" && (
        <div className="fixed inset-0 z-50">
          <PollResult
            votes={pollVotes}
            onClose={handleDismissAll}
            // UX.10 — live player count so DM knows how many votes to wait for
            totalPlayers={useCombatStore.getState().combatants.filter((c) => c.is_player).length}
          />
        </div>
      )}

      {/* Methodology nudge — Auth-only, after DM gave rating */}
      {postCombatPhase === "result" && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <PostCombatMethodologyNudge
            text={tMeth("nudge_text")}
            linkText={tMeth("nudge_link")}
          />
        </div>
      )}

      {/* Mobile-only sticky FAB for Next Turn — parity with guest mode */}
      {is_active && !postCombatPhase && !showActionLog && (
        <div className="fixed bottom-4 right-4 z-[41] md:hidden">
          <button
            type="button"
            onClick={handleAdvanceTurn}
            disabled={turnPending}
            className="flex items-center gap-2 px-4 py-3 bg-gold text-foreground font-semibold rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all duration-200 min-h-[48px] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t("next_turn")}
            data-testid="next-turn-fab"
          >
            ▶ {turnPending ? t("next_turn_saving") : t("next_turn")}
          </button>
        </div>
      )}

      <PlayerDrawer
        campaignId={campaignId}
        open={playerDrawerOpen}
        onClose={() => setPlayerDrawerOpen(false)}
      />

      <CombatActionLog open={effectiveShowActionLog} onClose={() => setShowActionLog(false)} />
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
  onSetLegendaryActionsUsed: (id: string, count: number) => void;
  onAddDeathSaveSuccess?: (id: string) => void;
  onAddDeathSaveFailure?: (id: string) => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroupExpanded: (groupId: string) => void;
  onSetGroupInitiative: (groupId: string, value: number) => void;
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
  onSetLegendaryActionsUsed,
  onAddDeathSaveSuccess,
  onAddDeathSaveFailure,
  expandedGroups,
  onToggleGroupExpanded,
  onSetGroupInitiative,
  t,
}: CombatListProps) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    requestAnimationFrame(() => {
      if (document.querySelector('[data-panel-open="true"]')) return;
      const el = document.querySelector(`[data-combatant-index="${currentTurnIndex}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [currentTurnIndex]);

  return (
    <div
      role="list"
      aria-label={t("initiative_order")}
      data-testid="initiative-list"
      className="space-y-1"
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
                index={index}
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
                onSetLegendaryActionsUsed={onSetLegendaryActionsUsed}
                onAddDeathSaveSuccess={onAddDeathSaveSuccess}
                onAddDeathSaveFailure={onAddDeathSaveFailure}
              />
            </div>
          );
        }}
        renderGroup={(groupId, members, dragHandleProps) => {
          const isExpanded = expandedGroups[groupId] ?? true;
          const isCurrentTurn = members.some(
            (m) => combatants.findIndex((x) => x.id === m.id) === currentTurnIndex
          );
          return (
            <MonsterGroupHeader
              groupName={getGroupBaseName(members)}
              members={members}
              isExpanded={isExpanded}
              onToggle={() => onToggleGroupExpanded(groupId)}
              groupInitiative={getGroupInitiative(members)}
              onSetGroupInitiative={(value) => onSetGroupInitiative(groupId, value)}
              isCurrentTurn={isCurrentTurn}
            >
              {members.map((c, i) => {
                const index = combatants.findIndex((x) => x.id === c.id);
                return (
                  <div key={c.id} className={index === focusedIndex ? "ring-1 ring-gold/40 rounded-lg" : ""}>
                    <CombatantRow
                      combatant={c}
                      index={index}
                      isCurrentTurn={index === currentTurnIndex}
                      showActions
                      dragHandleProps={i === 0 ? dragHandleProps : {}}
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
                      onSetLegendaryActionsUsed={onSetLegendaryActionsUsed}
                      onAddDeathSaveSuccess={onAddDeathSaveSuccess}
                      onAddDeathSaveFailure={onAddDeathSaveFailure}
                    />
                  </div>
                );
              })}
            </MonsterGroupHeader>
          );
        }}
      />
    </div>
  );
}
