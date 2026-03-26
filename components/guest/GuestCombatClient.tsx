"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useGuestCombatStore, getGuestNumberedName } from "@/lib/stores/guest-combat-store";
import { RulesetSelector } from "@/components/session/RulesetSelector";
import { CombatantSetupRow } from "@/components/combat/CombatantSetupRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";
import { CombatantRow } from "@/components/combat/CombatantRow";
import { AddCombatantForm } from "@/components/combat/AddCombatantForm";
import { GuestUpsellModal } from "@/components/guest/GuestUpsellModal";
import { MonsterSearchPanel } from "@/components/combat/MonsterSearchPanel";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { assignInitiativeOrder, sortByInitiative, rollInitiativeForCombatant, adjustInitiativeAfterReorder } from "@/lib/utils/initiative";
import { useInitiativeRolling } from "@/lib/hooks/useInitiativeRolling";
import type { RulesetVersion } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";
import type { UpsellTrigger } from "@/components/guest/GuestUpsellModal";

interface AddRowForm {
  initiative: string;
  name: string;
  hp: string;
  ac: string;
  notes: string;
}

const EMPTY_ADD_ROW: AddRowForm = {
  initiative: "",
  name: "",
  hp: "",
  ac: "",
  notes: "",
};

// ─── Setup Phase ────────────────────────────────────────────────────────────

