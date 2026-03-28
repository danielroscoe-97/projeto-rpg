"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore } from "@/lib/stores/combat-store";
import { persistInitiativeAndStartCombat, persistInitiativeOrder, persistNewCombatant } from "@/lib/supabase/session";
import { EncounterSetup } from "@/components/combat/EncounterSetup";
import { CombatantRow } from "@/components/combat/CombatantRow";

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
import { KeyboardCheatsheet } from "@/components/combat/KeyboardCheatsheet";
import { MonsterGroupHeader, getGroupInitiative, getGroupBaseName } from "@/components/combat/MonsterGroupHeader";
import { setLastHpMode } from "@/components/combat/HpAdjuster";
import { broadcastEvent, getDmChannel } from "@/lib/realtime/broadcast";
import { toast } from "sonner";
import type { Combatant } from "@/lib/types/combat";
import { loadCombatBackup } from "@/lib/stores/combat-persist";
import { DiceRollLog, type DiceRollEntry } from "@/components/combat/DiceRollLog";
import { DmAudioControls } from "@/components/audio/DmAudioControls";
import { useAudioStore } from "@/lib/stores/audio-store";
import { getPresetById } from "@/lib/utils/audio-presets";

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
  const [diceLog, setDiceLog] = useState<DiceRollEntry[]>([]);

  const { combatants, is_active, setError } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);
  const encounter_name = useCombatStore((s) => s.encounter_name);
  const expandedGroups = useCombatStore((s) => s.expandedGroups);

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
    handleEndEncounter,
    getSessionId,
  } = useCombatActions({ sessionId, onNavigate: (path) => router.push(path) });

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
        // Notify players that combat has started
        broadcastEvent(getSessionId(), {
          type: "session:state_sync",
          combatants: sorted,
          current_turn_index: 0,
          round_number: 1,
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
      // Notify players that combat has started
      broadcastEvent(session_id, {
        type: "session:state_sync",
        combatants: sorted,
        current_turn_index: 0,
        round_number: 1,
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
  const handleSelectMonster = useCallback((monster: SrdMonster) => {
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
      initiative_order: null,
      conditions: [],
      ruleset_version: monster.ruleset_version,
      is_defeated: false,
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
    });
  }, [addCombatantAction]);

  // Add a group of N monsters mid-combat
  const handleSelectMonsterGroup = useCallback((monster: SrdMonster, qty: number) => {
    const groupId = crypto.randomUUID();
    const currentCombatants = useCombatStore.getState().combatants;
    const newCombatants: Omit<Combatant, "id">[] = [];
    for (let i = 1; i <= qty; i++) {
      const existingNames = [...currentCombatants, ...newCombatants as Combatant[]]
        .filter((c) => !c.is_player && c.display_name)
        .map((c) => c.display_name!);
      const displayName = generateCreatureName(monster.type ?? null, existingNames);
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
        is_player: false,
        monster_id: monster.id,
        token_url: monster.token_url ?? null,
        creature_type: monster.type ?? null,
        display_name: displayName,
        monster_group_id: groupId,
        group_order: i,
        dm_notes: "",
        player_notes: "",
        player_character_id: null,
      });
    }
    for (const c of newCombatants) {
      addCombatantAction(c);
    }
  }, [addCombatantAction]);

  const addDiceRoll = useCallback((entry: Omit<DiceRollEntry, "id" | "timestamp">) => {
    setDiceLog((prev) => {
      const next = [...prev, { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }];
      return next.length > 50 ? next.slice(-50) : next;
    });
  }, []);

  // Listen for dice-roll-result events from ClickableRoll and feed into DiceRollLog
  useEffect(() => {
    function handleDiceRollEvent(e: Event) {
      const r = (e as CustomEvent).detail;
      if (!r || !r.notation) return;
      addDiceRoll({
        label: r.label || r.notation,
        expression: r.notation,
        rolls: (r.dice ?? []).map((d: { value: number }) => d.value),
        modifier: r.modifier ?? 0,
        total: r.total ?? 0,
      });
    }
    window.addEventListener("dice-roll-result", handleDiceRollEvent);
    return () => window.removeEventListener("dice-roll-result", handleDiceRollEvent);
  }, [addDiceRoll]);

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
      const reordered = [...combatants];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      handleReorderCombatants(reordered, moved.id);
    },
    cheatsheetOpen,
    onToggleCheatsheet: () => setCheatsheetOpen((v) => !v),
  });

  // Listen for late-join requests from players
  useEffect(() => {
    const sid = getSessionId();
    if (!sid || !is_active) return;
    const ch = getDmChannel(sid);
    const activeToastIds: string[] = [];
    let active = true;

    console.log("[DM] Late-join listener setup", { sid, state: (ch as unknown as { state: string }).state });

    const handleLateJoin = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
      console.log("[DM] Late-join request received", payload);
      const { player_name, hp: pHp, ac: pAc, initiative: pInit, request_id } = payload as {
        player_name: string; hp: number | null; ac: number | null; initiative: number; request_id: string;
      };

      const toastId = toast(
        t("late_join_notification", { name: player_name, initiative: pInit }),
        {
          duration: 60_000,
          action: {
            label: t("late_join_accept"),
            onClick: () => {
              // Accept: add as player combatant via mid-combat add
              handleAddCombatant({
                name: player_name,
                current_hp: pHp ?? 0,
                max_hp: pHp ?? 0,
                temp_hp: 0,
                ac: pAc ?? 0,
                spell_save_dc: null,
                initiative: pInit,
                initiative_order: null,
                conditions: [],
                ruleset_version: null,
                is_defeated: false,
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
              } as Omit<Combatant, "id">);
              broadcastEvent(sid, {
                type: "combat:late_join_response",
                request_id,
                accepted: true,
              } as import("@/lib/types/realtime").RealtimeEvent);
            },
          },
          cancel: {
            label: t("late_join_reject"),
            onClick: () => {
              broadcastEvent(sid, {
                type: "combat:late_join_response",
                request_id,
                accepted: false,
              } as import("@/lib/types/realtime").RealtimeEvent);
            },
          },
        }
      );
      activeToastIds.push(toastId as string);
    };

    // Remove any stale late-join bindings before adding the new one.
    // When this effect re-runs (e.g. handleAddCombatant changes), the old
    // .on() binding can't be removed via public API, so we clean it up via
    // the public `bindings` record to prevent duplicate handlers.
    try {
      const bindings = (ch as unknown as { bindings: Record<string, { filter: { event: string } }[]> }).bindings;
      const broadcastBindings = bindings?.broadcast;
      if (Array.isArray(broadcastBindings)) {
        for (let i = broadcastBindings.length - 1; i >= 0; i--) {
          if (broadcastBindings[i]?.filter?.event === "combat:late_join_request") {
            broadcastBindings.splice(i, 1);
          }
        }
      }
    } catch { /* bindings structure may differ across versions — ignore */ }

    ch.on("broadcast", { event: "combat:late_join_request" }, handleLateJoin);

    return () => {
      // Flag the handler as inactive so future events are ignored
      active = false;
      // Dismiss any pending late-join toasts on unmount / combat end
      activeToastIds.forEach((id) => toast.dismiss(id));
    };
  }, [is_active, getSessionId, handleAddCombatant, t]);

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

  // Show unified setup if not yet active
  if (!is_active) {
    return <EncounterSetup onStartCombat={handleStartCombat} campaignId={campaignId} preloadedPlayers={preloadedPlayers} sessionId={sessionId} onSessionCreated={setOnDemandSessionId} />;
  }

  // Active combat view
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-testid="active-combat">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-foreground font-semibold">
          {encounter_name && <span className="mr-2">{encounter_name}</span>}
          {t("round")} <span className="font-mono text-gold">{round_number}</span>
        </h2>
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
          <DmAudioControls />
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

      <CombatList
        combatants={combatants}
        currentTurnIndex={current_turn_index}
        focusedIndex={focusedIndex}
        expandedGroups={expandedGroups}
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
        onToggleGroupExpanded={(gid) => useCombatStore.getState().toggleGroupExpanded(gid)}
        onSetGroupInitiative={(gid, val) => {
          useCombatStore.getState().setGroupInitiative(gid, val);
          const updated = useCombatStore.getState().combatants;
          broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: updated });
          persistInitiativeOrder(
            updated.map((c) => ({ id: c.id, initiative_order: c.initiative_order, initiative: c.initiative }))
          ).catch(() => {});
        }}
        t={t}
      />

      <DiceRollLog entries={diceLog} className="max-h-[300px]" />

      <KeyboardCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
    </div>
  );
}

