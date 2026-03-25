"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { linkAnonymousUser } from "@/lib/supabase/session-token";
import { PlayerInitiativeBoard } from "@/components/player/PlayerInitiativeBoard";
import { SyncIndicator } from "@/components/player/SyncIndicator";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";
import type { RulesetVersion } from "@/lib/types/database";

const SpellSearch = lazy(() =>
  import("@/components/oracle/SpellSearch").then((mod) => ({
    default: mod.SpellSearch,
  }))
);

interface PlayerCombatant {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  temp_hp: number;
  ac: number;
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  monster_id: string | null;
  ruleset_version: string | null;
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
}: PlayerJoinClientProps) {
  const t = useTranslations("player");
  const [combatants, setCombatants] = useState(initialCombatants);
  const [round, setRound] = useState(roundNumber);
  const [turnIndex, setTurnIndex] = useState(currentTurnIndex);
  const [active, setActive] = useState(isActive);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [showOracle, setShowOracle] = useState(false);
  const disconnectedAtRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Anonymous auth + link to token
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const { data, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) throw authError;
          if (data.user) {
            await linkAnonymousUser(tokenId, data.user.id);
          }
        } else {
          await linkAnonymousUser(tokenId, session.user.id);
        }
        setAuthReady(true);
      } catch {
        setError(t("connection_error_detail"));
      }
    };
    initAuth();
  }, [tokenId]);

  // Subscribe to realtime channel for combat updates
  useEffect(() => {
    if (!authReady || !sessionId) return;

    const supabase = createClient();
    const channel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "session:state_sync" }, ({ payload }) => {
        if (payload.combatants) setCombatants(payload.combatants);
        if (payload.round_number !== undefined) setRound(payload.round_number);
        if (payload.current_turn_index !== undefined) setTurnIndex(payload.current_turn_index);
        if (payload.is_active !== undefined) setActive(payload.is_active);
      })
      .on("broadcast", { event: "combat:turn_advance" }, ({ payload }) => {
        if (payload.current_turn_index !== undefined) setTurnIndex(payload.current_turn_index);
        if (payload.round_number !== undefined) setRound(payload.round_number);
      })
      .on("broadcast", { event: "combat:hp_update" }, ({ payload }) => {
        if (payload.combatant_id) {
          setCombatants((prev) =>
            prev.map((c) =>
              c.id === payload.combatant_id
                ? { ...c, current_hp: payload.current_hp, temp_hp: payload.temp_hp }
                : c
            )
          );
        }
      })
      .on("broadcast", { event: "combat:condition_change" }, ({ payload }) => {
        if (payload.combatant_id) {
          setCombatants((prev) =>
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
          setCombatants((prev) =>
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
          setCombatants((prev) => [...prev, payload.combatant]);
        }
      })
      .on("broadcast", { event: "combat:combatant_remove" }, ({ payload }) => {
        if (payload.combatant_id) {
          setCombatants((prev) => prev.filter((c) => c.id !== payload.combatant_id));
        }
      })
      .on("broadcast", { event: "combat:version_switch" }, ({ payload }) => {
        if (payload.combatant_id) {
          setCombatants((prev) =>
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
          setCombatants((prev) =>
            prev.map((c) => {
              if (c.id !== payload.combatant_id) return c;
              const updated = { ...c };
              if (payload.name !== undefined) updated.name = payload.name;
              if (payload.max_hp !== undefined) updated.max_hp = payload.max_hp;
              if (payload.current_hp !== undefined) updated.current_hp = payload.current_hp;
              if (payload.ac !== undefined) updated.ac = payload.ac;
              return updated;
            })
          );
        }
      })
      .on("broadcast", { event: "combat:initiative_reorder" }, ({ payload }) => {
        if (payload.combatants) {
          setCombatants(payload.combatants);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          disconnectedAtRef.current = null;
          // Stop polling if active
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
          if (!disconnectedAtRef.current) {
            disconnectedAtRef.current = Date.now();
          }
          // Start polling fallback after 3s (NFR9)
          setTimeout(() => {
            if (disconnectedAtRef.current && Date.now() - disconnectedAtRef.current >= 3000 && encounterId) {
              startPolling(encounterId);
            }
          }, 3000);
        } else {
          setConnectionStatus("connecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [authReady, sessionId, encounterId]);

  // Polling fallback — fetch latest state from DB every 2s (NFR9)
  const startPolling = (eid: string) => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const supabase = createClient();
        const { data: enc } = await supabase
          .from("encounters")
          .select("round_number, current_turn_index, is_active")
          .eq("id", eid)
          .single();
        if (enc) {
          setRound(enc.round_number ?? 1);
          setTurnIndex(enc.current_turn_index ?? 0);
          setActive(enc.is_active ?? false);
        }
        const { data: rows } = await supabase
          .from("combatants")
          .select("id, name, current_hp, max_hp, temp_hp, ac, initiative_order, conditions, is_defeated, is_player, monster_id, ruleset_version")
          .eq("encounter_id", eid)
          .order("initiative_order", { ascending: true });
        if (rows) setCombatants(rows);
      } catch {
        // Silent failure — will retry on next interval
      }
    }, 2000);
  };

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

  if (!active || !encounterId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-foreground text-xl font-semibold">{sessionName}</h1>
          <p className="text-muted-foreground text-sm">
            {t("waiting_dm")}
          </p>
        </div>
      </div>
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
          rulesetVersion={rulesetVersion}
        />
      </div>
    </div>
  );
}
