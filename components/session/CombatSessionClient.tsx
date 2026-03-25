"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore } from "@/lib/stores/combat-store";
import { persistInitiativeAndStartCombat } from "@/lib/supabase/session";
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

  const { combatants, startCombat, setEncounterId, is_active, setError } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);

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
    handleUpdateStats,
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

  const handleStartCombat = async () => {
    const store = useCombatStore.getState();
    const current = store.combatants;
    const sorted = assignInitiativeOrder(sortByInitiative(current));
    store.hydrateCombatants(sorted);

    if (store.encounter_id) {
      try {
        await persistInitiativeAndStartCombat(store.encounter_id, sorted);
        store.startCombat();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error_start_combat"));
      }
      return;
    }

    try {
      const { session_id, encounter_id } = await createEncounterWithCombatants(
        sorted,
        rulesetVersion,
        campaignId
      );
      store.setEncounterId(encounter_id, session_id);
      await persistInitiativeAndStartCombat(encounter_id, sorted);
      store.startCombat();
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
      setFocusedIndex(idx);
      const el = document.querySelector(`[data-testid="initiative-list"] > :nth-child(${idx + 1})`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    onToggleExpand: () => {
      const c = combatants[focusedIndex];
      if (c) {
        const btn = document.querySelector(`[data-testid="expand-toggle-${c.id}"]`) as HTMLButtonElement | null;
        btn?.click();
      }
    },
    onOpenHp: () => {
      const c = combatants[focusedIndex];
      if (c) {
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
    cheatsheetOpen,
    onToggleCheatsheet: () => setCheatsheetOpen((v) => !v),
  });

  // Show unified setup if not yet active
  if (!is_active) {
    return <EncounterSetup onStartCombat={handleStartCombat} campaignId={campaignId} preloadedPlayers={preloadedPlayers} />;
  }

  // Active combat view
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-testid="active-combat">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">
          {t("round")} <span className="font-mono text-gold">{round_number}</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <ShareSessionButton sessionId={getSessionId()} />
          <span className="text-muted-foreground text-xs">{combatants.length} {combatants.length === 1 ? t("combatant") : t("combatants")}</span>
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

      <ul
        className="space-y-2"
        role="list"
        aria-label={t("initiative_order")}
        data-testid="initiative-list"
      >
        {combatants.map((c, index) => (
          <div key={c.id} className={index === focusedIndex ? "ring-1 ring-gold/40 rounded-lg" : ""}>
            <CombatantRow
              combatant={c}
              isCurrentTurn={index === current_turn_index}
              showActions
              onApplyDamage={handleApplyDamage}
              onApplyHealing={handleApplyHealing}
              onSetTempHp={handleSetTempHp}
              onToggleCondition={handleToggleCondition}
              onSetDefeated={handleSetDefeated}
              onRemoveCombatant={handleRemoveCombatant}
              onUpdateStats={handleUpdateStats}
              onSetInitiative={(id, value) => useCombatStore.setState(s => ({ combatants: s.combatants.map(c => c.id === id ? { ...c, initiative: value } : c) }))}
              onSwitchVersion={handleSwitchVersion}
              onUpdateDmNotes={handleUpdateDmNotes}
              onUpdatePlayerNotes={handleUpdatePlayerNotes}
            />
          </div>
        ))}
      </ul>

      <KeyboardCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
    </div>
  );
}
