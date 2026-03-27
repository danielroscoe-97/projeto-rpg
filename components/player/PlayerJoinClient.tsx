"use client";

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { claimPlayerToken, registerPlayerCombatant } from "@/lib/supabase/player-registration";
import { PlayerInitiativeBoard, type CombatLogEntry } from "@/components/player/PlayerInitiativeBoard";
import { PlayerLobby } from "@/components/player/PlayerLobby";
import { SyncIndicator } from "@/components/player/SyncIndicator";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";
import type { RulesetVersion } from "@/lib/types/database";
import { captureError } from "@/lib/errors/capture";


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
  const [showOracle, setShowOracle] = useState(false);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState<string | undefined>();
  const [joinedPlayers, setJoinedPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [nextCombatantId, setNextCombatantId] = useState<string | null>(null);
  const [effectiveTokenId, setEffectiveTokenId] = useState(tokenId);
  const [lateJoinStatus, setLateJoinStatus] = useState<"idle" | "waiting" | "accepted" | "rejected">("idle");
  const lateJoinRequestIdRef = useRef<string | null>(null);
  const lateJoinDataRef = useRef<{ name: string; initiative: number; hp: number | null; ac: number | null } | null>(null);
  const combatantsRef = useRef(initialCombatants);
  const turnIndexRef = useRef(currentTurnIndex);
  const disconnectedAtRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anonymous auth + claim token via server action (bypasses RLS)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        let userId: string;
        if (!session) {
          const { data, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) throw new Error(`anon-auth: ${authError.message}`);
          if (!data.user) throw new Error("anon-auth: no user returned");
          userId = data.user.id;
        } else {
          userId = session.user.id;
        }

        // Server action — creates per-player token if shared one is taken
        const claimedTokenId = await claimPlayerToken(tokenId, userId);
        setEffectiveTokenId(claimedTokenId);
        setAuthReady(true);
      } catch {
        setError(t("connection_error_detail"));
      }
    };
    initAuth();
  }, [tokenId, t]);

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
          if (payload.current_turn_index !== undefined) updateTurnIndex(payload.current_turn_index);
          if (payload.round_number !== undefined) setRound(payload.round_number);
          setNextCombatantId(payload.next_combatant_id ?? null);
        })
        .on("broadcast", { event: "combat:hp_update" }, ({ payload }) => {
          if (payload.combatant_id) {
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
          if (payload.accepted) {
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
        .on("broadcast", { event: "player:joined" }, ({ payload }) => {
          if (payload.id && payload.name) {
            setJoinedPlayers((prev) => {
              if (prev.some((p) => p.id === payload.id)) return prev;
              return [...prev, { id: payload.id, name: payload.name }];
            });
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
            setConnectionStatus("connected");
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
            setConnectionStatus("disconnected");
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
            setConnectionStatus("connecting");
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Channel setup must only re-run on auth/session changes; callbacks use refs internally and adding them would cause constant reconnects
  }, [authReady, sessionId, fetchFullState]);

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
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);
    const interval = isMobile ? 5000 : 2000;
    pollIntervalRef.current = setInterval(() => fetchFullState(eid), interval);
  };

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

  // Late-join request handler — broadcasts to DM channel; DM responds via combat:late_join_response
  const lateJoinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLateJoinRequest = useCallback(async (data: {
    name: string;
    initiative: number;
    hp: number | null;
    ac: number | null;
  }) => {
    const requestId = crypto.randomUUID();
    lateJoinRequestIdRef.current = requestId;
    lateJoinDataRef.current = data;
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
    }
    // Auto-reject after 60s if DM doesn't respond (B1-3 AC #6)
    if (lateJoinTimeoutRef.current) clearTimeout(lateJoinTimeoutRef.current);
    lateJoinTimeoutRef.current = setTimeout(() => {
      if (lateJoinRequestIdRef.current === requestId) {
        setLateJoinStatus("rejected");
        lateJoinRequestIdRef.current = null;
      }
    }, 60_000);
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4" data-testid="player-view">
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
        />
      </div>
    </div>
  );
}