// ─── Grouped combat list ────────────────────────────────────────────────────

interface CombatListProps {
  combatants: Combatant[];
  currentTurnIndex: number;
  focusedIndex: number;
  expandedGroups: Record<string, boolean>;
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
  onToggleGroupExpanded: (groupId: string) => void;
  onSetGroupInitiative: (groupId: string, value: number) => void;
  t: ReturnType<typeof import("next-intl").useTranslations>;
}

/** Organizes combatants into groups and ungrouped items for rendering. */
function buildRenderItems(combatants: Combatant[]) {
  type RenderItem =
    | { kind: "single"; combatant: Combatant; index: number }
    | { kind: "group"; groupId: string; members: { combatant: Combatant; index: number }[] };

  const items: RenderItem[] = [];
  const seenGroups = new Set<string>();

  combatants.forEach((c, index) => {
    if (!c.monster_group_id) {
      items.push({ kind: "single", combatant: c, index });
      return;
    }
    if (seenGroups.has(c.monster_group_id)) return;
    seenGroups.add(c.monster_group_id);
    const members = combatants
      .map((m, i) => ({ combatant: m, index: i }))
      .filter((m) => m.combatant.monster_group_id === c.monster_group_id)
      .sort((a, b) => (a.combatant.group_order ?? 0) - (b.combatant.group_order ?? 0));
    items.push({ kind: "group", groupId: c.monster_group_id, members });
  });

  return items;
}

