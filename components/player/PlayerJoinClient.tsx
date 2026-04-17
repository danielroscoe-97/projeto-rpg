"use client";

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { claimPlayerToken, registerPlayerCombatant, markPlayerToken, rejoinAsPlayer } from "@/lib/supabase/player-registration";
import { trackEvent } from "@/lib/analytics/track";
import { PlayerInitiativeBoard, type CombatLogEntry } from "@/components/player/PlayerInitiativeBoard";
import { PlayerLobby } from "@/components/player/PlayerLobby";
import { SyncIndicator } from "@/components/player/SyncIndicator";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";
import type { RulesetVersion } from "@/lib/types/database";
import type { Plan } from "@/lib/types/subscription";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { captureError } from "@/lib/errors/capture";
import { persistPlayerIdentity, loadPlayerIdentity, clearPlayerIdentity } from "@/lib/player-identity-storage";
import { classifyReconnect } from "@/lib/realtime/reconnect-classifier";
import { fetchOrchestrator, type FetchPriority } from "@/lib/realtime/fetch-orchestrator";
import type { PlayerAudioFile } from "@/lib/types/audio";
import type {
  SanitizedStateSync,
  SanitizedCombatantAdd,
  SanitizedCombatantAddReorder,
  SanitizedStatsUpdate,
  SanitizedInitiativeReorder,
  RealtimeTurnAdvance,
  RealtimeConditionChange,
  RealtimeReactionToggle,
  RealtimeDefeatedChange,
  RealtimeCombatantRemove,
  RealtimeVersionSwitch,
  RealtimeLateJoinResponse,
  RealtimeSessionRevoked,
  RealtimeAudioPlay,
  RealtimeAmbientStart,
  RealtimeLoopStop,
  RealtimeCombatStats,
  RealtimeCombatRecap,
  RealtimeSessionPollResults,
  RealtimePlayerNotesUpdate,
} from "@/lib/types/realtime";
import { useAudioStore } from "@/lib/stores/audio-store";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { AudioUnlockBanner } from "@/components/audio/AudioUnlockBanner";
import type { CombatantStats } from "@/lib/utils/combat-stats";
import { CombatLeaderboard } from "@/components/combat/CombatLeaderboard";
import { CombatRecap } from "@/components/combat/CombatRecap";
import type { CombatReport } from "@/lib/types/combat-report";
import { DifficultyPoll, DIFFICULTY_OPTIONS } from "@/components/combat/DifficultyPoll";
import { PlayerSharedNotes } from "@/components/player/PlayerSharedNotes";
import { PlayerChat } from "@/components/player/PlayerChat";
import { DmPostit } from "@/components/player/DmPostit";
import { usePendingActionsStore, generateActionId } from "@/lib/stores/pending-actions-store";
import { useActionAck, confirmActionsForCombatant } from "@/hooks/use-action-ack";
import type { CombatantPendingState } from "@/hooks/use-action-ack";

const SpellSearch = lazy(() =>
  import("@/components/oracle/SpellSearch").then((mod) => ({
    default: mod.SpellSearch,
  }))
);

interface PlayerCombatant {
  id: string;
  name: string;
  /** Only present for is_player=true combatants */
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
  /** HP status label for monsters (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) */
  hp_status?: string;
  spell_save_dc?: number | null;
  /** Death saves state for players at 0 HP */
  death_saves?: { successes: number; failures: number };
  /** Turn count per condition — used for duration badges. Players only. */
  condition_durations?: Record<string, number>;
  /** Whether this combatant has used their reaction this round */
  reaction_used?: boolean;
  /** Linked session_token ID — for ID-based reconnection. */
  session_token_id?: string | null;
}

interface PrefilledCharacter {
  id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  ac: number;
  spell_save_dc: number | null;
  spell_slots?: Record<string, { max: number; used: number }> | null;
}

interface PlayerJoinClientProps {
  tokenId: string;
  sessionId: string;
  sessionName: string;
  rulesetVersion: RulesetVersion;
  encounterId: string | null;
  isActive: boolean;
  roundNumber: number;
  currentTurnIndex: number;
  initialCombatants: PlayerCombatant[];
  /** Characters the authenticated player has in this campaign (auto-join) */
  prefilledCharacters?: PrefilledCharacter[];
  /** DM's plan snapshotted on the session (Mesa model) */
  dmPlan?: Plan;
  /** Player names already registered in this session (enables cookie-less rejoin) */
  registeredPlayerNames?: string[];
  /** Player names with active/inactive status and raw timestamp for reconnection */
  registeredPlayersWithStatus?: Array<{ name: string; isActive: boolean; lastSeenAt?: string | null }>;
  /** Campaign ID — present only for authenticated campaign members. Enables shared notes panel. */
  campaignId?: string | null;
  /** Session's campaign_id — always set when session belongs to a campaign. Used for post-combat join CTA. */
  sessionCampaignId?: string;
}

