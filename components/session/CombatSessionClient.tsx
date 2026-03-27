"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore } from "@/lib/stores/combat-store";
import { persistInitiativeAndStartCombat, persistInitiativeOrder } from "@/lib/supabase/session";
import { EncounterSetup } from "@/components/combat/EncounterSetup";
import { CombatantRow } from "@/components/combat/CombatantRow";

import { AddCombatantForm } from "@/components/combat/AddCombatantForm";
import type { RulesetVersion, PlayerCharacter } from "@/lib/types/database";
import { assignInitiativeOrder, sortByInitiative } from "@/lib/utils/initiative";
import { ShareSessionButton } from "@/components/session/ShareSessionButton";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  // Session created on-demand by EncounterSetup for sharing before combat
  const [onDemandSessionId, setOnDemandSessionId] = useState<string | null>(null);

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
    setShowAddForm(false);
  }, [addCombatantAction]);

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
    onUndoHp: () => useCombatStore.getState().undoLastHpChange(),
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

    const handleLateJoin = ({ payload }: { payload: Record<string, unknown> }) => {
      if (!active) return;
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

    ch.on("broadcast", { event: "combat:late_join_request" }, handleLateJoin);

    return () => {
      // Flag the handler as inactive so future events are ignored
      // (RealtimeChannel does not expose a per-listener remove method)
      active = false;
      // Dismiss any pending late-join toasts on unmount / combat end
      activeToastIds.forEach((id) => toast.dismiss(id));
    };
  }, [is_active, getSessionId, handleAddCombatant, t]);

  // Show unified setup if not yet active
  if (!is_active) {
    return <EncounterSetup onStartCombat={handleStartCombat} campaignId={campaignId} preloadedPlayers={preloadedPlayers} sessionId={sessionId} onSessionCreated={setOnDemandSessionId} />;
  }

  // Active combat view
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-testid="active-combat">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">
          {encounter_name && <span className="mr-2">{encounter_name}</span>}
          {t("round")} <span className="font-mono text-gold">{round_number}</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <ShareSessionButton sessionId={getSessionId()} />
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
            onClick={() => setShowAddForm((prev) => !prev)}
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

      {showAddForm && (
        <AddCombatantForm
          onAdd={handleAddCombatant}
          onClose={() => setShowAddForm(false)}
        />
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