function GuestEncounterSetup({ onStartCombat }: { onStartCombat: () => void }) {
  const t = useTranslations("combat");
  const tCommon = useTranslations("common");

  const {
    combatants,
    addCombatant,
    removeCombatant,
    setInitiative,
    updateCombatantStats,
    updatePlayerNotes,
    reorderCombatants,
    resetCombat,
  } = useGuestCombatStore();

  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>("2014");
  const [addRow, setAddRow] = useState<AddRowForm>(EMPTY_ADD_ROW);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addRowGlow, setAddRowGlow] = useState(false);
  const [invalidInitIds, setInvalidInitIds] = useState<Set<string>>(new Set());
  const [addRowErrors, setAddRowErrors] = useState<Set<string>>(new Set());
  const lastSelectedMonster = useRef<{ id: string; version: RulesetVersion } | null>(null);

  const initInputRef = useRef<HTMLInputElement>(null);

  const { handleRollOne, handleRollAll, handleRollNpcs } = useInitiativeRolling(
    useGuestCombatStore,
    rulesetVersion
  );

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  // Bug #2: Clear stale validation error when combatants change (e.g. initiative filled)
  useEffect(() => {
    if (submitError) setSubmitError(null);
    if (invalidInitIds.size > 0) setInvalidInitIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatants]);

  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const numberedName = getGuestNumberedName(monster.name, useGuestCombatStore.getState().combatants);
      
      // Roll initiative instantly using the monster's DEX
      const rollResult = rollInitiativeForCombatant("tmp", monster.dex ?? undefined);

      addCombatant({
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
        dm_notes: "",
        player_notes: "",
      });

      // We still clear the add row to ensure a clean state
      setAddRow(EMPTY_ADD_ROW);
      lastSelectedMonster.current = null;
      setSubmitError(null);
    },
    [addCombatant]
  );

  const handleMonsterAdded = useCallback(() => {
    setAddRowGlow(false);
    requestAnimationFrame(() => {
      setAddRowGlow(true);
      setTimeout(() => setAddRowGlow(false), 1500);
    });
  }, []);

  const handleAddFromRow = useCallback(() => {
    const name = addRow.name.trim();
    if (!name) {
      setSubmitError(t("error_add_row_name"));
      setAddRowErrors(new Set(["name"]));
      return;
    }
    setAddRowErrors(new Set());
    const hp = addRow.hp.trim() ? parseInt(addRow.hp, 10) : 0;
    const ac = addRow.ac.trim() ? parseInt(addRow.ac, 10) : 0;

    const initVal = addRow.initiative.trim()
      ? parseInt(addRow.initiative, 10)
      : null;

    const sel = lastSelectedMonster.current;
    addCombatant({
      name,
      current_hp: isNaN(hp) || hp < 0 ? 0 : hp,
      max_hp: isNaN(hp) || hp < 0 ? 0 : hp,
      temp_hp: 0,
      ac: isNaN(ac) || ac < 0 ? 0 : ac,
      spell_save_dc: null,
      initiative: initVal !== null && !isNaN(initVal) ? Math.min(50, Math.max(-5, initVal)) : null,
      initiative_order: null,
      conditions: [],
      ruleset_version: sel?.version ?? null,
      is_defeated: false,
      is_player: false,
      monster_id: sel?.id ?? null,
      dm_notes: "",
      player_notes: addRow.notes.trim(),
    });

    lastSelectedMonster.current = null;
    setAddRow(EMPTY_ADD_ROW);
    setSubmitError(null);
    initInputRef.current?.focus();
  }, [addRow, addCombatant]);

  const handleRowInitChange = useCallback(
    (id: string, value: number | null) => setInitiative(id, value),
    [setInitiative]
  );
  const handleRowNameChange = useCallback(
    (id: string, name: string) => updateCombatantStats(id, { name }),
    [updateCombatantStats]
  );
  const handleRowHpChange = useCallback(
    (id: string, hp: number) => {
      updateCombatantStats(id, { max_hp: hp });
      const store = useGuestCombatStore.getState();
      const c = store.combatants.find((x) => x.id === id);
      if (c && c.current_hp !== hp) {
        store.hydrateCombatants(
          store.combatants.map((x) => x.id === id ? { ...x, current_hp: hp } : x)
        );
      }
    },
    [updateCombatantStats]
  );
  const handleRowAcChange = useCallback(
    (id: string, ac: number) => updateCombatantStats(id, { ac }),
    [updateCombatantStats]
  );
  const handleRowNotesChange = useCallback(
    (id: string, notes: string) => updatePlayerNotes(id, notes),
    [updatePlayerNotes]
  );

  const handleStartCombat = () => {
    if (combatants.length === 0) {
      setSubmitError(t("error_no_combatants"));
      return;
    }
    const missingInit = combatants.filter((c) => c.initiative === null);
    if (missingInit.length > 0) {
      setSubmitError(t("error_missing_init", { count: missingInit.length }));
      setInvalidInitIds(new Set(missingInit.map((c) => c.id)));
      return;
    }
    setSubmitError(null);
    onStartCombat();
  };

  const addRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFromRow();
    }
  };

  const inputClass =
    "bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px]";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("encounter_title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("encounter_description")}</p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />
      </div>

      {/* SRD Monster Search */}
      <MonsterSearchPanel
        rulesetVersion={rulesetVersion}
        onSelectMonster={handleSelectMonster}
        onMonsterAdded={handleMonsterAdded}
      />

      {/* Column headers — Sticky for usability in long lists */}
      <div className="sticky top-[72px] z-20 bg-background/95 backdrop-blur-sm py-2 -mx-2 px-4 flex items-center gap-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider border-b border-border/50 mb-1">
        <span className="w-5 flex-shrink-0" />
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_init")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_name")}</span>
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_hp")}</span>
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_ac")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_notes")}</span>
        <span className="w-[140px] flex-shrink-0" /> {/* actions spacer (Ver Ficha + Remover / Adicionar) */}
      </div>

      {/* Combatant list */}
      <div className="space-y-1" data-testid="setup-combatant-list" role="list" aria-label="Combatants">
        <SortableCombatantList
          combatants={combatants}
          onReorder={reorderCombatants}
          renderItem={(c, dragHandleProps) => (
            <CombatantSetupRow
              combatant={c}
              onInitiativeChange={handleRowInitChange}
              onNameChange={handleRowNameChange}
              onHpChange={handleRowHpChange}
              onAcChange={handleRowAcChange}
              onNotesChange={handleRowNotesChange}
              onRemove={removeCombatant}
              onRollInitiative={handleRollOne}
              dragHandleProps={dragHandleProps}
              highlightInit={invalidInitIds.has(c.id)}
            />
          )}
        />
        {combatants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/60 text-sm">
            {t("setup_empty")}
            <br />
            <span className="text-xs">{t("setup_empty_hint")}</span>
          </div>
        )}
      </div>

      {/* Add row */}
      <div
        className={`flex items-center gap-1.5 bg-card/50 border border-dashed border-border rounded-md px-2 py-1.5 transition-colors${addRowGlow ? " glow-gold-flash" : ""}`}
        data-testid="add-row"
        onKeyDown={addRowKeyDown}
      >
        <span className="w-5 text-center text-muted-foreground/20 text-sm flex-shrink-0">+</span>
        <input
          ref={initInputRef}
          type="number"
          value={addRow.initiative}
          onChange={(e) => setAddRow((f) => ({ ...f, initiative: e.target.value }))}
          onFocus={selectOnFocus}
          placeholder={t("setup_col_init")}
          min={-5}
          max={50}
          className={`${inputClass} w-16 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          data-testid="add-row-init"
        />
        <input
          type="text"
          value={addRow.name}
          onChange={(e) => {
            lastSelectedMonster.current = null;
            setAddRow((f) => ({ ...f, name: e.target.value }));
            if (addRowErrors.has("name")) setAddRowErrors(new Set());
          }}
          placeholder={t("setup_col_name")}
          className={`${inputClass} flex-1 min-w-0${addRowErrors.has("name") ? " field-error" : ""}`}
          aria-invalid={addRowErrors.has("name") || undefined}
          data-testid="add-row-name"
        />
        <input
          type="number"
          value={addRow.hp}
          onChange={(e) => setAddRow((f) => ({ ...f, hp: e.target.value }))}
          onFocus={selectOnFocus}
          placeholder={t("setup_col_hp")}
          min={1}
          className={`${inputClass} w-16 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          data-testid="add-row-hp"
        />
        <input
          type="number"
          value={addRow.ac}
          onChange={(e) => setAddRow((f) => ({ ...f, ac: e.target.value }))}
          onFocus={selectOnFocus}
          placeholder={t("setup_col_ac")}
          min={1}
          className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          data-testid="add-row-ac"
        />
        <input
          type="text"
          value={addRow.notes}
          onChange={(e) => setAddRow((f) => ({ ...f, notes: e.target.value }))}
          placeholder={t("setup_col_notes")}
          className={`${inputClass} flex-1 min-w-0 text-muted-foreground`}
          data-testid="add-row-notes"
        />
        <button
          type="button"
          onClick={handleAddFromRow}
          className="w-[140px] flex-shrink-0 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-500 transition-colors min-h-[32px] text-center"
          data-testid="add-row-btn"
        >
          {t("setup_add")}
        </button>
      </div>

      {submitError && (
        <p className="text-red-400 text-sm" role="alert">{submitError}</p>
      )}

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-2">
        {combatants.length > 0 ? (
          <button
            type="button"
            onClick={() => { resetCombat(); setAddRow(EMPTY_ADD_ROW); setSubmitError(null); lastSelectedMonster.current = null; }}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {tCommon("clear_all")}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-xs">
            {combatants.length > 0
              ? t(combatants.length === 1 ? "combatants_count" : "combatants_count_plural", { count: combatants.length })
              : ""}
          </p>
          {combatants.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRollAll}
                disabled={combatants.every((c) => c.initiative !== null)}
                className="px-2.5 py-1 text-xs font-medium rounded border border-border text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("roll_all_title")}
                data-testid="roll-all-init-btn"
              >
                🎲 {t("roll_all")}
              </button>
              <button
                type="button"
                onClick={handleRollNpcs}
                disabled={combatants.filter((c) => !c.is_player && c.initiative === null).length === 0}
                className="px-2.5 py-1 text-xs font-medium rounded border border-border text-muted-foreground hover:text-foreground hover:border-ring transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("roll_npcs_title")}
                data-testid="roll-npcs-init-btn"
              >
                🎲 {t("roll_npcs")}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleStartCombat}
            disabled={combatants.length === 0}
            className="px-5 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            data-testid="start-combat-btn"
          >
            {t("start_combat")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ───────────────────────────────────────────────────

export function GuestCombatClient() {
  const t = useTranslations("combat");
  const tCommon = useTranslations("common");
  const [showAddForm, setShowAddForm] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellTrigger, setUpsellTrigger] = useState<UpsellTrigger>("save");

  const {
    phase,
    combatants,
    currentTurnIndex,
    roundNumber,
    startCombat,
    advanceTurn,
    applyDamage,
    applyHealing,
    setTempHp,
    toggleCondition,
    setDefeated,
    removeCombatant,
    addCombatant,
    updateCombatantStats,
    setRulesetVersion,
    updateDmNotes,
    updatePlayerNotes,
    hydrateCombatants,
    resetCombat,
  } = useGuestCombatStore();

  const openUpsell = useCallback((trigger: UpsellTrigger) => {
    setUpsellTrigger(trigger);
    setUpsellOpen(true);
  }, []);

  const handleStartCombat = useCallback(() => {
    startCombat();
  }, [startCombat]);

  const handleAddCombatant = useCallback(
    (newCombatant: Omit<Combatant, "id">) => {
      addCombatant(newCombatant);
      const allCombatants = useGuestCombatStore.getState().combatants;
      const sorted = assignInitiativeOrder(sortByInitiative(allCombatants));
      hydrateCombatants(sorted);
      setShowAddForm(false);
    },
    [addCombatant, hydrateCombatants]
  );

  const handleRemoveCombatant = useCallback(
    (id: string) => {
      const store = useGuestCombatStore.getState();
      const idx = store.combatants.findIndex((c) => c.id === id);
      const wasCurrentTurn = idx === store.currentTurnIndex;
      const wasBeforeCurrent = idx < store.currentTurnIndex;

      removeCombatant(id);

      const updated = useGuestCombatStore.getState().combatants;
      if (updated.length === 0) {
        useGuestCombatStore.setState({ currentTurnIndex: 0 });
      } else if (wasCurrentTurn) {
        const clampedIdx = Math.min(store.currentTurnIndex, updated.length - 1);
        useGuestCombatStore.setState({ currentTurnIndex: clampedIdx });
      } else if (wasBeforeCurrent) {
        useGuestCombatStore.setState({ currentTurnIndex: store.currentTurnIndex - 1 });
      }

      const reordered = assignInitiativeOrder(updated);
      hydrateCombatants(reordered);
    },
    [removeCombatant, hydrateCombatants]
  );

  const handleApplyDamage = useCallback(
    (id: string, amount: number) => applyDamage(id, amount),
    [applyDamage]
  );
  const handleApplyHealing = useCallback(
    (id: string, amount: number) => applyHealing(id, amount),
    [applyHealing]
  );
  const handleSetTempHp = useCallback(
    (id: string, value: number) => setTempHp(id, value),
    [setTempHp]
  );
  const handleToggleCondition = useCallback(
    (id: string, condition: string) => toggleCondition(id, condition),
    [toggleCondition]
  );
  const handleSetDefeated = useCallback(
    (id: string, isDefeated: boolean) => setDefeated(id, isDefeated),
    [setDefeated]
  );
  const handleUpdateStats = useCallback(
    (id: string, stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null }) =>
      updateCombatantStats(id, stats),
    [updateCombatantStats]
  );
  const handleReorderCombatants = useCallback(
    (newOrder: Combatant[], movedId?: string) => {
      const store = useGuestCombatStore.getState();
      const currentCombatant = store.combatants[store.currentTurnIndex];
      const adjusted = movedId ? adjustInitiativeAfterReorder(newOrder, movedId) : newOrder;
      store.reorderCombatants(adjusted);
      if (currentCombatant) {
        const newIdx = useGuestCombatStore.getState().combatants.findIndex((c) => c.id === currentCombatant.id);
        if (newIdx !== -1 && newIdx !== store.currentTurnIndex) {
          useGuestCombatStore.setState({ currentTurnIndex: newIdx });
        }
      }
    },
    []
  );

  const handleSetInitiative = useCallback(
    (id: string, value: number | null) => {
      useGuestCombatStore.getState().setInitiative(id, value);
    },
    []
  );
  const handleSwitchVersion = useCallback(
    (id: string, version: RulesetVersion) => setRulesetVersion(id, version),
    [setRulesetVersion]
  );
  const handleUpdateDmNotes = useCallback(
    (id: string, notes: string) => updateDmNotes(id, notes),
    [updateDmNotes]
  );
  const handleUpdatePlayerNotes = useCallback(
    (id: string, notes: string) => updatePlayerNotes(id, notes),
    [updatePlayerNotes]
  );

  const handleEndEncounter = useCallback(() => {
    resetCombat();
  }, [resetCombat]);

  if (phase === "setup" || phase === "ended") {
    return (
      <>
        <GuestEncounterSetup onStartCombat={handleStartCombat} />
        <GuestUpsellModal
          isOpen={upsellOpen}
          onClose={() => setUpsellOpen(false)}
          trigger={upsellTrigger}
        />
      </>
    );
  }

  // Active combat view
  return (
    <>
      <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-testid="active-combat">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground font-semibold">
            {t("round")} <span className="font-mono text-gold">{roundNumber}</span>
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Encerrar combate */}
            <button
              type="button"
              onClick={handleEndEncounter}
              className="px-3 py-2 bg-red-900/20 text-red-400 font-medium rounded-md hover:bg-red-900/40 transition-all duration-[250ms] text-sm min-h-[44px]"
              aria-label="End encounter"
              data-testid="end-encounter-btn"
            >
              {t("end_session")}
            </button>

            {/* Salvar — intercept with upsell */}
            <button
              type="button"
              onClick={() => openUpsell("save")}
              className="px-3 py-2 bg-white/[0.06] text-muted-foreground font-medium rounded-md hover:bg-white/[0.1] transition-all duration-[250ms] text-sm min-h-[44px]"
              data-testid="save-btn"
            >
              {tCommon("save")}
            </button>

            <span className="text-muted-foreground text-xs">
              {t(combatants.length === 1 ? "combatants_count" : "combatants_count_plural", { count: combatants.length })}
            </span>

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
              onClick={advanceTurn}
              className="px-4 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
              aria-label="Advance to next turn"
              data-testid="next-turn-btn"
            >
              {t("next_turn")}
            </button>
          </div>
        </div>

        {showAddForm && (
          <AddCombatantForm
            onAdd={handleAddCombatant}
            onClose={() => setShowAddForm(false)}
          />
        )}

        <div
          role="list"
          aria-label={t("initiative_order")}
          data-testid="initiative-list"
          className="space-y-2"
        >
          <SortableCombatantList
            combatants={combatants}
            onReorder={handleReorderCombatants}
            renderItem={(c, dragHandleProps) => {
              const index = combatants.findIndex((x) => x.id === c.id);
              return (
                <CombatantRow
                  combatant={c}
                  isCurrentTurn={index === currentTurnIndex}
                  showActions
                  dragHandleProps={dragHandleProps}
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
                />
              );
            }}
          />
        </div>

        {/* Footer nudge */}
        <div className="pt-6 text-center text-sm text-muted-foreground/60">
          Curtiu a Taverna?{" "}
          <button
            type="button"
            onClick={() => openUpsell("save")}
            className="text-gold hover:underline underline-offset-2 transition-colors"
          >
            Crie sua conta e salve suas campanhas →
          </button>
        </div>
      </div>

      <GuestUpsellModal
        isOpen={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        trigger={upsellTrigger}
      />
    </>
  );
}