export function PlayerJoinClient({
  tokenId,
  sessionId,
  sessionName,
  rulesetVersion,
  encounterId,
  isActive,
  roundNumber,
  currentTurnIndex,
  initialCombatants,
  prefilledCharacters,
  dmPlan = "free",
  registeredPlayerNames = [],
  registeredPlayersWithStatus = [],
  campaignId,
  sessionCampaignId,
}: PlayerJoinClientProps) {
  const router = useRouter();
  const t = useTranslations("player");
  const tRef = useRef(t);
  tRef.current = t;
  const [combatants, setCombatants] = useState(initialCombatants);
  const [round, setRound] = useState(roundNumber);
  const [turnIndex, setTurnIndex] = useState(currentTurnIndex);
  const [active, setActive] = useState(isActive);
  const [currentEncounterId, setCurrentEncounterId] = useState(encounterId);
  const encounterIdRef = useRef(encounterId);
  // Keep ref in sync with state
  useEffect(() => { encounterIdRef.current = currentEncounterId; }, [currentEncounterId]);
  const [authReady, setAuthReady] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableConnectionStatus = useRef<ConnectionStatus>("connecting");
  const setDebouncedConnectionStatus = useCallback((status: ConnectionStatus) => {
    // "connected" is always applied immediately; transient states are debounced
    if (status === "connected") {
      if (connectionTimerRef.current) { clearTimeout(connectionTimerRef.current); connectionTimerRef.current = null; }
      stableConnectionStatus.current = status;
      setConnectionStatus(status);
    } else if (stableConnectionStatus.current !== status) {
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = setTimeout(() => {
        connectionTimerRef.current = null;
        stableConnectionStatus.current = status;
        setConnectionStatus(status);
      }, 1500);
    }
  }, []);
  const [showOracle, setShowOracle] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | undefined>();
  const [joinedPlayers, setJoinedPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [nextCombatantId, setNextCombatantId] = useState<string | null>(null);
  // WEATHER_DISABLED: const [weatherEffect, setWeatherEffect] = useState<string>("none");
  const [effectiveTokenId, setEffectiveTokenId] = useState(tokenId);
  const [lateJoinStatus, setLateJoinStatus] = useState<"idle" | "waiting" | "accepted" | "rejected" | "polling" | "timeout">("idle");
  const lateJoinRequestIdRef = useRef<string | null>(null);
  const lateJoinDataRef = useRef<{ name: string; initiative: number; hp: number | null; ac: number | null } | null>(null);
  const lateJoinRegisteredRef = useRef(false);
  // A.4: Guard against race condition — prevent timers from overwriting final status
  const lateJoinFinalStatusRef = useRef(false);
  const lateJoinRetryCountRef = useRef(0);
  const [lateJoinDeadline, setLateJoinDeadline] = useState<number | null>(null);
  // rejoinRetryTimerRef kept for clearAllTimers — safe to remove in a future cleanup pass
  const rejoinRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A.3: Unsub delay timer (session:ended → removeChannel after 500ms)
  const sessionEndedUnsubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const combatantsRef = useRef(initialCombatants);
  // Guard: timestamp of last optimistic death save update — prevents polling from overwriting
  const deathSaveOptimisticRef = useRef<number>(0);
  // Guard: timestamp of last optimistic HP action update — prevents state_sync from overwriting (C.13)
  const hpActionOptimisticRef = useRef<number>(0);
  // P1.03: Track which specific combatant was acted on — limit HP protection to that target only
  const lastHpActionCombatantRef = useRef<string | null>(null);
  // Guard: timestamp of last condition broadcast — prevents polling from overwriting (B3)
  const conditionOptimisticRef = useRef<number>(0);
  // P1.02: Track deferred session:ended when leaderboard/poll is active
  const pendingSessionEndRef = useRef(false);
  const combatStatsActiveRef = useRef(false);
  // S1.1: Encounter id for a recap hydrated from /api/session/[id]/latest-recap.
  // Used to key the `recap-seen-${sessionId}-${encounterId}` sessionStorage
  // flag so refreshing the page doesn't reopen a recap the player closed.
  const hydratedRecapEncounterIdRef = useRef<string | null>(null);
  // Tracks if player rated inline in the recap — skips standalone DifficultyPoll if so
  const playerRatedInlineRef = useRef(false);
  const turnIndexRef = useRef(currentTurnIndex);
  const disconnectedAtRef = useRef<number | null>(null);
  const lastReactionToggleRef = useRef<number>(0);
  // Stores recursive setTimeout handles — named "pollInterval" for semantic clarity but uses setTimeout under the hood
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // S3.5: in-flight guard / throttle timestamp / circuit breaker now owned by
  // the singleton `fetchOrchestrator`. See `lib/realtime/fetch-orchestrator.ts`.
  const turnPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTurnBroadcastRef = useRef<number>(0);
  // Broadcast sequence tracking — discard out-of-order events for critical state (turn advance)
  const lastSeqRef = useRef<number>(0);
  // HP delta visual feedback state
  const [hpDelta, setHpDelta] = useState<{ combatantId: string; delta: number; type: "damage" | "heal" | "temp"; timestamp: number } | null>(null);
  const hpDeltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Death save resolution overlay state
  const [deathSaveResolution, setDeathSaveResolution] = useState<{ combatantId: string; result: "stabilized" | "fallen"; timestamp: number } | null>(null);
  const deathSaveResolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerAudioFiles, setPlayerAudioFiles] = useState<PlayerAudioFile[]>([]);
  const [playerAudioUrls, setPlayerAudioUrls] = useState<Record<string, string>>({});
  const [isLoadingAudioUrls, setIsLoadingAudioUrls] = useState(false);
  // Session revoked banner (B1 — replaces silent toast)
  const [sessionRevokedBanner, setSessionRevokedBanner] = useState(false);
  const sessionRevokedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioFilesRef = useRef<PlayerAudioFile[]>([]);
  // A.3: Session ended state
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionEndedDuringLateJoin, setSessionEndedDuringLateJoin] = useState(false);
  // C.15: Post-combat leaderboard + difficulty poll state
  const [combatStatsData, setCombatStatsData] = useState<{
    stats: CombatantStats[];
    encounterName: string;
    rounds: number;
    combatDuration: number;
  } | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  // B6: Full combat recap report for player "Spotify Wrapped" experience
  const [combatRecapReport, setCombatRecapReport] = useState<CombatReport | null>(null);
  // UX.18: transition screen after poll dismiss, before session:ended arrives
  const [awaitingSessionEnd, setAwaitingSessionEnd] = useState(false);
  // C.15-B: Poll aggregate results received from DM before session:ended
  const [pollResultsData, setPollResultsData] = useState<{
    avg: number;
    distribution: Record<number, number>;
    total_votes: number;
  } | null>(null);
  // A.6: Stores registration data for auto-join when DM starts combat
  const pendingRegistrationRef = useRef<{ name: string; initiative: number; hp: number | null; ac: number | null } | null>(null);
  const isRegisteredRef = useRef(isRegistered);
  const autoJoinInProgressRef = useRef(false);
  const activeRef = useRef(isActive);
  // Keep ref in sync
  useEffect(() => { isRegisteredRef.current = isRegistered; }, [isRegistered]);
  useEffect(() => { activeRef.current = active; }, [active]);
  // Resilient reconnection state
  const [reconnectingAs, setReconnectingAs] = useState<string | null>(null);
  const [sessionRevoked, setSessionRevoked] = useState(false);
  // DM presence — tracks whether the DM has heartbeated recently (< 45s)
  const [dmOffline, setDmOffline] = useState(false);
  const dmLastSeenRef = useRef<number>(Date.now());
  const hiddenAtRef = useRef<number | null>(null);
  const heartbeatRef = useRef<(() => Promise<void>) | null>(null);
  // F-41: Spell slots state — local tracking with debounced save to player_characters
  const [characterSpellSlots, setCharacterSpellSlots] = useState<Record<string, { max: number; used: number }> | null>(null);
  const spellSlotSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveTokenIdRef = useRef(tokenId);
  const registeredNameRef = useRef<string | undefined>(undefined);
  useEffect(() => { effectiveTokenIdRef.current = effectiveTokenId; }, [effectiveTokenId]);
  useEffect(() => { registeredNameRef.current = registeredName; }, [registeredName]);

  // --- Optimistic ACK system: track pending player actions awaiting DM confirmation ---
  // channelRef is declared further down (after auth init) — resendBroadcast uses a ref-based
  // access pattern so the useCallback doesn't need channelRef in its deps.
  const resendBroadcastRef = useRef<(event: string, payload: Record<string, unknown>) => boolean>(() => false);
  const resendBroadcast = useCallback((event: string, payload: Record<string, unknown>): boolean => {
    return resendBroadcastRef.current(event, payload);
  }, []);

  const handleActionFailed = useCallback((action: import("@/lib/stores/pending-actions-store").PendingAction) => {
    // Rollback: revert optimistic update using snapshot
    if (action.rollbackSnapshot && action.combatantId) {
      updateCombatants((prev) =>
        prev.map((c) => {
          if (c.id !== action.combatantId) return c;
          return { ...c, ...action.rollbackSnapshot };
        })
      );
    }
  }, []);

  const { startAckTimer, cancelAckTimer, getCombatantPendingStatus } = useActionAck({
    resendBroadcast,
    onActionFailed: handleActionFailed,
    t: tRef.current,
  });

  // Pending state for the player's own combatant — drives visual feedback
  const [pendingState, setPendingState] = useState<CombatantPendingState>({});
  useEffect(() => {
    // Subscribe to pending actions store changes
    const unsub = usePendingActionsStore.subscribe(() => {
      // Find the player's own combatant
      const own = combatantsRef.current.find((c) => {
        if (!c.is_player) return false;
        if (c.session_token_id && c.session_token_id === effectiveTokenIdRef.current) return true;
        if (registeredNameRef.current && c.name === registeredNameRef.current) return true;
        return false;
      });
      if (own) {
        setPendingState(getCombatantPendingStatus(own.id));
      }
    });
    return unsub;
  }, [getCombatantPendingStatus]);

  // Clear pending actions on combat end
  useEffect(() => {
    if (!active) usePendingActionsStore.getState().clear();
  }, [active]);

  // Generate signed URLs for a list of audio files (shared by initial fetch + refresh)
  const generateSignedUrls = useCallback(async (files: PlayerAudioFile[]): Promise<Record<string, string>> => {
    const supabase = createClient();
    const urls: Record<string, string> = {};
    for (const file of files) {
      try {
        const { data: signedData } = await supabase.storage
          .from("player-audio")
          .createSignedUrl(file.file_path, 3600);
        if (signedData?.signedUrl) urls[file.id] = signedData.signedUrl;
      } catch { /* skip failed */ }
    }
    return urls;
  }, []);

  // Schedule URL refresh 50 minutes from now (10 min before 1h expiry)
  const scheduleUrlRefresh = useCallback((files: PlayerAudioFile[], retryCount = 0) => {
    if (audioRefreshTimerRef.current) clearTimeout(audioRefreshTimerRef.current);
    const REFRESH_MS = 50 * 60 * 1000; // 50 minutes
    audioRefreshTimerRef.current = setTimeout(async () => {
      try {
        const urls = await generateSignedUrls(files);
        if (Object.keys(urls).length > 0) {
          setPlayerAudioUrls(urls);
          useAudioStore.getState().updatePlayerAudioUrls(urls);
          // Schedule next refresh cycle
          scheduleUrlRefresh(files);
        } else if (retryCount < 3) {
          // Retry after 60s on empty result
          setTimeout(() => scheduleUrlRefresh(files, retryCount + 1), 60_000);
        }
      } catch {
        if (retryCount < 3) {
          setTimeout(() => scheduleUrlRefresh(files, retryCount + 1), 60_000);
        }
      }
    }, REFRESH_MS);
  }, [generateSignedUrls]);

  // Fetch player's custom audio files (authenticated players only)
  useEffect(() => {
    let cancelled = false;
    async function fetchPlayerAudio() {
      try {
        const res = await fetch("/api/player-audio");
        if (!res.ok) return; // 401 for anonymous — expected
        const { data } = await res.json();
        if (!cancelled && data) {
          const files = data as PlayerAudioFile[];
          setPlayerAudioFiles(files);
          audioFilesRef.current = files;
          if (files.length > 0) {
            setIsLoadingAudioUrls(true);
            const urls = await generateSignedUrls(files);
            if (!cancelled) {
              setPlayerAudioUrls(urls);
              setIsLoadingAudioUrls(false);
              // Sync to audio store (single source of truth — no dual preload)
              useAudioStore.getState().updatePlayerAudioUrls(urls);
              // Schedule auto-refresh before expiry
              scheduleUrlRefresh(files);
            }
          }
        }
      } catch {
        // Silent — audio is best-effort
        setIsLoadingAudioUrls(false);
      }
    }
    if (authReady) fetchPlayerAudio();
    return () => {
      cancelled = true;
      if (audioRefreshTimerRef.current) clearTimeout(audioRefreshTimerRef.current);
    };
  }, [authReady, generateSignedUrls, scheduleUrlRefresh]);

  // Hydrate audio favorites store (works for both anon and auth)
  useEffect(() => {
    if (!authReady) return;
    async function hydrateFavorites() {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      const isRealAuth = !!u && !u.is_anonymous;
      useFavoritesStore.getState().hydrate(isRealAuth);
    }
    hydrateFavorites();
  }, [authReady]);

  // Mesa model: seed session DM plan into subscription store
  useEffect(() => {
    useSubscriptionStore.getState().setSessionDmPlan(dmPlan);
    return () => {
      useSubscriptionStore.getState().setSessionDmPlan(null);
    };
  }, [dmPlan]);

  // Anonymous auth + claim token via server action (bypasses RLS)
  // ORDER (Winston): auth first -> storage reconnect -> claim fallback
  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      const saved = loadPlayerIdentity(sessionId);

      // P-06: check cancelled before any state update (even sync ones)
      if (cancelled) return;

      // Show skeleton immediately if we have stored identity (Sally: no blank screen)
      if (saved?.playerName) {
        setReconnectingAs(saved.playerName);
      }

      // IG-01: 5s cap on skeleton visibility — if reconnect takes longer, fall through to form
      // (distinct from the 8s rejoin timeout; this is purely a UX cap)
      let skeletonTimedOut = false;
      const skeletonTimer = saved?.playerName
        ? setTimeout(() => {
            skeletonTimedOut = true;
            if (!cancelled) setReconnectingAs(null);
          }, 5000)
        : null;

      try {
        const supabase = createClient();

        // Timeout guard — iOS WebKit can hang on auth calls indefinitely
        const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Auth timeout")), ms)
            ),
          ]) as Promise<T>;

        // STEP 1: Resolve auth (getSession or signInAnonymously)
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 8000) as { data: { session: import("@supabase/supabase-js").Session | null } };

        let userId: string;
        if (!session) {
          const { data, error: authError } = await withTimeout(
            supabase.auth.signInAnonymously(),
            10000
          ) as { data: { user: import("@supabase/supabase-js").User | null }; error: Error | null };
          if (authError) throw new Error(`anon-auth: ${authError.message}`);
          if (!data.user) throw new Error("anon-auth: no user returned");
          userId = data.user.id;
        } else {
          userId = session.user.id;
        }
        if (!cancelled) setAuthUserId(userId);

        // STEP 2: If we have stored identity, try fast reconnect (8s timeout — Amelia)
        if (saved?.tokenId && saved?.playerName && !skeletonTimedOut) {
          try {
            const { tokenId: rejoinedId } = await withTimeout(
              rejoinAsPlayer(sessionId, saved.playerName, userId),
              8000
            );

            if (skeletonTimer) clearTimeout(skeletonTimer);
            if (!cancelled) {
              setEffectiveTokenId(rejoinedId);
              setIsRegistered(true);
              setRegisteredName(saved.playerName);
              setReconnectingAs(null);
              persistPlayerIdentity(sessionId, rejoinedId, saved.playerName);
              setAuthReady(true);
              trackEvent("player:reconnected", { session_id: sessionId, method: "stored_identity" });
            }
            return; // Reconnect successful — skip claimPlayerToken
          } catch {
            // Reconnect failed (token revoked, session expired, timeout, impersonation guard)
            clearPlayerIdentity(sessionId);
            if (skeletonTimer) clearTimeout(skeletonTimer);
            if (!cancelled) setReconnectingAs(null);
          }
        } else if (skeletonTimer) {
          clearTimeout(skeletonTimer);
        }

        // STEP 3: Normal flow — claimPlayerToken
        const { tokenId: claimedTokenId, playerName } = await withTimeout(claimPlayerToken(tokenId, userId), 10000);
        if (!cancelled) {
          setEffectiveTokenId(claimedTokenId);
          // Same-device reconnect: player already registered on this token
          if (playerName) {
            setIsRegistered(true);
            setRegisteredName(playerName);
            persistPlayerIdentity(sessionId, claimedTokenId, playerName);
          }
          setReconnectingAs(null);
          setAuthReady(true);
        }
      } catch (err) {
        if (skeletonTimer) clearTimeout(skeletonTimer);
        captureError(err instanceof Error ? err : new Error(String(err)), {
          component: "PlayerJoinClient",
          action: "initAuth",
          category: "auth",
          extra: { tokenId },
        });
        if (!cancelled) {
          setReconnectingAs(null);
          setError(tRef.current("connection_error_detail"));
        }
      }
    };
    initAuth();
    return () => { cancelled = true; };
  }, [tokenId, sessionId]);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  // Wire up resendBroadcast now that channelRef exists
  resendBroadcastRef.current = (event: string, payload: Record<string, unknown>): boolean => {
    const ch = channelRef.current;
    if (!ch || connectionStatus !== "connected") return false;
    ch.send({ type: "broadcast", event, payload });
    return true;
  };
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const reconnectBackoffRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref to createChannel — lets the visibility handler reuse the full channel setup
  const createChannelRef = useRef<(() => void) | null>(null);

  // A.3: Centralized timer cleanup — used on session:ended and useEffect cleanup
  const clearAllTimers = useCallback(() => {
    if (turnPollRef.current) { clearInterval(turnPollRef.current); turnPollRef.current = null; }
    if (pollIntervalRef.current) { clearTimeout(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (pollFallbackTimerRef.current) { clearTimeout(pollFallbackTimerRef.current); pollFallbackTimerRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (connectionTimerRef.current) { clearTimeout(connectionTimerRef.current); connectionTimerRef.current = null; }
    if (lateJoinTimeoutRef.current) { clearTimeout(lateJoinTimeoutRef.current); lateJoinTimeoutRef.current = null; }
    if (lateJoinMaxTimeoutRef.current) { clearTimeout(lateJoinMaxTimeoutRef.current); lateJoinMaxTimeoutRef.current = null; }
    if (hpDeltaTimerRef.current) { clearTimeout(hpDeltaTimerRef.current); hpDeltaTimerRef.current = null; }
    if (sessionRevokedTimerRef.current) { clearTimeout(sessionRevokedTimerRef.current); sessionRevokedTimerRef.current = null; }
    if (audioRefreshTimerRef.current) { clearTimeout(audioRefreshTimerRef.current); audioRefreshTimerRef.current = null; }
    if (rejoinRetryTimerRef.current) { clearTimeout(rejoinRetryTimerRef.current); rejoinRetryTimerRef.current = null; }
    if (sessionEndedUnsubTimerRef.current) { clearTimeout(sessionEndedUnsubTimerRef.current); sessionEndedUnsubTimerRef.current = null; }
    if (spellSlotSaveTimerRef.current) { clearTimeout(spellSlotSaveTimerRef.current); spellSlotSaveTimerRef.current = null; }
    if (deathSaveResolutionTimerRef.current) { clearTimeout(deathSaveResolutionTimerRef.current); deathSaveResolutionTimerRef.current = null; }
  }, []);

  // C.15: Send poll vote to DM via broadcast + persist to encounter_votes for auth players (F-42)
  const handlePollVote = useCallback((vote: 1 | 2 | 3 | 4 | 5) => {
    const ch = channelRef.current;
    if (!ch || connectionStatus !== "connected") return;
    ch.send({
      type: "broadcast",
      event: "player:poll_vote",
      payload: { player_name: registeredName, vote },
    });
    // F-42: Auth players persist their vote individually so late-vote RPC has correct data
    const eid = encounterIdRef.current;
    if (campaignId && eid) {
      const supabase = createClient();
      supabase.rpc("cast_late_vote", { p_encounter_id: eid, p_vote: vote }).then(() => {
        // Non-fatal — realtime aggregate is the primary path, this is best-effort
      });
    }
  }, [connectionStatus, registeredName, campaignId]);

  // M3: Safety timeout — if session:ended never arrives after 30s, force session ended state
  useEffect(() => {
    if (!awaitingSessionEnd || sessionEnded) return;
    const timer = setTimeout(() => {
      clearPlayerIdentity(sessionId);
      setSessionEnded(true);
    }, 30_000);
    return () => clearTimeout(timer);
  }, [awaitingSessionEnd, sessionEnded, sessionId]);

  // A.4: Reset late-join state for retry without page reload
  const resetLateJoinState = useCallback(() => {
    if (lateJoinTimeoutRef.current) { clearTimeout(lateJoinTimeoutRef.current); lateJoinTimeoutRef.current = null; }
    if (lateJoinMaxTimeoutRef.current) { clearTimeout(lateJoinMaxTimeoutRef.current); lateJoinMaxTimeoutRef.current = null; }
    lateJoinRequestIdRef.current = null;
    lateJoinRegisteredRef.current = false;
    lateJoinFinalStatusRef.current = false;
    // Keep lateJoinDataRef so the form can pre-fill on retry
    lateJoinRetryCountRef.current += 1;
    setLateJoinStatus("idle");
    setLateJoinDeadline(null);
  }, []);

  // A.1: Connection state machine — coordinates polling vs realtime
  type ConnectionState = "CONNECTED" | "RECONNECTING" | "POLLING_FALLBACK";
  const connStateRef = useRef<ConnectionState>("RECONNECTING");
  const pollBackoffRef = useRef(2000);
  // Ref to fetchFullState — breaks circular dependency (fetchFullState defined later).
  // S3.5: ref-based callers below pass `priority: "emergency"` for recovery
  // paths (POLLING_FALLBACK loop, channel revive). Throttled/background calls
  // go through the direct `fetchFullState(...)` invocation.
  const fetchFullStateRef = useRef<(
    eid: string,
    opts?: { priority?: FetchPriority; caller?: string },
  ) => Promise<void>>(async () => {});

  const stopAllPolling = useCallback(() => {
    if (pollIntervalRef.current) { clearTimeout(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (pollFallbackTimerRef.current) { clearTimeout(pollFallbackTimerRef.current); pollFallbackTimerRef.current = null; }
  }, []);

  const startPollingWithBackoff = useCallback((eid: string | null) => {
    if (!eid) return;
    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    pollBackoffRef.current = 2000;
    const schedule = () => {
      pollIntervalRef.current = setTimeout(() => {
        if (connStateRef.current !== "POLLING_FALLBACK") return;
        // S3.5: POLLING_FALLBACK means the channel is dead — bypass throttle
        fetchFullStateRef.current(eid, { priority: "emergency", caller: "polling_fallback" });
        pollBackoffRef.current = Math.min(pollBackoffRef.current * 2, 30000);
        schedule();
      }, pollBackoffRef.current);
    };
    if (connStateRef.current === "POLLING_FALLBACK") {
      fetchFullStateRef.current(eid, { priority: "emergency", caller: "polling_fallback_kickoff" });
    }
    schedule();
  }, []);

  const transitionTo = useCallback((next: ConnectionState, reason?: string) => {
    const prev = connStateRef.current;
    if (prev === next) return;
    console.debug(`[PocketDM:conn] ${prev} -> ${next}${reason ? ` (${reason})` : ""}`);
    connStateRef.current = next;
    if (next === "CONNECTED") {
      stopAllPolling();
      pollBackoffRef.current = 2000;
      // S3.5: circuit breaker reset is handled by the orchestrator itself —
      // a successful emergency fetch after SUBSCRIBED will close the circuit.
    }
    if (next === "POLLING_FALLBACK") {
      startPollingWithBackoff(encounterIdRef.current);
    }
  }, [stopAllPolling, startPollingWithBackoff]);

  // Combat log helpers
  const addLogEntry = useCallback((text: string, type: CombatLogEntry["type"]) => {
    setCombatLog((prev) => {
      const next = [...prev, { text, timestamp: Date.now(), type }];
      return next.length > 20 ? next.slice(-20) : next;
    });
  }, []);

  const detectHpChanges = useCallback((prevList: PlayerCombatant[], nextList: PlayerCombatant[]) => {
    for (const next of nextList) {
      const prev = prevList.find((c) => c.id === next.id);
      if (!prev) continue;
      const diff = (next.current_hp ?? 0) - (prev.current_hp ?? 0);
      if (diff < 0) {
        addLogEntry(tRef.current("log_damage", { name: next.name, value: Math.abs(diff) }), "damage");
      } else if (diff > 0) {
        addLogEntry(tRef.current("log_heal", { name: next.name, value: diff }), "heal");
      }
    }
  }, [addLogEntry]);

  const detectConditionChanges = useCallback((prevList: PlayerCombatant[], nextList: PlayerCombatant[]) => {
    for (const next of nextList) {
      const prev = prevList.find((c) => c.id === next.id);
      if (!prev) continue;
      const added = next.conditions.filter((c) => !prev.conditions.includes(c));
      const removed = prev.conditions.filter((c) => !next.conditions.includes(c));
      for (const cond of added) {
        addLogEntry(tRef.current("log_condition_add", { name: next.name, condition: cond }), "condition");
      }
      for (const cond of removed) {
        addLogEntry(tRef.current("log_condition_remove", { name: next.name, condition: cond }), "condition");
      }
    }
  }, [addLogEntry]);

  const updateCombatants = useCallback((updater: PlayerCombatant[] | ((prev: PlayerCombatant[]) => PlayerCombatant[])) => {
    setCombatants((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      detectHpChanges(prev, next);
      detectConditionChanges(prev, next);
      combatantsRef.current = next;
      return next;
    });
  }, [detectHpChanges, detectConditionChanges]);

  const updateTurnIndex = useCallback((newIndex: number) => {
    setTurnIndex((prev) => {
      if (prev !== newIndex) {
        const current = combatantsRef.current[newIndex];
        if (current) {
          addLogEntry(tRef.current("log_turn", { name: current.name }), "turn");
        }
      }
      turnIndexRef.current = newIndex;
      return newIndex;
    });
  }, [addLogEntry]);

  // C.13: Player HP self-management — broadcast to DM + optimistic local update
  const handleHpAction = useCallback((combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => {
    const ch = channelRef.current;
    if (!ch || connectionStatus !== "connected") {
      toast.error(tRef.current("sync_offline"));
      return;
    }

    // Snapshot for rollback
    const existing = combatantsRef.current.find((c) => c.id === combatantId);
    const rollbackSnapshot = existing
      ? { current_hp: existing.current_hp, temp_hp: existing.temp_hp }
      : undefined;

    // P1-fix: pre-generate action_id so it's stored in payload for retry
    const actionId = generateActionId();
    const broadcastPayload = {
      player_name: registeredName,
      combatant_id: combatantId,
      action,
      amount,
      sender_token_id: effectiveTokenId,
      action_id: actionId,
    };
    usePendingActionsStore.getState().addAction({
      id: actionId,
      type: "hp",
      combatantId,
      timestamp: Date.now(),
      payload: broadcastPayload,
      rollbackSnapshot,
    });

    // Broadcast to DM
    ch.send({ type: "broadcast", event: "player:hp_action", payload: broadcastPayload });
    startAckTimer(actionId, "player:hp_action");

    // Optimistic local update with temp HP absorption
    hpActionOptimisticRef.current = Date.now();
    lastHpActionCombatantRef.current = combatantId; // P1.03: track affected combatant
    updateCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        if (action === "damage") {
          let remaining = amount;
          let newTempHp = c.temp_hp ?? 0;
          if (newTempHp > 0) {
            const absorbed = Math.min(newTempHp, remaining);
            newTempHp -= absorbed;
            remaining -= absorbed;
          }
          return { ...c, current_hp: Math.max(0, (c.current_hp ?? 0) - remaining), temp_hp: newTempHp };
        }
        if (action === "heal") {
          // P1.07: skip optimistic if max_hp unknown — avoids capping to 0
          if (c.max_hp == null) return c;
          return { ...c, current_hp: Math.min(c.max_hp, (c.current_hp ?? 0) + amount) };
        }
        if (action === "temp_hp") {
          return { ...c, temp_hp: Math.min(9999, Math.max(c.temp_hp ?? 0, amount)) };
        }
        return c;
      })
    );
  }, [connectionStatus, registeredName, updateCombatants, startAckTimer]);

  // F-41: Initialize spell slots from prefilledCharacters when a matching character is registered
  // Called once when registeredName is resolved (via registration or reconnect)
  useEffect(() => {
    if (!registeredName || !prefilledCharacters) return;
    const match = prefilledCharacters.find((c) => c.name === registeredName);
    if (match?.spell_slots && Object.keys(match.spell_slots).length > 0) {
      setCharacterSpellSlots(match.spell_slots);
    }
  }, [registeredName, prefilledCharacters]);

  // F-41: Persist spell slots to DB (debounced helper)
  const saveSpellSlotsToDb = useCallback((slots: Record<string, { max: number; used: number }>) => {
    if (!registeredName || !prefilledCharacters) return;
    const match = prefilledCharacters.find((c) => c.name === registeredName);
    if (!match) return;
    const supabase = createClient();
    supabase
      .from("player_characters")
      .update({ spell_slots: slots })
      .eq("id", match.id)
      .then(() => {});
  }, [registeredName, prefilledCharacters]);

  // F-41: Toggle a spell slot dot — debounced save to DB
  const handleToggleSlot = useCallback((level: string, slotIndex: number) => {
    setCharacterSpellSlots((prev) => {
      if (!prev) return prev;
      const slot = prev[level];
      if (!slot) return prev;
      const isUsed = slotIndex >= slot.max - slot.used;
      const newUsed = isUsed ? Math.max(0, slot.used - 1) : Math.min(slot.max, slot.used + 1);
      return { ...prev, [level]: { ...slot, used: newUsed } };
    });
    // Side effect outside state updater — debounced save
    if (spellSlotSaveTimerRef.current) clearTimeout(spellSlotSaveTimerRef.current);
    spellSlotSaveTimerRef.current = setTimeout(() => {
      spellSlotSaveTimerRef.current = null;
      // Read latest state at save time
      setCharacterSpellSlots((current) => {
        if (current) saveSpellSlotsToDb(current);
        return current; // no mutation
      });
    }, 300);
  }, [saveSpellSlotsToDb]);

  // F-41: Long Rest — reset all spell slots to full and save immediately
  const handleLongRest = useCallback(() => {
    setCharacterSpellSlots((prev) => {
      if (!prev) return prev;
      return Object.fromEntries(
        Object.entries(prev).map(([level, slot]) => [level, { ...slot, used: 0 }])
      );
    });
    // Immediate save — read latest after state update via microtask
    queueMicrotask(() => {
      setCharacterSpellSlots((current) => {
        if (current) saveSpellSlotsToDb(current);
        return current;
      });
    });
  }, [saveSpellSlotsToDb]);

  // Full state fetch via API — used on reconnect & polling fallback.
  // Uses /api/session/[id]/state which sanitizes monster data server-side.
  //
  // S3.5 (2026-04-17): the transport layer (throttle, dedup, in-flight coalescing,
  // circuit breaker, 401 recovery hook) is now owned by `fetchOrchestrator`.
  // fetchFullState itself is only responsible for mapping the envelope back
  // into component state (round/turn/combatants/dm_plan + auto-join fallback).
  //
  // `opts.caller` is REQUIRED in new call-sites — it drives telemetry and dedup.
  // `opts.priority` replaces the legacy "throttled"/"emergency" pair with the
  // full 4-tier vocabulary (emergency / high / throttled / background).
  const fetchFullState = useCallback(async (
    _eid: string,
    opts: { priority?: FetchPriority; caller?: string } = {},
  ) => {
    const priority: FetchPriority = opts.priority ?? "throttled";
    const caller = opts.caller ?? "legacy_unlabelled";

    const data = await fetchOrchestrator.fetch({
      encounterId: sessionId,
      priority,
      caller,
    });
    // Null = dropped (throttle / dedup / circuit) or network failure.
    // No side effects — the caller already has recent data or will retry on
    // the next tick.
    if (!data) return;

    if (data.encounter) {
      const enc = data.encounter as {
        round_number?: number;
        current_turn_index?: number;
        is_active?: boolean;
        id?: string;
      };
      setRound(enc.round_number ?? 1);
      updateTurnIndex(enc.current_turn_index ?? 0);
      setActive(enc.is_active ?? false);
      if (enc.id) setCurrentEncounterId(enc.id);
    }
    if (data.combatants) {
      // Preserve optimistic death saves for 5s after player click
      const isDeathSaveProtected = Date.now() - deathSaveOptimisticRef.current < 5000;
      // C.13: Preserve optimistic HP action for 5s after player self-report
      const isHpActionProtected = Date.now() - hpActionOptimisticRef.current < 5000;
      // B3: Preserve optimistic conditions for 5s after broadcast
      const isConditionProtected = Date.now() - conditionOptimisticRef.current < 5000;
      // Preserve optimistic reaction for 5s after toggle
      const isReactionProtected = Date.now() - lastReactionToggleRef.current < 5000;
      // ALWAYS merge local state for runtime-only fields (reaction_used is not in DB)
      updateCombatants((prev) => {
        const serverList = data.combatants as PlayerCombatant[];
        return serverList.map((sc) => {
          const local = prev.find((lc) => lc.id === sc.id);
          let merged = sc;
          // reaction_used is runtime-only (not in DB) — always preserve from local state
          // Also protect during 5s window after optimistic toggle
          if (local && typeof local.reaction_used === "boolean" && (sc.reaction_used === undefined || isReactionProtected)) {
            merged = { ...merged, reaction_used: local.reaction_used };
          }
          // Preserve optimistic death saves
          if (isDeathSaveProtected && local?.death_saves && sc.death_saves) {
            const localTotal = (local.death_saves.successes ?? 0) + (local.death_saves.failures ?? 0);
            const serverTotal = (sc.death_saves.successes ?? 0) + (sc.death_saves.failures ?? 0);
            if (localTotal > serverTotal) {
              merged = { ...merged, death_saves: local.death_saves };
            }
          }
          // P1.03: Preserve optimistic HP only for the specific combatant that was acted on
          if (isHpActionProtected && local && sc.id === lastHpActionCombatantRef.current) {
            merged = { ...merged, current_hp: local.current_hp, temp_hp: local.temp_hp };
          }
          // B3: Preserve conditions from broadcast over potentially stale server data
          if (isConditionProtected && local?.conditions) {
            merged = { ...merged, conditions: local.conditions, condition_durations: local.condition_durations };
          }
          return merged;
        });
      });
    }
    // Mesa model: update DM plan from API response
    if (data.dm_plan) {
      useSubscriptionStore.getState().setSessionDmPlan(
        (["free","pro","mesa"].includes(data.dm_plan as string) ? (data.dm_plan as string) : "free") as Plan
      );
    }
    // A.6: Auto-join fallback via polling — same logic as state_sync handler.
    // auto_join:detected: no fetch required here — this branch runs as a
    // side-effect of an already-orchestrated fetchFullState response, and the
    // recovery action is a registerPlayerCombatant() call (separate code flow,
    // not routed through fetchOrchestrator). The triggering fetch is labelled
    // by its own caller (e.g. turn_poll / late_join:* / visibility_change:*).
    const enc = data.encounter as
      | { is_active?: boolean; id?: string }
      | null
      | undefined;
    if (
      enc?.is_active &&
      enc?.id &&
      Array.isArray(data.combatants) &&
      (data.combatants as PlayerCombatant[]).length > 0 &&
      isRegisteredRef.current &&
      pendingRegistrationRef.current &&
      !autoJoinInProgressRef.current
    ) {
      const regName = pendingRegistrationRef.current.name;
      const tokenId = effectiveTokenIdRef.current;
      // B3: Match by session_token_id first (ID-based), then fallback to name
      const alreadyIn = (data.combatants as PlayerCombatant[]).some(
        (c) => c.is_player && (c.session_token_id === tokenId || c.name === regName)
      );
      if (!alreadyIn) {
        autoJoinInProgressRef.current = true;
        registerPlayerCombatant(effectiveTokenId, sessionId, pendingRegistrationRef.current)
          .then(() => { autoJoinInProgressRef.current = false; pendingRegistrationRef.current = null; })
          .catch(() => { autoJoinInProgressRef.current = false; });
      }
    }
  }, [sessionId, updateTurnIndex, updateCombatants, effectiveTokenId]);

  // S3.5: wire the 401 auth-refresh hook into the orchestrator.
  // MUST use refreshSession() (not signInAnonymously) to preserve the anon_user_id
  // that's linked to the session_token in the DB.
  useEffect(() => {
    fetchOrchestrator.setUnauthorizedHandler(async () => {
      try {
        const supabase = createClient();
        const { error: refreshError } = await supabase.auth.refreshSession();
        return !refreshError;
      } catch {
        return false;
      }
    });
    // Do not null the orchestrator's handler in cleanup — under StrictMode's
    // mount→unmount→mount sequence that creates a window where concurrent
    // 401s would fail to recover. The next mount overwrites with its own.
  }, []);

  // A.1: Keep ref in sync for state machine polling
  fetchFullStateRef.current = fetchFullState;

  // Subscribe to realtime channel for combat updates
  useEffect(() => {
    if (!authReady || !sessionId) return;

    const supabase = createClient();
    supabaseRef.current = supabase;

    function createChannel() {
      createChannelRef.current = createChannel;
      const channel = supabase.channel(`session:${sessionId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "session:state_sync" }, ({ payload }: { payload: SanitizedStateSync & { _seq?: number } }) => {
          // DESYNC-FIX-2: state_sync is the full truth — ALWAYS reset sequence counter.
          // After DM refresh, _broadcastSeq resets to 0. If we only update lastSeqRef when
          // seq > 0, the player keeps the old high-water mark (e.g. 50) and drops all new
          // events (seq 1, 2, 3...) as "stale" for up to 30s until the next state_sync.
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          lastSeqRef.current = seq;

          if (payload.combatants) updateCombatants(payload.combatants);
          if (payload.round_number !== undefined) setRound(payload.round_number);
          if (payload.current_turn_index !== undefined) updateTurnIndex(payload.current_turn_index);
          setNextCombatantId(null);
          // DM sent a broadcast — they're clearly alive
          dmLastSeenRef.current = Date.now();
          setDmOffline(false);
          // state_sync means combat is active — update state to exit lobby
          // Fire on every inactive→active transition (handles multiple combats per session,
          // skips reconnection to live combat because activeRef will already be true)
          if (!activeRef.current) {
            trackEvent("player:combat_started", {
              mode: isRegisteredRef.current ? "auth" : "anon",
              source: campaignId ? "/invite" : "/join",
              combatant_count: payload.combatants?.length ?? 0,
            });
          }
          setActive(true);
          if (payload.encounter_id) setCurrentEncounterId(payload.encounter_id);
          // A.6: Auto-register player when DM starts combat
          // Guard: only on combat start (combatants non-empty + encounter_id present)
          if (
            payload.encounter_id &&
            payload.combatants?.length > 0 &&
            isRegisteredRef.current &&
            pendingRegistrationRef.current &&
            !autoJoinInProgressRef.current
          ) {
            const regName = pendingRegistrationRef.current.name;
            const tokenId = effectiveTokenIdRef.current;
            // B3: Match by session_token_id first (ID-based), then fallback to name
            const alreadyInCombatants = payload.combatants.some(
              (c: PlayerCombatant) => c.is_player && (c.session_token_id === tokenId || c.name === regName)
            );
            if (!alreadyInCombatants) {
              autoJoinInProgressRef.current = true;
              registerPlayerCombatant(effectiveTokenId, sessionId, pendingRegistrationRef.current)
                .then(() => { autoJoinInProgressRef.current = false; pendingRegistrationRef.current = null; })
                .catch(() => { autoJoinInProgressRef.current = false; });
            }
          }
        })
        .on("broadcast", { event: "combat:turn_advance" }, ({ payload }: { payload: RealtimeTurnAdvance & { _seq?: number } }) => {
          // Discard out-of-order turn advances using broadcast sequence number
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;

          lastTurnBroadcastRef.current = Date.now();
          dmLastSeenRef.current = Date.now();
          setDmOffline(false);
          if (payload.current_turn_index !== undefined) {
            updateTurnIndex(payload.current_turn_index);
            // Reset reaction for the combatant whose turn is starting
            updateCombatants((prev) =>
              prev.map((c, i) =>
                i === payload.current_turn_index ? { ...c, reaction_used: false } : c
              )
            );
          }
          if (payload.round_number !== undefined) setRound(payload.round_number);
          setNextCombatantId(payload.next_combatant_id ?? null);
        })
        .on("broadcast", { event: "combat:hp_update" }, ({ payload }: { payload: { combatant_id: string; current_hp?: number; temp_hp?: number; max_hp?: number; hp_status?: string; hp_percentage?: number; death_saves?: { successes: number; failures: number }; _seq?: number } }) => {
          // Discard out-of-order HP updates using broadcast sequence number
          const hpSeq = typeof payload._seq === "number" ? payload._seq : 0;
          if (hpSeq > 0 && hpSeq <= lastSeqRef.current) return;
          if (hpSeq > 0) lastSeqRef.current = hpSeq;

          // ACK: DM re-broadcast confirms our pending HP/death_save actions
          if (payload.combatant_id) {
            confirmActionsForCombatant(payload.combatant_id, "hp");
            if (payload.death_saves) {
              confirmActionsForCombatant(payload.combatant_id, "death_save");
            }
          }

          if (payload.combatant_id) {
            // HP delta visual feedback — calculate before updating state
            const existing = combatantsRef.current.find((c) => c.id === payload.combatant_id);
            if (existing && payload.current_hp !== undefined) {
              const prevHp = existing.current_hp ?? 0;
              const newHp = payload.current_hp;
              const delta = newHp - prevHp;
              const prevTemp = existing.temp_hp ?? 0;
              const newTemp = payload.temp_hp ?? 0;
              const tempDelta = newTemp - prevTemp;
              if (delta !== 0 || tempDelta !== 0) {
                if (hpDeltaTimerRef.current) clearTimeout(hpDeltaTimerRef.current);
                // Temp-only change (current_hp unchanged but temp_hp changed)
                const isTempOnly = delta === 0 && tempDelta !== 0;
                setHpDelta({
                  combatantId: payload.combatant_id,
                  delta: isTempOnly ? tempDelta : delta,
                  type: isTempOnly ? "temp" : delta < 0 ? "damage" : "heal",
                  timestamp: Date.now(),
                });
                hpDeltaTimerRef.current = setTimeout(() => setHpDelta(null), 1500);
              }
              // Clear "fallen" overlay when character is healed back above 0 HP
              if (newHp > 0 && (existing.current_hp ?? 0) === 0) {
                setDeathSaveResolution(null);
              }
            }
            // Detect death save resolution for dramatic feedback
            if (payload.death_saves) {
              const prev = combatantsRef.current.find((c) => c.id === payload.combatant_id);
              const prevSaves = prev?.death_saves;
              const wasResolved = prevSaves && (prevSaves.successes >= 3 || prevSaves.failures >= 3);
              if (!wasResolved) {
                if (payload.death_saves.successes >= 3) {
                  try {
                    const audio = new Audio("/sounds/sfx/healing.mp3");
                    audio.volume = 0.6;
                    audio.play().catch(() => {});
                  } catch { /* ignore */ }
                  navigator.vibrate?.([100, 50, 100, 50, 100]);
                  if (deathSaveResolutionTimerRef.current) clearTimeout(deathSaveResolutionTimerRef.current);
                  setDeathSaveResolution({ combatantId: payload.combatant_id, result: "stabilized", timestamp: Date.now() });
                  deathSaveResolutionTimerRef.current = setTimeout(() => setDeathSaveResolution(null), 3000);
                } else if (payload.death_saves.failures >= 3) {
                  try {
                    const audio = new Audio("/sounds/sfx/death.mp3");
                    audio.volume = 0.6;
                    audio.play().catch(() => {});
                  } catch { /* ignore */ }
                  navigator.vibrate?.([500]);
                  if (deathSaveResolutionTimerRef.current) clearTimeout(deathSaveResolutionTimerRef.current);
                  // "Fallen" is permanent — no auto-dismiss timer
                  setDeathSaveResolution({ combatantId: payload.combatant_id, result: "fallen", timestamp: Date.now() });
                }
              }
            }
            updateCombatants((prev) =>
              prev.map((c) => {
                if (c.id !== payload.combatant_id) return c;
                // Monster/NPC: only hp_status + hp_percentage are sent (no exact numbers)
                if (payload.hp_status && payload.current_hp === undefined) {
                  return { ...c, hp_status: payload.hp_status, hp_percentage: payload.hp_percentage };
                }
                // Player character: full HP data (including max_hp if changed)
                const updated = { ...c, current_hp: payload.current_hp, temp_hp: payload.temp_hp };
                if (payload.max_hp !== undefined) updated.max_hp = payload.max_hp;
                if (payload.death_saves !== undefined) updated.death_saves = payload.death_saves;
                return updated;
              })
            );
          }
        })
        .on("broadcast", { event: "combat:condition_change" }, ({ payload }: { payload: RealtimeConditionChange & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant_id) {
            // ACK: DM re-broadcast confirms our pending condition action
            confirmActionsForCombatant(payload.combatant_id, "condition");
            conditionOptimisticRef.current = Date.now();
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === payload.combatant_id
                  ? {
                      ...c,
                      conditions: payload.conditions,
                      ...(payload.condition_durations !== undefined && { condition_durations: payload.condition_durations }),
                    }
                  : c
              )
            );
          }
        })
        .on("broadcast", { event: "combat:reaction_toggle" }, ({ payload }: { payload: RealtimeReactionToggle & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          // ACK: DM re-broadcast confirms our pending reaction action
          if (payload.combatant_id) {
            confirmActionsForCombatant(payload.combatant_id, "reaction");
          }
          if (payload.combatant_id && typeof payload.reaction_used === "boolean") {
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === payload.combatant_id
                  ? { ...c, reaction_used: payload.reaction_used }
                  : c
              )
            );
          }
        })
        .on("broadcast", { event: "combat:defeated_change" }, ({ payload }: { payload: RealtimeDefeatedChange & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant_id) {
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === payload.combatant_id
                  ? { ...c, is_defeated: payload.is_defeated }
                  : c
              )
            );
          }
        })
        .on("broadcast", { event: "combat:combatant_add" }, ({ payload }: { payload: SanitizedCombatantAdd & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant) {
            updateCombatants((prev) => {
              const existingIndex = prev.findIndex((c) => c.id === payload.combatant.id);
              if (existingIndex !== -1) {
                // Dedup: merge incoming data over existing combatant (A.2)
                if (process.env.NODE_ENV !== "production") {
                  console.warn(`[PlayerJoinClient] Dedup: combatant_add for existing ID ${payload.combatant.id} — merging`);
                }
                return prev.map((c, i) => i === existingIndex ? { ...c, ...payload.combatant } : c);
              }
              return [...prev, payload.combatant];
            });
            // Detect late-join acceptance: DM added our player combatant
            if (lateJoinRequestIdRef.current && !lateJoinRegisteredRef.current &&
                payload.combatant.is_player &&
                payload.combatant.name === lateJoinDataRef.current?.name) {
              lateJoinRegisteredRef.current = true;
              lateJoinFinalStatusRef.current = true; // A.4: guard against timer overwrite
              if (lateJoinTimeoutRef.current) {
                clearTimeout(lateJoinTimeoutRef.current);
                lateJoinTimeoutRef.current = null;
              }
              if (lateJoinMaxTimeoutRef.current) {
                clearTimeout(lateJoinMaxTimeoutRef.current);
                lateJoinMaxTimeoutRef.current = null;
              }
              lateJoinRequestIdRef.current = null;
              setLateJoinStatus("accepted");
              setIsRegistered(true);
              setRegisteredName(payload.combatant.name);
              persistPlayerIdentity(sessionId, effectiveTokenId, payload.combatant.name);
              // Mark token with player_name only (combatant already created by DM)
              if (lateJoinDataRef.current) {
                markPlayerToken(effectiveTokenId, sessionId, lateJoinDataRef.current.name)
                  .catch(() => { /* Token may already be marked — ignore */ });
              }
              // CAT-1: Fetch full state to hydrate combat board after acceptance
              // S3.5: late-join acceptance is a recovery path — bypass throttle
              if (encounterIdRef.current) {
                fetchFullState(encounterIdRef.current, { priority: "emergency", caller: "late_join:cat_1" }).catch(() => { /* best-effort */ });
              }
            }
          }
        })
        .on("broadcast", { event: "combat:combatant_add_reorder" }, ({ payload }: { payload: SanitizedCombatantAddReorder & { _seq?: number } }) => {
          // S1.2: Atomic combatant add + reorder + turn_index update in a single
          // React state transaction. Replaces the legacy combatant_add + state_sync
          // pair that raced on the receiver due to broadcastViaServer's dual sender.
          //
          // This handler coexists with the legacy `combat:combatant_add` handler
          // during the rollout window (see sprint-plan-beta3-remediation.md S1.2).
          // Old DM clients keep emitting the pair; new DM clients (flag on) emit
          // only this event. Old player clients ignore this event (safe no-op).
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;

          if (!payload.combatant || !payload.initiative_map) return;

          const incoming = payload.combatant as PlayerCombatant;

          // B-1 FIX: Compute inconsistency SYNCHRONOUSLY against `combatantsRef.current`
          // BEFORE calling the state updater. React does not guarantee the updater runs
          // synchronously inside a supabase broadcast callback (which is outside the React
          // event system), so reading a flag set inside the updater may race. The ref is
          // always current; the reducer output is pure and idempotent.
          const currentIds = new Set(combatantsRef.current.map((c) => c.id));
          // B-2 FIX: Hidden placeholder IDs (prefixed "hidden:") are opaque slots — never
          // treat them as unknown/desync triggers. They represent DM combatants the player
          // must not see, but whose initiative slot preserves ordering.
          const inconsistencyDetected = payload.initiative_map.some((entry) => {
            if (entry.id === incoming.id) return false; // incoming will be present after insert
            if (entry.id.startsWith("hidden:")) return false; // opaque slot, not a miss
            return !currentIds.has(entry.id);
          });

          updateCombatants((prev) => {
            // 1. Insert or merge the new combatant (dedup mirrors the legacy handler).
            const existingIndex = prev.findIndex((c) => c.id === incoming.id);
            let next: PlayerCombatant[];
            if (existingIndex !== -1) {
              if (process.env.NODE_ENV !== "production") {
                console.warn(`[PlayerJoinClient] Dedup: combatant_add_reorder for existing ID ${incoming.id} — merging`);
              }
              next = prev.map((c, i) => (i === existingIndex ? { ...c, ...incoming } : c));
            } else {
              next = [...prev, incoming];
            }

            // 2. Apply the reorder by looking up each local combatant's new initiative_order.
            // Any ID in the map that isn't local (e.g. a hidden DM combatant we don't know about,
            // represented as a "hidden:" placeholder) is ignored for sorting. Any local ID
            // missing from the map retains its previous order.
            const orderById = new Map<string, number>();
            for (const entry of payload.initiative_map) {
              if (entry.initiative_order !== null) {
                orderById.set(entry.id, entry.initiative_order);
              }
            }

            const reordered = [...next].sort((a, b) => {
              const ao = orderById.get(a.id);
              const bo = orderById.get(b.id);
              // Fallback: combatants not in the map keep their relative order after known ones.
              if (ao === undefined && bo === undefined) {
                return (a.initiative_order ?? 0) - (b.initiative_order ?? 0);
              }
              if (ao === undefined) return 1;
              if (bo === undefined) return -1;
              return ao - bo;
            });

            // Write the new initiative_order back onto our local combatants so subsequent
            // state_sync / fetchFullState merges stay consistent.
            return reordered.map((c) => {
              const o = orderById.get(c.id);
              return o !== undefined ? { ...c, initiative_order: o } : c;
            });
          });

          // 3. Turn index + round — applied in the same synchronous tick so React
          // batches them with the combatants update above (single commit).
          if (typeof payload.current_turn_index === "number") {
            updateTurnIndex(payload.current_turn_index);
          }
          if (typeof payload.round_number === "number") {
            setRound(payload.round_number);
          }
          if (payload.encounter_id) {
            setCurrentEncounterId(payload.encounter_id);
          }
          // DM broadcast is a heartbeat signal.
          dmLastSeenRef.current = Date.now();
          setDmOffline(false);

          // 4. Fallback: if the initiative_map references IDs we don't have,
          // schedule an emergency fetchFullState. The orchestrator's dedup/coalesce
          // prevents storming the endpoint on rapid repeats.
          if (inconsistencyDetected) {
            trackEvent("combat:combatant_add_desync_detected", {
              encounter_id: payload.encounter_id,
            });
            const eid = encounterIdRef.current;
            if (eid) {
              // 500ms debounce to let any in-flight second combined event land first.
              setTimeout(() => {
                // S3.5 callers map: Finding 2 (desync critical) — emergency.
                fetchFullState(eid, { priority: "emergency", caller: "combat:combatant_add_reorder_fallback" })
                  .catch(() => { /* best-effort */ });
              }, 500);
            }
          }
        })
        .on("broadcast", { event: "combat:combatant_remove" }, ({ payload }: { payload: RealtimeCombatantRemove & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant_id) {
            updateCombatants((prev) => prev.filter((c) => c.id !== payload.combatant_id));
          }
        })
        .on("broadcast", { event: "combat:version_switch" }, ({ payload }: { payload: RealtimeVersionSwitch & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant_id) {
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === payload.combatant_id
                  ? { ...c, ruleset_version: payload.ruleset_version }
                  : c
              )
            );
          }
        })
        .on("broadcast", { event: "combat:stats_update" }, ({ payload }: { payload: SanitizedStatsUpdate & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant_id) {
            updateCombatants((prev) =>
              prev.map((c) => {
                if (c.id !== payload.combatant_id) return c;
                const updated = { ...c };
                // Only name changes come through — AC/HP/spell_save_dc are stripped by broadcast
                if (payload.name !== undefined) updated.name = payload.name;
                return updated;
              })
            );
          }
        })
        .on("broadcast", { event: "combat:player_notes_update" }, ({ payload }: { payload: RealtimePlayerNotesUpdate & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatant_id) {
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === payload.combatant_id
                  ? { ...c, player_notes: payload.player_notes }
                  : c
              )
            );
          }
        })
        .on("broadcast", { event: "combat:initiative_reorder" }, ({ payload }: { payload: SanitizedInitiativeReorder & { _seq?: number } }) => {
          const seq = typeof payload._seq === "number" ? payload._seq : 0;
          if (seq > 0 && seq <= lastSeqRef.current) return;
          if (seq > 0) lastSeqRef.current = seq;
          if (payload.combatants) {
            updateCombatants(payload.combatants);
          }
          if (payload.current_turn_index !== undefined) {
            updateTurnIndex(payload.current_turn_index);
          }
        })
        .on("broadcast", { event: "combat:late_join_response" }, ({ payload }: { payload: RealtimeLateJoinResponse }) => {
          if (payload.request_id !== lateJoinRequestIdRef.current) return;
          // Clear timeouts since DM responded
          if (lateJoinTimeoutRef.current) {
            clearTimeout(lateJoinTimeoutRef.current);
            lateJoinTimeoutRef.current = null;
          }
          if (lateJoinMaxTimeoutRef.current) {
            clearTimeout(lateJoinMaxTimeoutRef.current);
            lateJoinMaxTimeoutRef.current = null;
          }
          if (payload.accepted && !lateJoinRegisteredRef.current) {
            lateJoinRegisteredRef.current = true;
            lateJoinFinalStatusRef.current = true; // A.4: guard against timer overwrite
            lateJoinRequestIdRef.current = null;
            setLateJoinStatus("accepted");
            setIsRegistered(true);
            setRegisteredName(lateJoinDataRef.current?.name);
            if (lateJoinDataRef.current) {
              persistPlayerIdentity(sessionId, effectiveTokenId, lateJoinDataRef.current.name);
            }
            // CAT-1 FIX: DM already created the combatant via handleAddCombatant.
            // Only mark the token — do NOT call registerPlayerCombatant (which would
            // create a duplicate combatant row). Then fetch full state.
            if (lateJoinDataRef.current) {
              markPlayerToken(effectiveTokenId, sessionId, lateJoinDataRef.current.name)
                .catch(() => { /* Token may already be marked — ignore */ });
            }
            // Fetch full state to hydrate the combat board
            // S3.5: late-join response is a recovery path — bypass throttle
            if (encounterIdRef.current) {
              fetchFullState(encounterIdRef.current, { priority: "emergency", caller: "late_join:response_accepted" }).catch(() => { /* best-effort */ });
            }
          } else if (!payload.accepted) {
            setLateJoinStatus("rejected");
          }
        })
        // combat:rejoin_response removed — rejoin is now always auto-approve (John's simplification)
        .on("broadcast", { event: "combat:session_revoked" }, ({ payload }: { payload: RealtimeSessionRevoked }) => {
          // If our token was revoked (another device took over), disconnect gracefully
          if (payload.revoked_token_id === effectiveTokenId) {
            clearPlayerIdentity(sessionId);
            setIsRegistered(false);
            setRegisteredName(undefined);
            // Show persistent banner instead of silent toast
            setSessionRevokedBanner(true);
            if (sessionRevokedTimerRef.current) clearTimeout(sessionRevokedTimerRef.current);
            sessionRevokedTimerRef.current = setTimeout(() => setSessionRevokedBanner(false), 5000);
          }
        })
        .on("broadcast", { event: "player:joined" }, ({ payload }: { payload: { id?: string; name?: string } }) => {
          const joinedId = payload.id;
          const joinedName = payload.name;
          if (joinedId && joinedName) {
            setJoinedPlayers((prev) => {
              if (prev.some((p) => p.id === joinedId)) return prev;
              return [...prev, { id: joinedId, name: joinedName }];
            });
          }
        })
        .on("broadcast", { event: "audio:play_sound" }, ({ payload }: { payload: RealtimeAudioPlay }) => {
          // DM played an SFX — play it on the player side too
          if (payload.sound_id && payload.source) {
            useAudioStore.getState().playSound(
              payload.sound_id,
              payload.source,
              payload.player_name ?? "DM",
              payload.audio_url
            );
          }
        })
        .on("broadcast", { event: "audio:ambient_start" }, ({ payload }: { payload: RealtimeAmbientStart }) => {
          // DM started ambient/music — play it on the player side (looped)
          if (payload.sound_id) {
            useAudioStore.getState().playAmbient(payload.sound_id);
          }
        })
        .on("broadcast", { event: "audio:ambient_stop" }, () => {
          // DM stopped all ambient/music — stop all on the player side
          useAudioStore.getState().stopAmbient();
        })
        .on("broadcast", { event: "audio:loop_stop" }, ({ payload }: { payload: RealtimeLoopStop }) => {
          // DM stopped a single loop — stop just that one on the player side
          if (payload.sound_id) {
            useAudioStore.getState().stopLoop(payload.sound_id);
          }
        })
        // F-38: chat:player_message — PlayerChat component handles this directly via channelRef
        // We add a no-op handler here only to prevent Supabase from filtering the event.
        // PlayerChat subscribes to the same channel ref independently via useEffect.
        .on("broadcast", { event: "chat:player_message" }, () => {
          // Delegated to PlayerChat component — no action here
        })
        // F-38: chat:dm_postit — DmPostit component handles this directly via channelRef
        .on("broadcast", { event: "chat:dm_postit" }, () => {
          // Delegated to DmPostit component — no action here
        })
        .on("broadcast", { event: "session:combat_stats" }, ({ payload }: { payload: RealtimeCombatStats }) => {
          // C.15: DM ended combat — show leaderboard + poll before session:ended
          if (payload.stats && payload.encounter_name) {
            combatStatsActiveRef.current = true; // P1.02: mark poll flow as active
            setCombatStatsData({
              stats: payload.stats as CombatantStats[],
              encounterName: payload.encounter_name as string,
              rounds: (payload.rounds as number) ?? 0,
              combatDuration: (payload.combatDuration as number) ?? 0,
            });
          }
        })
        .on("broadcast", { event: "session:combat_recap" }, ({ payload }: { payload: RealtimeCombatRecap }) => {
          // B6: Full combat recap from DM — player sees "Spotify Wrapped" experience
          if (payload.report) {
            setCombatRecapReport(payload.report as CombatReport);
          }
        })
        .on("broadcast", { event: "session:poll_results" }, ({ payload }: { payload: RealtimeSessionPollResults }) => {
          // C.15-B: DM broadcast aggregate poll results — show to player in awaiting screen
          // Validate payload shape at runtime — broadcast payloads are untyped
          const avg = typeof payload?.avg === "number" ? payload.avg : null;
          const dist = payload?.distribution && typeof payload.distribution === "object" ? payload.distribution as Record<number, number> : {};
          const total = typeof payload?.total_votes === "number" ? payload.total_votes : 0;
          if (avg != null && avg > 0) {
            setPollResultsData({ avg, distribution: dist, total_votes: total });
          }
        })
        .on("broadcast", { event: "session:ended" }, () => {
          // P1.02: Defer if leaderboard/poll is showing — player must finish flow first
          // Ensures difficulty_rating gets recorded and player sees the full post-combat UX
          if (combatStatsActiveRef.current) {
            pendingSessionEndRef.current = true;
            return;
          }
          // A.3: DM ended the session — show overlay, cleanup everything
          clearPlayerIdentity(sessionId);
          setSessionEnded(true);
          setActive(false);
          // If player was in late-join waiting, mark it
          if (lateJoinRequestIdRef.current && !lateJoinRegisteredRef.current) {
            setSessionEndedDuringLateJoin(true);
            setLateJoinStatus("idle");
          }
          clearAllTimers();
          // Unsubscribe channels with small delay to ensure event processing completes
          sessionEndedUnsubTimerRef.current = setTimeout(() => {
            sessionEndedUnsubTimerRef.current = null;
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            if (presenceChannelRef.current) {
              supabase.removeChannel(presenceChannelRef.current);
              presenceChannelRef.current = null;
            }
          }, 500);
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            setDebouncedConnectionStatus("connected");
            disconnectedAtRef.current = null;
            reconnectBackoffRef.current = 1000;
            // A.1: Transition to CONNECTED — stops all polling, fetches reconciliation state
            transitionTo("CONNECTED", "SUBSCRIBED");
            if (encounterIdRef.current) {
              // S3.5: channel SUBSCRIBED handshake is a recovery path —
              // bypass throttle so reconciliation isn't delayed.
              fetchFullState(encounterIdRef.current, { priority: "emergency", caller: "channel_subscribed" });
              // DESYNC-FIX-3: Second fetch after 1s to catch broadcasts lost during
              // the subscribe handshake (50-200ms window where events can be missed).
              setTimeout(() => {
                if (encounterIdRef.current && connStateRef.current === "CONNECTED") {
                  fetchFullState(encounterIdRef.current, { priority: "emergency", caller: "channel_subscribed_catchup" });
                }
              }, 1000);
            }
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setDebouncedConnectionStatus("disconnected");
            if (!disconnectedAtRef.current) {
              disconnectedAtRef.current = Date.now();
            }
            // A.1: Transition to RECONNECTING, then POLLING_FALLBACK after 3s
            transitionTo("RECONNECTING", status);
            if (pollFallbackTimerRef.current) clearTimeout(pollFallbackTimerRef.current);
            pollFallbackTimerRef.current = setTimeout(() => {
              pollFallbackTimerRef.current = null;
              if (connStateRef.current === "RECONNECTING" && encounterIdRef.current) {
                transitionTo("POLLING_FALLBACK", "timeout 3s");
              }
            }, 3000);

            // Exponential backoff reconnection — cancel any pending timer to prevent duplicate channels
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            const delay = Math.min(reconnectBackoffRef.current, 30000);
            reconnectBackoffRef.current = delay * 2;
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
              }
              createChannel();
            }, delay);
          } else {
            setDebouncedConnectionStatus("connecting");
          }
        });

      channelRef.current = channel;
      return channel;
    }

    createChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      clearAllTimers();
      if (deathSaveResolutionTimerRef.current) clearTimeout(deathSaveResolutionTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Channel setup must only re-run on auth/session changes; callbacks use refs internally and adding them would cause constant reconnects
  }, [authReady, sessionId, fetchFullState]);

  // CAT-1 FIX: Polling is the PRIMARY mechanism for late-join acceptance detection.
  // Supabase Realtime broadcasts can fail when DM and player share the same user_id
  // (same JWT → self:false suppresses delivery). Polling the server is reliable regardless.
  // Runs while "waiting" OR "polling" OR "rejected" (DM may still accept later).
  // Stops only when "accepted", "timeout", or "idle" (user cancelled).
  useEffect(() => {
    const shouldPoll = (lateJoinStatus === "waiting" || lateJoinStatus === "polling" || lateJoinStatus === "rejected") && !!sessionId && !!lateJoinDataRef.current;
    if (!shouldPoll) return;

    let cancelled = false;
    let pollDelay = 5000;

    const poll = async () => {
      if (cancelled || lateJoinRegisteredRef.current) return; // Already resolved or unmounted
      // S3.5: late-join polling routed through the orchestrator (background).
      // The dedicated post-accept fetch (inside late_join_response / combatant_add
      // handlers) remains "emergency" so acceptance hydrates instantly.
      // `fetchOrchestrator.fetch()` never throws — returns null on drop/failure.
      const data = await fetchOrchestrator.fetch({
        encounterId: sessionId,
        priority: "background",
        caller: "late_join_poll",
      });
      if (cancelled) return;
      if (!data) {
        // Dropped/failed — mirror the pre-S3.5 backoff curve.
        pollDelay = Math.min(pollDelay * 2, 30000);
        return;
      }
      pollDelay = 5000; // Reset on success
      const combatants = data.combatants as
        | Array<{ is_player?: boolean; name?: string; session_token_id?: string | null }>
        | undefined;
      if (!combatants || !lateJoinDataRef.current || cancelled) return;

      const playerName = lateJoinDataRef.current.name;
      const tokenId = effectiveTokenIdRef.current;
      // B3: Match by session_token_id first (ID-based), then fallback to name
      const found = combatants.find(
        (c) => c.is_player && (c.session_token_id === tokenId || c.name === playerName)
      );

      if (found && !lateJoinRegisteredRef.current && !cancelled) {
        lateJoinRegisteredRef.current = true;
        lateJoinFinalStatusRef.current = true; // A.4: guard against timer overwrite
        if (lateJoinTimeoutRef.current) {
          clearTimeout(lateJoinTimeoutRef.current);
          lateJoinTimeoutRef.current = null;
        }
        if (lateJoinMaxTimeoutRef.current) {
          clearTimeout(lateJoinMaxTimeoutRef.current);
          lateJoinMaxTimeoutRef.current = null;
        }
        lateJoinRequestIdRef.current = null;
        setLateJoinStatus("accepted");
        setIsRegistered(true);
        setRegisteredName(playerName);
        persistPlayerIdentity(sessionId, effectiveTokenId, playerName);
        // Only mark token — combatant already created by DM
        markPlayerToken(effectiveTokenId, sessionId, playerName)
          .catch(() => { /* Token may already be marked — ignore */ });
        // Hydrate full combat state from server response so player sees the board immediately
        const enc = data.encounter as
          | { round_number?: number; current_turn_index?: number; is_active?: boolean; id?: string }
          | null
          | undefined;
        if (enc) {
          setRound(enc.round_number ?? 1);
          updateTurnIndex(enc.current_turn_index ?? 0);
          setActive(enc.is_active ?? false);
          if (enc.id) setCurrentEncounterId(enc.id);
        }
        updateCombatants(data.combatants as PlayerCombatant[]);
      }
    };

    // CAT-1: Poll for late-join acceptance — 2s first poll, then adaptive interval.
    // Broadcasts are primary detection; polling is fallback.
    // Exponential backoff on errors: 5s → 10s → 20s → 30s (cap)
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      if (cancelled || lateJoinRegisteredRef.current) return;
      timer = setTimeout(async () => {
        await poll();
        schedule();
      }, pollDelay);
    };

    const firstPoll = setTimeout(async () => {
      await poll();
      schedule();
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(firstPoll);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effectiveTokenId is stable after auth init
  }, [lateJoinStatus, sessionId, effectiveTokenId]);

  // A.5: Heartbeat — update last_seen_at every 60s, PAUSES when tab is hidden (saves battery + DB writes)
  useEffect(() => {
    if (!isRegistered || !active || !effectiveTokenId) return;
    const supabase = createClient();
    const heartbeat = async () => {
      // Don't send heartbeat if tab is hidden (browser throttles anyway, confuses presence)
      if (document.visibilityState === "hidden") return;
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user?.id) return;
        await supabase
          .from("session_tokens")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", effectiveTokenId)
          .eq("anon_user_id", authSession.user.id); // guard: don't renew if token transferred
      } catch { /* heartbeat is best-effort */ }
    };
    heartbeatRef.current = heartbeat;
    heartbeat(); // immediate
    const id = setInterval(heartbeat, 60_000); // 60s — balanced between presence accuracy and DB writes
    return () => {
      clearInterval(id);
      heartbeatRef.current = null;
    };
  }, [isRegistered, active, effectiveTokenId]);

  // Lobby polling — fallback when broadcast `combat:started` is missed.
  // Polls session state with exponential backoff on errors: 5s → 10s → 20s → 30s cap.
  // S3.5: routed through `fetchOrchestrator` with priority=background so that
  // 8 tabs polling in sync cannot produce more than 4 req/minute at the endpoint.
  useEffect(() => {
    if (!isRegistered || active || !sessionId) return;

    let cancelled = false;
    let delay = 5000;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      const data = await fetchOrchestrator.fetch({
        encounterId: sessionId,
        priority: "background",
        caller: "lobby_poll",
      });
      if (cancelled) return;
      if (!data) {
        // Dropped by orchestrator (throttle/circuit) OR network fail. Backoff
        // on presumed-failure; next tick the orchestrator will allow us through
        // once its 15s window elapses. Using the same backoff cap maintains
        // the prior recovery envelope.
        delay = Math.min(delay * 2, 30000);
        return;
      }
      delay = 5000; // Reset on success
      const enc = data.encounter as
        | { is_active?: boolean; id?: string; round_number?: number; current_turn_index?: number }
        | null
        | undefined;
      if (enc?.is_active && enc?.id) {
        setActive(true);
        setCurrentEncounterId(enc.id);
        if (data.combatants) updateCombatants(data.combatants as PlayerCombatant[]);
        if (enc.round_number) setRound(enc.round_number);
        if (enc.current_turn_index !== undefined) updateTurnIndex(enc.current_turn_index);
      }
      // BT2-04: Update lobby player list from session tokens (source of truth)
      if (data.lobby_players && Array.isArray(data.lobby_players)) {
        const serverPlayers = (data.lobby_players as Array<{ id: string; player_name: string }>)
          .filter((t) => !!t.player_name)
          .map((t) => ({ id: t.id, name: t.player_name }));
        setJoinedPlayers((prev) => {
          if (prev.length === serverPlayers.length && prev.every((p, i) => p.id === serverPlayers[i]?.id)) return prev;
          return serverPlayers;
        });
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        await poll();
        schedule();
      }, delay);
    };
    schedule();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [isRegistered, active, sessionId, updateCombatants, updateTurnIndex]);

  // S1.1: Post-combat recap hydration (Finding 1).
  // When the DM ends combat while the player's tab is hidden / reconnecting,
  // the `session:combat_recap` broadcast can be lost. We hit the durable
  // `/api/session/[id]/latest-recap` endpoint once per session to recover the
  // Wrapped experience.
  //
  // Guarded by:
  //   - authReady + sessionId (same contract as the other player effects).
  //   - combat NOT active (we only hydrate when no live encounter is running).
  //   - `recap-seen-${sessionId}-${encounter_id}` sessionStorage key — once
  //     the player closes the modal we never reopen it (survives refresh).
  //   - In-memory de-dupe with the existing broadcast path: we only set state
  //     if we don't already have a recap from the broadcast listener.
  useEffect(() => {
    if (!authReady || !sessionId) return;
    if (active) return; // Live combat — broadcast path handles it.
    if (combatRecapReport) return; // Already showing.

    let cancelled = false;

    const hydrate = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/latest-recap`);
        if (cancelled || !res.ok) return;
        const body = await res.json().catch(() => null);
        const recapData = body?.data;
        if (!recapData?.recap || !recapData?.encounter_id) return;

        const seenKey = `recap-seen-${sessionId}-${recapData.encounter_id}`;
        try {
          if (sessionStorage.getItem(seenKey)) return;
        } catch { /* sessionStorage unavailable — proceed */ }

        // De-dupe with broadcast: if the broadcast listener already set
        // combatRecapReport for THIS encounter, bail out.
        if (combatRecapReport) return;

        const recap = recapData.recap as CombatReport;
        // Populate combatStatsData so the Recap modal path renders. The shape
        // mirrors the `session:combat_stats` broadcast.
        setCombatStatsData({
          stats: (recap.rankings ?? []) as CombatantStats[],
          encounterName: recap.encounterName ?? "",
          rounds: recap.summary?.totalRounds ?? 0,
          combatDuration: recap.summary?.totalDuration ?? 0,
        });
        combatStatsActiveRef.current = true;
        hydratedRecapEncounterIdRef.current = recapData.encounter_id as string;
        setCombatRecapReport(recap);

        // Observability — distinguishes durable recovery from broadcast
        // delivery so we can measure the feature's value post-deploy.
        trackEvent("recap.served_from_db", {
          session_id: sessionId,
          encounter_id: recapData.encounter_id,
        });
      } catch {
        // Best-effort. Broadcast remains the happy path.
      }
    };

    void hydrate();
    return () => { cancelled = true; };
  }, [authReady, sessionId, active, combatRecapReport]);

  // DM stale detection — checks dm_last_seen_at via polling.
  // If DM hasn't heartbeated for >90s, shows "DM offline" indicator.
  // Exponential backoff on errors: 30s → 60s → 120s cap.
  useEffect(() => {
    if (!active || !sessionId) return;

    let cancelled = false;
    let delay = 30_000;
    let timer: ReturnType<typeof setTimeout>;

    const checkDmPresence = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        // Use lightweight dm-presence endpoint (1 query) instead of full /state (5 queries)
        const res = await fetch(`/api/session/${sessionId}/dm-presence`);
        if (!res.ok) { delay = Math.min(delay * 2, 120_000); return; }
        delay = 30_000; // Reset on success
        const data = await res.json();
        if (data?.dm_last_seen_at) {
          const lastSeen = new Date(data.dm_last_seen_at).getTime();
          dmLastSeenRef.current = lastSeen;
          // DM is considered offline if no heartbeat for 90s (3 missed beats at 30s interval)
          setDmOffline(Date.now() - lastSeen > 90_000);
        } else {
          // dm_last_seen_at is null — DM explicitly went offline (pagehide)
          setDmOffline(true);
        }
      } catch {
        delay = Math.min(delay * 2, 120_000);
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        await checkDmPresence();
        schedule();
      }, delay);
    };
    schedule();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, sessionId]);

  // Reset DM offline indicator when we receive any state_sync (DM is clearly broadcasting)
  // This is handled inside the fetchFullState callback — any successful response means DM is alive

  // Bidirectional visibility handler — hidden: broadcast idle, visible: reconnect + validate
  useEffect(() => {
    if (!authReady || !sessionId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        // === HIDDEN: pause activity, notify DM ===
        hiddenAtRef.current = Date.now();

        // Best-effort: broadcast player:idle
        if (channelRef.current && isRegisteredRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "player:idle",
            payload: {
              token_id: effectiveTokenIdRef.current,
              player_name: registeredNameRef.current,
            },
          });
        }
        return;
      }

      // === VISIBLE: reconnect and sync ===
      // Finding 4 (spike 2026-04-17): capture `hiddenMs` BEFORE resetting
      // `hiddenAtRef` so the 3-tier classification below can actually see
      // the elapsed time. Previous ordering read `hiddenAtRef.current` after
      // it had already been nulled, collapsing every reconnect into Tier 1.
      const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;

      // Broadcast player:active so DM knows we're back
      if (channelRef.current && isRegisteredRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player:active",
          payload: {
            token_id: effectiveTokenIdRef.current,
            player_name: registeredNameRef.current,
          },
        });
      }

      // Validate token ownership (anti-split-brain for bfcache)
      if (isRegisteredRef.current && supabaseRef.current) {
        try {
          const { data: { session: authSession } } =
            await supabaseRef.current.auth.getSession();
          if (authSession?.user?.id && effectiveTokenIdRef.current) {
            const res = await fetch(
              `/api/session/${sessionId}/state?token_id=${effectiveTokenIdRef.current}`
            );
            if (res.ok) {
              const { data } = await res.json();
              if (data?.token_owner && data.token_owner !== authSession.user.id) {
                setSessionRevoked(true);
                return;
              }
            }
          }
        } catch { /* best-effort — continue normal reconnection */ }
      }

      // Immediate heartbeat — clears the null last_seen_at set by sendBeacon on pagehide
      heartbeatRef.current?.();

      // A.1: AWAIT fetch BEFORE reconnecting channel — prevents stale delta calculations
      // Retry once after 2s if first attempt fails (transient network on wake)
      // Finding 4 (spike 2026-04-17): classify the reconnect into 3 tiers so the
      // reconnection funnel isn't polluted by harmless tab-switches. Tier 1
      // (noise) fires `player:resumed`; tiers 2/3 fire `player:reconnected`
      // with a confidence property so dashboards can filter.
      const wasDisconnected = disconnectedAtRef.current !== null;
      // `hiddenMs` captured above, before `hiddenAtRef.current = null` reset.
      // TODO: `state` is not part of the public `RealtimeChannel` API — replace
      // with an event-driven ref updated via `channel.subscribe((status) => ...)`
      // once we settle on a stable handshake signal.
      const channelState = channelRef.current
        ? (channelRef.current as unknown as { state?: string }).state
        : undefined;
      const emitReconnectTelemetry = () => {
        if (!isRegisteredRef.current) return;
        const tier = classifyReconnect({ hiddenMs, wasDisconnected, channelState });
        if (tier.event === "player:resumed") {
          // Tier 1 — noise (trivial tab-switch). Emit separate event so the
          // reconnection funnel stays clean. Includes `confidence: "noise"`
          // for schema symmetry with the other tiers.
          trackEvent("player:resumed", {
            session_id: sessionId,
            hidden_ms: tier.hiddenMs,
            confidence: tier.confidence,
          });
        } else {
          trackEvent("player:reconnected", {
            session_id: sessionId,
            method: tier.method,
            hidden_ms: tier.hiddenMs,
            confidence: tier.confidence,
          });
        }
      };
      if (encounterIdRef.current) {
        try {
          // S3.5: visibility_change:visible must not be blocked by throttle (HIGH-4).
          await fetchFullState(encounterIdRef.current, { priority: "emergency", caller: "visibility_change:visible" });
          emitReconnectTelemetry();
        } catch {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await fetchFullState(encounterIdRef.current!, { priority: "emergency", caller: "visibility_change:visible_retry" });
            emitReconnectTelemetry();
          } catch { /* give up */ }
        }
      }

      // If realtime is disconnected, force reconnect via the same createChannel function
      if (disconnectedAtRef.current && supabaseRef.current) {
        if (channelRef.current) {
          supabaseRef.current.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        reconnectBackoffRef.current = 1000;
        createChannelRef.current?.();
      }
    };

    // Network loss/recovery — covers WiFi switch, airplane mode toggle with tab visible
    const handleOnline = async () => {
      // Broadcast player:active so DM knows we're back
      if (channelRef.current && isRegisteredRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player:active",
          payload: {
            token_id: effectiveTokenIdRef.current,
            player_name: registeredNameRef.current,
          },
        });
      }
      // Immediate heartbeat to clear any stale last_seen_at
      heartbeatRef.current?.();
      // Sync full state — network recovery is always an emergency (channel was
      // down while offline). Keep the `network_recovery` method label as
      // "high" confidence since `navigator.onLine` flipping is unambiguous.
      if (encounterIdRef.current) {
        try {
          // S3.5: network_recovery is always an emergency — channel was dead.
          await fetchFullState(encounterIdRef.current, { priority: "emergency", caller: "network_recovery" });
          if (isRegisteredRef.current) {
            trackEvent("player:reconnected", {
              session_id: sessionId,
              method: "network_recovery",
              confidence: "high",
            });
          }
        } catch { /* best-effort */ }
      }
      // Reconnect channel if it died during offline
      if (disconnectedAtRef.current && supabaseRef.current) {
        if (channelRef.current) {
          supabaseRef.current.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        reconnectBackoffRef.current = 1000;
        createChannelRef.current?.();
      }
    };

    const handleOffline = () => {
      // Best-effort: broadcast player:idle so DM sees status change immediately
      if (channelRef.current && isRegisteredRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player:idle",
          payload: {
            token_id: effectiveTokenIdRef.current,
            player_name: registeredNameRef.current,
            reason: "network_offline",
          },
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [authReady, sessionId, fetchFullState]);

  // pagehide handler — best-effort cleanup when page is being unloaded
  // More reliable than beforeunload on mobile (iOS Safari ignores beforeunload)
  useEffect(() => {
    if (!isRegistered || !effectiveTokenId) return;

    const handlePageHide = (e: PageTransitionEvent) => {
      // 1. Best-effort: broadcast player:disconnecting via channel
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player:disconnecting",
          payload: {
            token_id: effectiveTokenId,
            player_name: registeredName,
            reason: e.persisted ? "bfcache" : "unload",
          },
        });
      }

      // 2. Best-effort: untrack presence (async — may not complete)
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
      }

      // 3. Best-effort: notify server via sendBeacon (survives page unload)
      if (navigator.sendBeacon) {
        const payload = new Blob(
          [JSON.stringify({ token_id: effectiveTokenId })],
          { type: "application/json" }
        );
        navigator.sendBeacon(
          `/api/session/${sessionId}/player-disconnect`,
          payload
        );
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [isRegistered, effectiveTokenId, registeredName, sessionId]);

  // A.1: Turn-sync safety net — runs at 15s interval when CONNECTED (reduced from 3s),
  // or 3s when POLLING_FALLBACK. Suppressed during late-join "waiting".
  useEffect(() => {
    if (!active || !sessionId || !encounterIdRef.current) {
      if (turnPollRef.current) {
        clearInterval(turnPollRef.current);
        turnPollRef.current = null;
      }
      return;
    }
    // A.1: Disable during late-join waiting — player isn't in combat yet
    if (lateJoinStatus === "waiting") return;
    const eid = encounterIdRef.current;
    turnPollRef.current = setInterval(() => {
      // A.1: Suppress when CONNECTED and recent broadcast arrived
      if (connStateRef.current === "CONNECTED") {
        if (Date.now() - lastTurnBroadcastRef.current < 2000) return;
      }
      // RECONNECTING — don't fetch, wait for transition
      if (connStateRef.current === "RECONNECTING") return;
      // S3.5: turn_poll is high priority — active UX, needs reactive updates.
      fetchFullState(eid, { priority: "high", caller: "turn_poll" });
    }, connStateRef.current === "CONNECTED" ? 30000 : 10000); // 30s connected, 10s fallback (was 15s/3s)
    return () => {
      if (turnPollRef.current) {
        clearInterval(turnPollRef.current);
        turnPollRef.current = null;
      }
    };
  }, [active, sessionId, fetchFullState, lateJoinStatus]);

  // Player registration handler — MUST be before any early returns (Rules of Hooks)
  const handleRegister = useCallback(async (data: {
    name: string;
    initiative: number;
    hp: number | null;
    ac: number | null;
  }) => {
    // A.6: Store registration data for auto-join if combat starts later
    pendingRegistrationRef.current = data;
    await registerPlayerCombatant(effectiveTokenId, sessionId, data);
    setIsRegistered(true);
    setRegisteredName(data.name);
    persistPlayerIdentity(sessionId, effectiveTokenId, data.name);

    // Track presence for DM's "Players Online" panel (B3-2)
    try {
      const supabase = createClient();
      const ch = supabase.channel(`presence:${sessionId}`, {
        config: { presence: { key: sessionId } },
      });
      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            id: effectiveTokenId,
            name: data.name,
            joined_at: Date.now(),
          });
        }
      });
      presenceChannelRef.current = ch;
    } catch {
      // Presence is best-effort — don't block registration
    }

    // Broadcast to other players and DM that this player joined
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player:joined",
        payload: {
          id: effectiveTokenId,
          name: data.name,
          initiative: data.initiative,
          hp: data.hp,
          ac: data.ac,
        },
      });
    }
  }, [effectiveTokenId, sessionId]);

  // Rejoin handler — ALWAYS direct transfer, no DM approval needed (John's simplification)
  // DM approval only required for late-join (new player during active combat)
  const handleRejoin = useCallback(async (playerName: string) => {
    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const userId = authSession?.user?.id;
      if (!userId) throw new Error("No auth session");

      const { tokenId: rejoinedTokenId } = await rejoinAsPlayer(sessionId, playerName, userId);
      setEffectiveTokenId(rejoinedTokenId);
      setIsRegistered(true);
      setRegisteredName(playerName);
      persistPlayerIdentity(sessionId, rejoinedTokenId, playerName);

      // Broadcast for DM that player is back
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player:joined",
          payload: {
            id: rejoinedTokenId,
            name: playerName,
            rejoin: true,
          },
        });
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        component: "PlayerJoinClient",
        action: "rejoin",
        category: "auth",
        extra: { sessionId, playerName },
      });
      toast.error(tRef.current("rejoin_error"));
    }
  }, [sessionId]);

  // Late-join request handler — broadcasts to DM channel; DM responds via combat:late_join_response
  const lateJoinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lateJoinMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLateJoinRequest = useCallback(async (data: {
    name: string;
    initiative: number;
    hp: number | null;
    ac: number | null;
  }) => {
    const requestId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    lateJoinRequestIdRef.current = requestId;
    lateJoinDataRef.current = data;
    lateJoinRegisteredRef.current = false;
    setLateJoinStatus("waiting");
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "combat:late_join_request",
        payload: {
          player_name: data.name,
          hp: data.hp,
          ac: data.ac,
          initiative: data.initiative,
          request_id: requestId,
          // B2: Send token ID so DM can link combatant for ID-based reconnection
          sender_token_id: effectiveTokenIdRef.current,
        },
      });
    } else {
      captureError(new Error("Cannot send late-join request — channel not available"), {
        component: "PlayerJoinClient",
        action: "late-join-request",
        category: "realtime",
      });
    }
    // A.4: Set deadline for countdown display
    setLateJoinDeadline(Date.now() + 120_000);
    // After 15s without broadcast response, switch to polling-only mode.
    // Don't reject — DM may still accept; polling will pick it up.
    if (lateJoinTimeoutRef.current) clearTimeout(lateJoinTimeoutRef.current);
    lateJoinTimeoutRef.current = setTimeout(() => {
      if (lateJoinFinalStatusRef.current) return; // A.4: guard
      if (lateJoinRequestIdRef.current === requestId && !lateJoinRegisteredRef.current) {
        setLateJoinStatus("polling");
      }
    }, 15_000);
    // 2-minute maximum timeout — stop polling, show timeout message
    if (lateJoinMaxTimeoutRef.current) clearTimeout(lateJoinMaxTimeoutRef.current);
    lateJoinMaxTimeoutRef.current = setTimeout(() => {
      if (lateJoinFinalStatusRef.current) return; // A.4: guard
      if (!lateJoinRegisteredRef.current) {
        setLateJoinStatus("timeout");
      }
    }, 120_000);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-foreground text-xl font-semibold">{t("connection_error")}</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // B6: Post-combat recap — player sees full "Spotify Wrapped" experience
  if (combatStatsData && !showPoll) {
    if (combatRecapReport) {
      // JO-04: Show "Join Campaign" CTA only for truly anonymous players (no auth user).
      // P1-03: !authUserId is the correct guard — !campaignId can also be true for
      // authenticated users whose campaign lookup silently failed.
      const showJoinCampaignCta = !authUserId && !!sessionCampaignId;
      return (
        <CombatRecap
          report={combatRecapReport}
          onJoinCampaign={showJoinCampaignCta ? () => {
            try {
              localStorage.setItem("pendingCampaignJoin", JSON.stringify({
                campaignId: sessionCampaignId,
                playerName: registeredName ?? "",
                sessionId, // P1-01: passed to server action for session ownership validation
              }));
            } catch {}
            window.location.href = "/auth/sign-up?context=campaign_join";
          } : undefined}
          onRate={(vote) => {
            playerRatedInlineRef.current = true;
            handlePollVote(vote);
          }}
          onClose={() => {
            // S1.1: Mark recap-seen so the durable /latest-recap hydration
            // never reopens this encounter's recap after refresh.
            const seenEid = hydratedRecapEncounterIdRef.current;
            if (seenEid) {
              try {
                sessionStorage.setItem(`recap-seen-${sessionId}-${seenEid}`, "1");
              } catch { /* sessionStorage unavailable — ignore */ }
            }
            setCombatRecapReport(null);
            if (playerRatedInlineRef.current) {
              // Already rated inline — skip DifficultyPoll, go straight to awaiting
              setCombatStatsData(null);
              combatStatsActiveRef.current = false;
              hydratedRecapEncounterIdRef.current = null;
              if (pendingSessionEndRef.current) {
                pendingSessionEndRef.current = false;
                setSessionEnded(true);
              } else {
                setAwaitingSessionEnd(true);
              }
            } else {
              setShowPoll(true);
            }
          }}
        />
      );
    }
    return (
      <CombatLeaderboard
        stats={combatStatsData.stats}
        encounterName={combatStatsData.encounterName}
        rounds={combatStatsData.rounds}
        combatDuration={combatStatsData.combatDuration}
        onClose={() => setShowPoll(true)}
      />
    );
  }

  // C.15: Difficulty poll — shown after player closes leaderboard
  if (showPoll) {
    return (
      <DifficultyPoll
        onVote={(vote) => {
          handlePollVote(vote);
          setCombatStatsData(null);
          setCombatRecapReport(null);
          setShowPoll(false);
          combatStatsActiveRef.current = false; // P1.02: poll flow done
          hydratedRecapEncounterIdRef.current = null; // S1.1: reset for next encounter
          if (pendingSessionEndRef.current) {
            // session:ended was deferred — process it now
            pendingSessionEndRef.current = false;
            setSessionEnded(true);
          } else {
            setAwaitingSessionEnd(true);
          }
        }}
        onSkip={() => {
          setCombatStatsData(null);
          setCombatRecapReport(null);
          setShowPoll(false);
          combatStatsActiveRef.current = false; // P1.02: poll flow done
          hydratedRecapEncounterIdRef.current = null; // S1.1: reset for next encounter
          if (pendingSessionEndRef.current) {
            pendingSessionEndRef.current = false;
            setSessionEnded(true);
          } else {
            setAwaitingSessionEnd(true);
          }
        }}
      />
    );
  }

  // UX.18: limbo guard — waiting for session:ended after poll dismiss
  // C.15-B: Once DM broadcasts results, show them instead of a blank spinner
  if (awaitingSessionEnd && !sessionEnded) {
    if (pollResultsData) {
      const { avg, distribution, total_votes } = pollResultsData;
      const closestOpt = avg > 0
        ? DIFFICULTY_OPTIONS.reduce((prev, curr) =>
            Math.abs(curr.value - avg) < Math.abs(prev.value - avg) ? curr : prev
          )
        : null;
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-surface-overlay border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-center text-lg font-semibold text-foreground">
              {t("poll_results_title")}
            </h2>
            <p className="text-center text-xs text-muted-foreground">
              {t("poll_results_subtitle")}
            </p>

            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-gold">
                {avg > 0 ? avg.toFixed(1) : "—"}
              </span>
              <span className="text-sm text-muted-foreground">/ 5</span>
              {closestOpt && (() => {
                const Icon = closestOpt.icon;
                return (
                  <span className={`flex items-center gap-1 text-sm ${closestOpt.color} ml-1`}>
                    <Icon className="w-4 h-4" />
                  </span>
                );
              })()}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {total_votes} {t("poll_votes_received")}
            </p>

            <div className="space-y-2">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const count = distribution[opt.value] ?? 0;
                const pct = total_votes > 0 ? Math.round((count / total_votes) * 100) : 0;
                return (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${opt.color}`} />
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${opt.bgBar} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                      {count > 0 ? `${count} (${pct}%)` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-4 h-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-xs">{t("poll_awaiting_end")}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-5">
          <div className="text-5xl select-none" aria-hidden="true">⏳</div>
          <div className="space-y-1.5">
            <p className="text-foreground font-semibold text-base">{t("poll_results_title")}</p>
            <p className="text-muted-foreground text-sm">{t("poll_awaiting_end")}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // A.3: Session ended overlay — shown after DM ends session (overlay over board, not full replace)
  if (sessionEnded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      >
        <div className="text-center space-y-4">
          <h1 className="text-foreground text-xl font-semibold">
            {t("session_ended")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {sessionEndedDuringLateJoin
              ? t("session_ended_before_join")
              : t("session_ended_detail")}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2 bg-gold text-black rounded-md font-medium hover:bg-gold/90 transition-colors"
          >
            {t("back_to_home")}
          </button>
        </div>
      </motion.div>
    );
  }

  // Split-brain: token was transferred to another device (bfcache stale)
  if (sessionRevoked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-foreground text-xl font-semibold">
            {t("session_transferred")}
          </h1>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2 bg-gold text-black rounded-md font-medium hover:bg-gold/90 transition-colors"
          >
            {t("back_to_home")}
          </button>
        </div>
      </div>
    );
  }

  // Reconnecting skeleton — show player name while reconnect-from-storage runs (Sally)
  if (reconnectingAs) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm" data-testid="reconnecting-skeleton">
            {t("reconnecting_as", { name: reconnectingAs })}
          </p>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm" data-testid="player-loading">
          {t("connecting")}
        </p>
      </div>
    );
  }

  // Show lobby when combat isn't active yet (normal join)
  if (!active || !currentEncounterId) {
    return (
      <PlayerLobby
        sessionName={sessionName}
        joinedPlayers={joinedPlayers}
        onRegister={handleRegister}
        isRegistered={isRegistered}
        registeredName={registeredName}
        prefilledCharacters={prefilledCharacters}
        registeredPlayerNames={registeredPlayerNames}
        onRejoin={handleRejoin}
      />
    );
  }

  // Show late-join lobby when combat is active but player hasn't registered yet
  if (!isRegistered) {
    return (
      <PlayerLobby
        sessionName={sessionName}
        joinedPlayers={joinedPlayers}
        onRegister={handleRegister}
        isRegistered={isRegistered}
        registeredName={registeredName}
        isCombatActive={true}
        onLateJoinRequest={handleLateJoinRequest}
        lateJoinStatus={lateJoinStatus}
        lateJoinDeadline={lateJoinDeadline}
        lateJoinRetryCount={lateJoinRetryCountRef.current}
        onLateJoinRetry={resetLateJoinState}
        prefilledCharacters={prefilledCharacters}
        registeredPlayerNames={registeredPlayerNames}
        registeredPlayersWithStatus={registeredPlayersWithStatus}
        onRejoin={handleRejoin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4" data-testid="player-view">
      {/* B1: Session revoked banner — replaces silent toast */}
      {sessionRevokedBanner && (
        <div
          className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg transition-opacity duration-300"
          style={{ animation: "fade-in 300ms ease-out" }}
          data-testid="session-revoked-banner"
        >
          <span className="text-sm font-medium">{t("session_revoked_banner")}</span>
          <button
            type="button"
            onClick={() => {
              setSessionRevokedBanner(false);
              // Navigate to lobby by resetting registration state
              setIsRegistered(false);
              setRegisteredName(undefined);
            }}
            className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded hover:bg-white/30 transition-colors"
          >
            {t("session_revoked_rejoin")}
          </button>
        </div>
      )}
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-lg font-semibold">{sessionName}</h1>
            <span className="text-muted-foreground text-xs">
              {t("round")} <span className="font-mono text-gold">{round}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator status={connectionStatus} />
            {dmOffline && active && (
              <span
                className="px-2 py-1 bg-amber-900/50 text-amber-300 text-[10px] font-semibold rounded-full border border-amber-700/40"
                title={t("dm_offline_title")}
                data-testid="dm-offline-badge"
              >
                {t("dm_offline_badge")}
              </span>
            )}
            {campaignId && (
              <button
                type="button"
                onClick={() => setShowNotes((p) => !p)}
                className="px-3 py-2 bg-surface-tertiary text-foreground text-xs font-medium rounded-full border border-border transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[44px]"
                aria-label={t("notes_open")}
                data-testid="player-notes-btn"
              >
                {t("notes_button")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowOracle((p) => !p)}
              className="px-3 py-2 bg-gold text-foreground text-xs font-medium rounded-full transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] min-w-[44px]"
              aria-label={t("spell_oracle_open")}
              data-testid="player-oracle-btn"
            >
              {t("spell_oracle_button")}
            </button>
          </div>
        </div>

        {/* Audio Autoplay Unlock Banner (Story 4) */}
        <AudioUnlockBanner />

        {/* E4: DM offline — graceful degradation banner */}
        {dmOffline && active && (
          <div
            className="flex items-center gap-2 px-3 py-2 bg-amber-900/30 text-amber-200 text-xs font-medium rounded-lg border border-amber-700/30"
            role="status"
            aria-live="polite"
            data-testid="dm-offline-banner"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>{t("dm_offline_waiting")}</span>
          </div>
        )}

        {/* Shared Notes (W2.2 — authenticated campaign members only) */}
        {showNotes && campaignId && (
          <div className="bg-card border border-border rounded-md p-4" data-testid="player-notes">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground text-sm font-medium">{t("notes_title")}</h3>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-muted-foreground hover:text-foreground/80 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-label={t("notes_close")}
              >
                ✕
              </button>
            </div>
            <PlayerSharedNotes campaignId={campaignId} userId={authUserId} />
          </div>
        )}

        {/* Spell Oracle (Story 5-4) */}
        {showOracle && (
          <div className="bg-card border border-border rounded-md p-4" data-testid="player-oracle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground text-sm font-medium">{t("spell_oracle_title")}</h3>
              <button
                type="button"
                onClick={() => setShowOracle(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-label={t("spell_oracle_close")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <Suspense fallback={<p className="text-muted-foreground text-xs">{t("spell_loading")}</p>}>
              <SpellSearch />
            </Suspense>
          </div>
        )}

        {/* Initiative Board */}
        <PlayerInitiativeBoard
          combatants={combatants}
          currentTurnIndex={turnIndex}
          roundNumber={round}
          rulesetVersion={rulesetVersion}
          combatLog={combatLog}
          nextCombatantId={nextCombatantId}
          onPlayerNote={(combatantId, note) => {
            // Broadcast player note to DM via realtime channel
            if (channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "player:note",
                payload: { combatant_id: combatantId, note },
              });
            }
          }}
          channelRef={channelRef}
          customAudioFiles={playerAudioFiles}
          customAudioUrls={playerAudioUrls}
          isLoadingAudioUrls={isLoadingAudioUrls}
          registeredName={registeredName}
          effectiveTokenId={effectiveTokenId}
          characterId={prefilledCharacters?.find((c) => c.name === registeredName)?.id}
          sessionId={sessionId}
          hpDelta={hpDelta}
          deathSaveResolution={deathSaveResolution}
          onHpAction={handleHpAction}
          connectionStatus={connectionStatus}
          pendingState={pendingState}
          onEndTurn={() => {
            const ch = channelRef.current;
            if (!ch || connectionStatus !== "connected") {
              toast.error(tRef.current("sync_offline"));
              return;
            }
            ch.send({
              type: "broadcast",
              event: "player:end_turn",
              payload: { player_name: registeredName, sender_token_id: effectiveTokenId },
            });
          }}
          onDeathSave={(combatantId, result) => {
            const ch = channelRef.current;
            if (!ch || connectionStatus !== "connected") {
              toast.error(tRef.current("sync_offline"));
              return;
            }
            // Snapshot for rollback
            const existing = combatantsRef.current.find((c) => c.id === combatantId);
            const rollbackSnapshot = existing?.death_saves
              ? { death_saves: { ...existing.death_saves } }
              : undefined;

            // P1-fix: pre-generate action_id so it's stored in payload for retry
            const actionId = generateActionId();
            const broadcastPayload = {
              player_name: registeredName,
              combatant_id: combatantId,
              result,
              sender_token_id: effectiveTokenId,
              action_id: actionId,
            };
            usePendingActionsStore.getState().addAction({
              id: actionId,
              type: "death_save",
              combatantId,
              timestamp: Date.now(),
              payload: broadcastPayload,
              rollbackSnapshot,
            });

            ch.send({ type: "broadcast", event: "player:death_save", payload: broadcastPayload });
            startAckTimer(actionId, "player:death_save");

            // Optimistic local update — show the dot immediately
            deathSaveOptimisticRef.current = Date.now();
            updateCombatants((prev) =>
              prev.map((c) => {
                if (c.id !== combatantId) return c;
                const saves = c.death_saves ?? { successes: 0, failures: 0 };
                return {
                  ...c,
                  death_saves: result === "success"
                    ? { ...saves, successes: Math.min(saves.successes + 1, 3) }
                    : { ...saves, failures: Math.min(saves.failures + 1, 3) },
                };
              })
            );
          }}
          spellSlots={characterSpellSlots}
          onToggleSlot={handleToggleSlot}
          onLongRest={handleLongRest}
          onSelfConditionToggle={(combatantId, condition) => {
            const ch = channelRef.current;
            if (!ch || connectionStatus !== "connected") {
              toast.error(tRef.current("sync_offline"));
              return;
            }
            // Snapshot for rollback
            const existing = combatantsRef.current.find((c) => c.id === combatantId);
            const rollbackSnapshot = existing
              ? { conditions: [...existing.conditions] }
              : undefined;

            // P1-fix: pre-generate action_id so it's stored in payload for retry
            const actionId = generateActionId();
            const broadcastPayload = {
              player_name: registeredName,
              combatant_id: combatantId,
              condition,
              sender_token_id: effectiveTokenId,
              action_id: actionId,
            };
            usePendingActionsStore.getState().addAction({
              id: actionId,
              type: "condition",
              combatantId,
              timestamp: Date.now(),
              payload: broadcastPayload,
              rollbackSnapshot,
            });

            // Optimistic local update — toggle condition immediately for instant UI feedback
            conditionOptimisticRef.current = Date.now();
            updateCombatants((prev) =>
              prev.map((c) => {
                if (c.id !== combatantId) return c;
                const has = c.conditions.includes(condition);
                return {
                  ...c,
                  conditions: has
                    ? c.conditions.filter((cond) => cond !== condition)
                    : [...c.conditions, condition],
                };
              })
            );
            ch.send({ type: "broadcast", event: "player:self_condition_toggle", payload: broadcastPayload });
            startAckTimer(actionId, "player:self_condition_toggle");
          }}
          onToggleReaction={(combatantId) => {
            // B1: Check connection BEFORE optimistic update to avoid stale local state on failure
            const ch = channelRef.current;
            if (!ch || connectionStatus !== "connected") {
              toast.error(tRef.current("sync_offline"));
              return;
            }
            // W3: Rate-limit — max 1 toggle per second
            const now = Date.now();
            if (now - lastReactionToggleRef.current < 1000) return;
            lastReactionToggleRef.current = now;
            // D1: Compute new value BEFORE optimistic update to avoid stale closure
            const current = combatantsRef.current.find((c) => c.id === combatantId);
            if (!current) return;
            const newValue = !current.reaction_used;

            // P1-fix: pre-generate action_id so it's stored in payload for retry
            const actionId = generateActionId();
            const broadcastPayload = {
              combatant_id: combatantId,
              reaction_used: newValue,
              player_name: registeredName,
              sender_token_id: effectiveTokenId,
              action_id: actionId,
            };
            usePendingActionsStore.getState().addAction({
              id: actionId,
              type: "reaction",
              combatantId,
              timestamp: Date.now(),
              payload: broadcastPayload,
              rollbackSnapshot: { reaction_used: current.reaction_used },
            });

            // Optimistic local update
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === combatantId ? { ...c, reaction_used: newValue } : c
              )
            );
            // Broadcast to DM
            ch.send({ type: "broadcast", event: "combat:reaction_toggle", payload: broadcastPayload });
            startAckTimer(actionId, "combat:reaction_toggle");
          }}
        />
      </div>

      {/* F-38: Player-to-player chat (only when registered and combat active) */}
      {isRegistered && registeredName && (
        <PlayerChat
          channelRef={channelRef}
          senderName={registeredName}
          isActive={active}
        />
      )}

      {/* F-38: DM post-its receiver */}
      {isRegistered && (
        <DmPostit
          channelRef={channelRef}
          tokenId={effectiveTokenId}
          playerName={registeredName}
          isActive={active}
        />
      )}
    </div>
  );
}
