"use client";

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { claimPlayerToken, registerPlayerCombatant, markPlayerToken, rejoinAsPlayer } from "@/lib/supabase/player-registration";
import { PlayerInitiativeBoard, type CombatLogEntry } from "@/components/player/PlayerInitiativeBoard";
import { PlayerLobby } from "@/components/player/PlayerLobby";
import { SyncIndicator } from "@/components/player/SyncIndicator";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";
import type { RulesetVersion } from "@/lib/types/database";
import type { Plan } from "@/lib/types/subscription";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { captureError } from "@/lib/errors/capture";
import type { PlayerAudioFile } from "@/lib/types/audio";
import { useAudioStore } from "@/lib/stores/audio-store";
import { AudioUnlockBanner } from "@/components/audio/AudioUnlockBanner";


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
  /** HP status label for monsters (LIGHT/MODERATE/HEAVY/CRITICAL) */
  hp_status?: string;
  /** Death saves state for players at 0 HP */
  death_saves?: { successes: number; failures: number };
}

interface PrefilledCharacter {
  id: string;
  name: string;
  max_hp: number;
  current_hp: number;
  ac: number;
  spell_save_dc: number | null;
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
  /** Player names with active/inactive status (for DM-approval reconnection) */
  registeredPlayersWithStatus?: Array<{ name: string; isActive: boolean }>;
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
}: PlayerJoinClientProps) {
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
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | undefined>();
  const [joinedPlayers, setJoinedPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [nextCombatantId, setNextCombatantId] = useState<string | null>(null);
  // TODO: include weatherEffect in session:state_sync for reconnect support
  const [weatherEffect, setWeatherEffect] = useState<string>("none");
  const [effectiveTokenId, setEffectiveTokenId] = useState(tokenId);
  const [lateJoinStatus, setLateJoinStatus] = useState<"idle" | "waiting" | "accepted" | "rejected" | "polling" | "timeout">("idle");
  const lateJoinRequestIdRef = useRef<string | null>(null);
  const lateJoinDataRef = useRef<{ name: string; initiative: number; hp: number | null; ac: number | null } | null>(null);
  const lateJoinRegisteredRef = useRef(false);
  // Rejoin-with-approval state (for cookie-less reconnect during active combat)
  const [rejoinStatus, setRejoinStatus] = useState<"idle" | "waiting" | "accepted" | "rejected">("idle");
  const rejoinRequestIdRef = useRef<string | null>(null);
  const rejoinCharacterRef = useRef<string | null>(null);
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const combatantsRef = useRef(initialCombatants);
  const turnIndexRef = useRef(currentTurnIndex);
  const disconnectedAtRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTurnBroadcastRef = useRef<number>(0);
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

  // Mesa model: seed session DM plan into subscription store
  useEffect(() => {
    useSubscriptionStore.getState().setSessionDmPlan(dmPlan);
    return () => {
      useSubscriptionStore.getState().setSessionDmPlan(null);
    };
  }, [dmPlan]);

  // Anonymous auth + claim token via server action (bypasses RLS)
  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      try {
        const supabase = createClient();

        // Timeout guard — iOS WebKit can hang on auth calls indefinitely
        const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Auth timeout")), ms)
            ),
          ]);

        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 8000);

        let userId: string;
        if (!session) {
          const { data, error: authError } = await withTimeout(
            supabase.auth.signInAnonymously(),
            10000
          );
          if (authError) throw new Error(`anon-auth: ${authError.message}`);
          if (!data.user) throw new Error("anon-auth: no user returned");
          userId = data.user.id;
        } else {
          userId = session.user.id;
        }

        // Server action — creates per-player token if shared one is taken
        const { tokenId: claimedTokenId, playerName } = await withTimeout(claimPlayerToken(tokenId, userId), 10000);
        if (!cancelled) {
          setEffectiveTokenId(claimedTokenId);
          // Same-device reconnect: player already registered on this token
          if (playerName) {
            setIsRegistered(true);
            setRegisteredName(playerName);
          }
          setAuthReady(true);
        }
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          component: "PlayerJoinClient",
          action: "initAuth",
          category: "auth",
          extra: { tokenId },
        });
        if (!cancelled) {
          setError(tRef.current("connection_error_detail"));
        }
      }
    };
    initAuth();
    return () => { cancelled = true; };
  }, [tokenId]);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const reconnectBackoffRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref to createChannel — lets the visibility handler reuse the full channel setup
  const createChannelRef = useRef<(() => void) | null>(null);

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

  // Full state fetch via API — used on reconnect & polling fallback.
  // Uses /api/session/[id]/state which sanitizes monster data server-side.
  const fetchFullState = useCallback(async (_eid: string) => {
    try {
      const res = await fetch(`/api/session/${sessionId}/state`);
      if (!res.ok) return;
      const { data } = await res.json();
      if (!data) return;
      if (data.encounter) {
        setRound(data.encounter.round_number ?? 1);
        updateTurnIndex(data.encounter.current_turn_index ?? 0);
        setActive(data.encounter.is_active ?? false);
        if (data.encounter.id) setCurrentEncounterId(data.encounter.id);
      }
      if (data.combatants) {
        updateCombatants(data.combatants);
      }
      // Mesa model: update DM plan from API response
      if (data.dm_plan) {
        useSubscriptionStore.getState().setSessionDmPlan(
          (["free","pro","mesa"].includes(data.dm_plan) ? data.dm_plan : "free") as Plan
        );
      }
    } catch {
      // Silent failure — will retry
    }
  }, [sessionId, updateTurnIndex, updateCombatants]);

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
        .on("broadcast", { event: "session:state_sync" }, ({ payload }) => {
          if (payload.combatants) updateCombatants(payload.combatants);
          if (payload.round_number !== undefined) setRound(payload.round_number);
          if (payload.current_turn_index !== undefined) updateTurnIndex(payload.current_turn_index);
          setNextCombatantId(null); // Clear on state sync / combat end
          // state_sync means combat is active — update state to exit lobby
          setActive(true);
          if (payload.encounter_id) setCurrentEncounterId(payload.encounter_id);
        })
        .on("broadcast", { event: "combat:turn_advance" }, ({ payload }) => {
          lastTurnBroadcastRef.current = Date.now();
          if (payload.current_turn_index !== undefined) updateTurnIndex(payload.current_turn_index);
          if (payload.round_number !== undefined) setRound(payload.round_number);
          setNextCombatantId(payload.next_combatant_id ?? null);
        })
        .on("broadcast", { event: "combat:hp_update" }, ({ payload }) => {
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
                // Monster/NPC: only hp_status is sent (no exact numbers)
                if (payload.hp_status && payload.current_hp === undefined) {
                  return { ...c, hp_status: payload.hp_status };
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
        .on("broadcast", { event: "combat:condition_change" }, ({ payload }) => {
          if (payload.combatant_id) {
            updateCombatants((prev) =>
              prev.map((c) =>
                c.id === payload.combatant_id
                  ? { ...c, conditions: payload.conditions }
                  : c
              )
            );
          }
        })
        .on("broadcast", { event: "combat:defeated_change" }, ({ payload }) => {
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
        .on("broadcast", { event: "combat:combatant_add" }, ({ payload }) => {
          if (payload.combatant) {
            updateCombatants((prev) => [...prev, payload.combatant]);
            // Detect late-join acceptance: DM added our player combatant
            if (lateJoinRequestIdRef.current && !lateJoinRegisteredRef.current &&
                payload.combatant.is_player &&
                payload.combatant.name === lateJoinDataRef.current?.name) {
              lateJoinRegisteredRef.current = true;
              if (lateJoinTimeoutRef.current) {
                clearTimeout(lateJoinTimeoutRef.current);
                lateJoinTimeoutRef.current = null;
              }
              lateJoinRequestIdRef.current = null;
              setLateJoinStatus("accepted");
              setIsRegistered(true);
              setRegisteredName(payload.combatant.name);
              // Mark token with player_name only (combatant already created by DM)
              if (lateJoinDataRef.current) {
                markPlayerToken(effectiveTokenId, sessionId, lateJoinDataRef.current.name)
                  .catch(() => { /* Token may already be marked — ignore */ });
              }
            }
          }
        })
        .on("broadcast", { event: "combat:combatant_remove" }, ({ payload }) => {
          if (payload.combatant_id) {
            updateCombatants((prev) => prev.filter((c) => c.id !== payload.combatant_id));
          }
        })
        .on("broadcast", { event: "combat:version_switch" }, ({ payload }) => {
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
        .on("broadcast", { event: "combat:stats_update" }, ({ payload }) => {
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
        .on("broadcast", { event: "combat:initiative_reorder" }, ({ payload }) => {
          if (payload.combatants) {
            updateCombatants(payload.combatants);
          }
        })
        .on("broadcast", { event: "combat:late_join_response" }, ({ payload }) => {
          if (payload.request_id !== lateJoinRequestIdRef.current) return;
          // Clear the 60s timeout since DM responded
          if (lateJoinTimeoutRef.current) {
            clearTimeout(lateJoinTimeoutRef.current);
            lateJoinTimeoutRef.current = null;
          }
          if (payload.accepted && !lateJoinRegisteredRef.current) {
            lateJoinRegisteredRef.current = true;
            setLateJoinStatus("accepted");
            // Register the player in DB now that DM accepted
            if (lateJoinDataRef.current) {
              registerPlayerCombatant(effectiveTokenId, sessionId, lateJoinDataRef.current)
                .then(() => {
                  setIsRegistered(true);
                  setRegisteredName(lateJoinDataRef.current?.name);
                })
                .catch((err) => {
                  setLateJoinStatus("idle");
                  lateJoinRegisteredRef.current = false;
                  toast.error(tRef.current("registerError"));
                  captureError(err, {
                    component: "PlayerJoinClient",
                    action: "registerAfterLateJoinAccept",
                    category: "realtime",
                    sessionId,
                  });
                });
            }
          } else {
            setLateJoinStatus("rejected");
          }
        })
        .on("broadcast", { event: "combat:rejoin_response" }, ({ payload }) => {
          if (payload.request_id !== rejoinRequestIdRef.current) return;
          if (payload.accepted) {
            setRejoinStatus("accepted");
            // DM approved — now transfer token ownership
            const charName = rejoinCharacterRef.current;
            if (charName) {
              (async () => {
                try {
                  const supabase = createClient();
                  const { data: { session: authSession } } = await supabase.auth.getSession();
                  const userId = authSession?.user?.id;
                  if (!userId) throw new Error("No auth session");
                  const { tokenId: rejoinedTokenId } = await rejoinAsPlayer(sessionId, charName, userId);
                  setEffectiveTokenId(rejoinedTokenId);
                  setIsRegistered(true);
                  setRegisteredName(charName);
                  setRejoinStatus("idle");
                } catch (err) {
                  setRejoinStatus("idle");
                  toast.error(tRef.current("rejoin_error"));
                  captureError(err instanceof Error ? err : new Error(String(err)), {
                    component: "PlayerJoinClient", action: "rejoinAfterApproval", category: "auth",
                  });
                }
              })();
            }
          } else {
            setRejoinStatus("rejected");
          }
        })
        .on("broadcast", { event: "combat:session_revoked" }, ({ payload }) => {
          // If our token was revoked (another device took over), disconnect gracefully
          if (payload.revoked_token_id === effectiveTokenId) {
            setIsRegistered(false);
            setRegisteredName(undefined);
            setRejoinStatus("idle");
            // Show persistent banner instead of silent toast
            setSessionRevokedBanner(true);
            if (sessionRevokedTimerRef.current) clearTimeout(sessionRevokedTimerRef.current);
            sessionRevokedTimerRef.current = setTimeout(() => setSessionRevokedBanner(false), 5000);
          }
        })
        .on("broadcast", { event: "player:joined" }, ({ payload }) => {
          if (payload.id && payload.name) {
            setJoinedPlayers((prev) => {
              if (prev.some((p) => p.id === payload.id)) return prev;
              return [...prev, { id: payload.id, name: payload.name }];
            });
          }
        })
        .on("broadcast", { event: "session:weather_change" }, ({ payload }) => {
          if (payload.effect !== undefined) {
            setWeatherEffect(payload.effect);
          }
        })
        .on("broadcast", { event: "audio:play_sound" }, ({ payload }) => {
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
        .on("broadcast", { event: "audio:ambient_start" }, ({ payload }) => {
          // DM started ambient/music — play it on the player side (looped)
          if (payload.sound_id) {
            useAudioStore.getState().playAmbient(payload.sound_id);
          }
        })
        .on("broadcast", { event: "audio:ambient_stop" }, () => {
          // DM stopped all ambient/music — stop all on the player side
          useAudioStore.getState().stopAmbient();
        })
        .on("broadcast", { event: "audio:loop_stop" }, ({ payload }) => {
          // DM stopped a single loop — stop just that one on the player side
          if (payload.sound_id) {
            useAudioStore.getState().stopLoop(payload.sound_id);
          }
        })
        .on("broadcast", { event: "combat:started" }, ({ payload }) => {
          setActive(true);
          if (payload?.encounter_id) {
            setCurrentEncounterId(payload.encounter_id);
            fetchFullState(payload.encounter_id);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setDebouncedConnectionStatus("connected");
            disconnectedAtRef.current = null;
            reconnectBackoffRef.current = 1000;
            // Stop polling if active
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            // Fetch full state on reconnect to catch anything missed
            if (encounterIdRef.current) fetchFullState(encounterIdRef.current);
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setDebouncedConnectionStatus("disconnected");
            if (!disconnectedAtRef.current) {
              disconnectedAtRef.current = Date.now();
            }
            // Start polling fallback after 3s (NFR9)
            if (pollFallbackTimerRef.current) clearTimeout(pollFallbackTimerRef.current);
            pollFallbackTimerRef.current = setTimeout(() => {
              pollFallbackTimerRef.current = null;
              if (disconnectedAtRef.current && encounterIdRef.current) {
                startPolling(encounterIdRef.current);
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pollFallbackTimerRef.current) {
        clearTimeout(pollFallbackTimerRef.current);
        pollFallbackTimerRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
        connectionTimerRef.current = null;
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      // Clean up story 2 timer refs
      if (hpDeltaTimerRef.current) clearTimeout(hpDeltaTimerRef.current);
      if (deathSaveResolutionTimerRef.current) clearTimeout(deathSaveResolutionTimerRef.current);
      if (sessionRevokedTimerRef.current) clearTimeout(sessionRevokedTimerRef.current);
      if (lateJoinMaxTimeoutRef.current) clearTimeout(lateJoinMaxTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Channel setup must only re-run on auth/session changes; callbacks use refs internally and adding them would cause constant reconnects
  }, [authReady, sessionId, fetchFullState]);

  // Polling fallback for late-join: if broadcast doesn't arrive, check server.
  // Runs while "waiting" OR "rejected" (timeout fired but DM may still accept later).
  // Stops only when "accepted" or "idle" (user cancelled).
  useEffect(() => {
    const shouldPoll = (lateJoinStatus === "waiting" || lateJoinStatus === "polling" || lateJoinStatus === "rejected") && !!sessionId && !!lateJoinDataRef.current;
    if (!shouldPoll) return;

    const poll = async () => {
      try {
        if (lateJoinRegisteredRef.current) return; // Already resolved
        const res = await fetch(`/api/session/${sessionId}/state`);
        if (!res.ok) return;
        const { data } = await res.json();
        if (!data?.combatants || !lateJoinDataRef.current) return;

        const playerName = lateJoinDataRef.current.name;
        const found = data.combatants.find(
          (c: { is_player?: boolean; name?: string }) =>
            c.is_player && c.name === playerName
        );

        if (found && !lateJoinRegisteredRef.current) {
          lateJoinRegisteredRef.current = true;
          if (lateJoinTimeoutRef.current) {
            clearTimeout(lateJoinTimeoutRef.current);
            lateJoinTimeoutRef.current = null;
          }
          lateJoinRequestIdRef.current = null;
          setLateJoinStatus("accepted");
          setIsRegistered(true);
          setRegisteredName(playerName);
          // Only mark token — combatant already created by DM
          markPlayerToken(effectiveTokenId, sessionId, playerName)
            .catch(() => { /* Token may already be marked — ignore */ });
        }
      } catch {
        /* silent — will retry on next poll */
      }
    };

    // First poll after 3s, then every 5s
    const firstPoll = setTimeout(poll, 3000);
    const interval = setInterval(poll, 5000);

    return () => {
      clearTimeout(firstPoll);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effectiveTokenId is stable after auth init
  }, [lateJoinStatus, sessionId, effectiveTokenId]);

  // Visibility change handler — reconnect when phone unlocks / tab regains focus
  useEffect(() => {
    if (!authReady || !sessionId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Phone unlocked or tab re-focused — fetch full state immediately
        if (encounterIdRef.current) fetchFullState(encounterIdRef.current);

        // If realtime is disconnected, force reconnect via the same createChannel function
        // (which re-attaches all broadcast event listeners — the previous inline version did not)
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
      }
    };

    // Also handle online/offline events for network loss
    const handleOnline = () => {
      if (encounterIdRef.current) fetchFullState(encounterIdRef.current);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [authReady, sessionId, fetchFullState]);

  // Polling fallback — fetch latest state from DB (mobile-friendly interval).
  // Clears any previous interval before starting so second-disconnect restarts correctly.
  const startPolling = (eid: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const interval = isMobile ? 5000 : 2000;
    pollIntervalRef.current = setInterval(() => fetchFullState(eid), interval);
  };

  // Turn-sync polling fallback: periodically fetch state to catch missed
  // combat:turn_advance broadcasts (Supabase Realtime is unreliable DM→player).
  // Skips fetch if a broadcast arrived recently to avoid redundant API calls.
  useEffect(() => {
    if (!active || !sessionId || !encounterIdRef.current) {
      if (turnPollRef.current) {
        clearInterval(turnPollRef.current);
        turnPollRef.current = null;
      }
      return;
    }
    const eid = encounterIdRef.current;
    turnPollRef.current = setInterval(() => {
      if (Date.now() - lastTurnBroadcastRef.current < 2000) return;
      fetchFullState(eid);
    }, 3000);
    return () => {
      if (turnPollRef.current) {
        clearInterval(turnPollRef.current);
        turnPollRef.current = null;
      }
    };
  }, [active, sessionId, fetchFullState]);

  // Player registration handler — MUST be before any early returns (Rules of Hooks)
  const handleRegister = useCallback(async (data: {
    name: string;
    initiative: number;
    hp: number | null;
    ac: number | null;
  }) => {
    await registerPlayerCombatant(effectiveTokenId, sessionId, data);
    setIsRegistered(true);
    setRegisteredName(data.name);

    // Track presence for DM's "Players Online" panel (B3-2)
    try {
      const supabase = createClient();
      const ch = supabase.channel(`presence:${sessionId}`, {
        config: { presence: { key: sessionId } },
      });
      ch.subscribe(async (status) => {
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

  // Rejoin handler — for returning players who lost their anonymous session (cookies cleared)
  // During active combat: sends a request to DM for approval instead of direct transfer
  // During lobby (no combat): transfers directly (DM can see and remove manually)
  const handleRejoin = useCallback(async (playerName: string) => {
    // If combat is NOT active, do direct rejoin (lobby mode — no approval needed)
    if (!active || !currentEncounterId) {
      try {
        const supabase = createClient();
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const userId = authSession?.user?.id;
        if (!userId) throw new Error("No auth session");

        const { tokenId: rejoinedTokenId } = await rejoinAsPlayer(sessionId, playerName, userId);
        setEffectiveTokenId(rejoinedTokenId);
        setIsRegistered(true);
        setRegisteredName(playerName);
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          component: "PlayerJoinClient",
          action: "rejoin",
          category: "auth",
          extra: { sessionId, playerName },
        });
        toast.error(tRef.current("rejoin_error"));
      }
      return;
    }

    // Combat is active — send rejoin request to DM for approval
    const requestId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    rejoinRequestIdRef.current = requestId;
    rejoinCharacterRef.current = playerName;
    setRejoinStatus("waiting");

    // Determine if this character has an active session
    const playerStatus = registeredPlayersWithStatus.find((p) => p.name === playerName);
    const isActiveSession = playerStatus?.isActive ?? false;

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "combat:rejoin_request",
        payload: {
          character_name: playerName,
          request_id: requestId,
          is_active_session: isActiveSession,
          sender_token_id: effectiveTokenId,
        },
      });
    } else {
      captureError(new Error("Cannot send rejoin request — channel not available"), {
        component: "PlayerJoinClient",
        action: "rejoin-request",
        category: "realtime",
      });
    }
  }, [sessionId, active, currentEncounterId, registeredPlayersWithStatus, effectiveTokenId]);

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
        },
      });
    } else {
      captureError(new Error("Cannot send late-join request — channel not available"), {
        component: "PlayerJoinClient",
        action: "late-join-request",
        category: "realtime",
      });
    }
    // After 15s without broadcast response, switch to polling-only mode.
    // Don't reject — DM may still accept; polling will pick it up.
    if (lateJoinTimeoutRef.current) clearTimeout(lateJoinTimeoutRef.current);
    lateJoinTimeoutRef.current = setTimeout(() => {
      if (lateJoinRequestIdRef.current === requestId && !lateJoinRegisteredRef.current) {
        setLateJoinStatus("polling");
      }
    }, 15_000);
    // B2: 2-minute maximum timeout — stop polling, show timeout message
    if (lateJoinMaxTimeoutRef.current) clearTimeout(lateJoinMaxTimeoutRef.current);
    lateJoinMaxTimeoutRef.current = setTimeout(() => {
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
        prefilledCharacters={prefilledCharacters}
        registeredPlayerNames={registeredPlayerNames}
        registeredPlayersWithStatus={registeredPlayersWithStatus}
        onRejoin={handleRejoin}
        rejoinStatus={rejoinStatus}
        onRejoinRetry={() => setRejoinStatus("idle")}
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
              setRejoinStatus("idle");
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

        {/* Spell Oracle (Story 5-4) */}
        {showOracle && (
          <div className="bg-card border border-border rounded-md p-4" data-testid="player-oracle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground text-sm font-medium">{t("spell_oracle_title")}</h3>
              <button
                type="button"
                onClick={() => setShowOracle(false)}
                className="text-muted-foreground hover:text-foreground/80 text-sm min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-label={t("spell_oracle_close")}
              >
                ✕
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
          weatherEffect={weatherEffect}
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
          sessionId={sessionId}
          hpDelta={hpDelta}
          deathSaveResolution={deathSaveResolution}
          onEndTurn={() => {
            const ch = channelRef.current;
            if (!ch || connectionStatus !== "connected") {
              toast.error(tRef.current("sync_offline"));
              return;
            }
            ch.send({
              type: "broadcast",
              event: "player:end_turn",
              payload: { player_name: registeredName },
            });
          }}
          onDeathSave={(combatantId, result) => {
            const ch = channelRef.current;
            if (!ch || connectionStatus !== "connected") {
              toast.error(tRef.current("sync_offline"));
              return;
            }
            // Broadcast to DM
            ch.send({
              type: "broadcast",
              event: "player:death_save",
              payload: {
                player_name: registeredName,
                combatant_id: combatantId,
                result,
              },
            });
            // Optimistic local update — show the dot immediately
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
        />
      </div>
    </div>
  );
}