function CombatList({
  combatants,
  currentTurnIndex,
  focusedIndex,
  expandedGroups,
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
  onToggleGroupExpanded,
  onSetGroupInitiative,
  t,
}: CombatListProps) {
  const renderItems = buildRenderItems(combatants);

  const renderCombatantRow = (c: Combatant, index: number) => (
    <div key={c.id} className={index === focusedIndex ? "ring-1 ring-gold/40 rounded-lg" : ""}>
      <CombatantRow
        combatant={c}
        isCurrentTurn={index === currentTurnIndex}
        showActions
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
      />
    </div>
  );

  return (
    <div
      role="list"
      aria-label={t("initiative_order")}
      data-testid="initiative-list"
      className="space-y-2"
    >
      {renderItems.map((item) => {
        if (item.kind === "single") {
          return renderCombatantRow(item.combatant, item.index);
        }
        const members = item.members.map((m) => m.combatant);
        const groupName = getGroupBaseName(members);
        return (
          <MonsterGroupHeader
            key={item.groupId}
            groupName={groupName}
            members={members}
            isExpanded={!!expandedGroups[item.groupId]}
            onToggle={() => onToggleGroupExpanded(item.groupId)}
            groupInitiative={getGroupInitiative(members)}
            onSetGroupInitiative={(val) => onSetGroupInitiative(item.groupId, val)}
          >
            {item.members.map((m) => renderCombatantRow(m.combatant, m.index))}
          </MonsterGroupHeader>
        );
      })}
    </div>
  );
}
