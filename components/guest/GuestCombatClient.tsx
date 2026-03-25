"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useGuestCombatStore, getGuestNumberedName } from "@/lib/stores/guest-combat-store";
import { buildMonsterIndex, searchMonsters } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { loadMonsters } from "@/lib/srd/srd-loader";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { RulesetSelector, VersionBadge } from "@/components/session/RulesetSelector";
import { CombatantSetupRow } from "@/components/combat/CombatantSetupRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";
import { CombatantRow } from "@/components/combat/CombatantRow";
import { AddCombatantForm } from "@/components/combat/AddCombatantForm";
import { GuestUpsellModal } from "@/components/guest/GuestUpsellModal";
import { SAMPLE_ENCOUNTER } from "@/constants/sample-encounter";
import { assignInitiativeOrder, sortByInitiative } from "@/lib/utils/initiative";
import type { RulesetVersion } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";
import type { UpsellTrigger } from "@/components/guest/GuestUpsellModal";

const DEBOUNCE_MS = 150;

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
  const pinCard = usePinnedCardsStore((s) => s.pinCard);

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
  const [srdQuery, setSrdQuery] = useState("");
  const [srdResults, setSrdResults] = useState<SrdMonster[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);
    loadMonsters(rulesetVersion)
      .then((monsters) => {
        if (!cancelled) {
          buildMonsterIndex(monsters);
          setIsSearching(false);
          if (srdQuery.trim()) {
            setSrdResults(
              searchMonsters(srdQuery, rulesetVersion).map((r) => r.item).slice(0, 6)
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSearching(false);
          setSearchError(t("search_monsters_error"));
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesetVersion]);

  useEffect(() => {
    if (isSearching) return;
    const timer = setTimeout(() => {
      setSrdResults(
        srdQuery.trim()
          ? searchMonsters(srdQuery, rulesetVersion).map((r) => r.item).slice(0, 6)
          : []
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [srdQuery, rulesetVersion, isSearching]);

  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const numberedName = getGuestNumberedName(monster.name, useGuestCombatStore.getState().combatants);
      setAddRow((prev) => ({
        ...prev,
        name: numberedName,
        hp: String(monster.hit_points),
        ac: String(monster.armor_class),
      }));
      setSrdQuery("");
      setSrdResults([]);
      initInputRef.current?.focus();
    },
    []
  );

  const handleAddFromRow = useCallback(() => {
    const name = addRow.name.trim();
    const hp = parseInt(addRow.hp, 10);
    const ac = parseInt(addRow.ac, 10);
    if (!name || isNaN(hp) || hp < 1 || isNaN(ac) || ac < 1) return;

    const initVal = addRow.initiative.trim()
      ? parseInt(addRow.initiative, 10)
      : null;

    addCombatant({
      name,
      current_hp: hp,
      max_hp: hp,
      temp_hp: 0,
      ac,
      spell_save_dc: null,
      initiative: initVal !== null && !isNaN(initVal) ? Math.min(30, Math.max(-5, initVal)) : null,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_player: false,
      monster_id: null,
      dm_notes: "",
      player_notes: addRow.notes.trim(),
    });

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
      <div className="space-y-1">
        <label className="text-foreground/80 text-xs font-medium block">
          {t("search_monsters")}
        </label>
        <input
          type="text"
          value={srdQuery}
          onChange={(e) => setSrdQuery(e.target.value)}
          placeholder={t("search_monsters_placeholder")}
          className={`${inputClass} w-full`}
          data-testid="srd-search-input"
        />
        {searchError && (
          <p className="text-red-400 text-xs" role="alert">{searchError}</p>
        )}
        {srdResults.length > 0 && (
          <ul
            className="bg-card border border-border rounded-md divide-y divide-white/[0.04] overflow-hidden"
            data-testid="srd-results"
          >
            {srdResults.map((monster) => (
              <li
                key={monster.id}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.04]"
              >
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 flex-wrap text-left cursor-pointer"
                  onClick={() => handleSelectMonster(monster)}
                >
                  <span className="text-foreground text-sm font-medium">{monster.name}</span>
                  <VersionBadge version={monster.ruleset_version} />
                  <span className="text-muted-foreground text-xs">
                    {t("monster_stats", { cr: monster.cr, hp: monster.hit_points, ac: monster.armor_class })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => pinCard("monster", monster.id, monster.ruleset_version)}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label={`Pin ${monster.name} stat block`}
                  title="Pin stat block"
                >
                  📌
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        <span className="w-5 flex-shrink-0" />
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_init")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_name")}</span>
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_hp")}</span>
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_ac")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_notes")}</span>
        <span className="w-14 flex-shrink-0" />
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
              dragHandleProps={dragHandleProps}
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
        className="flex items-center gap-1.5 bg-card/50 border border-dashed border-border rounded-md px-2 py-1.5"
        data-testid="add-row"
        onKeyDown={addRowKeyDown}
      >
        <span className="w-5 text-center text-muted-foreground/20 text-sm flex-shrink-0">+</span>
        <input
          ref={initInputRef}
          type="number"
          value={addRow.initiative}
          onChange={(e) => setAddRow((f) => ({ ...f, initiative: e.target.value }))}
          placeholder={t("setup_col_init")}
          min={-5}
          max={30}
          className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          data-testid="add-row-init"
        />
        <input
          type="text"
          value={addRow.name}
          onChange={(e) => setAddRow((f) => ({ ...f, name: e.target.value }))}
          placeholder={t("setup_col_name")}
          className={`${inputClass} flex-1 min-w-0`}
          data-testid="add-row-name"
        />
        <input
          type="number"
          value={addRow.hp}
          onChange={(e) => setAddRow((f) => ({ ...f, hp: e.target.value }))}
          placeholder={t("setup_col_hp")}
          min={1}
          className={`${inputClass} w-16 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          data-testid="add-row-hp"
        />
        <input
          type="number"
          value={addRow.ac}
          onChange={(e) => setAddRow((f) => ({ ...f, ac: e.target.value }))}
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
          className="w-14 flex-shrink-0 py-1.5 bg-gold/20 text-gold text-sm font-medium rounded hover:bg-gold/40 transition-colors min-h-[32px] text-center"
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
        <button
          type="button"
          onClick={() => resetCombat()}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Limpar tudo
        </button>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-xs">
            {combatants.length > 0
              ? `${combatants.length} combatant${combatants.length !== 1 ? "s" : ""}`
              : ""}
          </p>
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
    initializeWithSample,
    resetCombat,
  } = useGuestCombatStore();

  // On first load: if no session state, seed with sample encounter
  useEffect(() => {
    const store = useGuestCombatStore.getState();
    if (store.phase === "setup" && store.combatants.length === 0) {
      initializeWithSample(SAMPLE_ENCOUNTER);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              className="px-3 py-2 bg-white/[0.06] text-red-400 font-medium rounded-md hover:bg-red-900/30 transition-all duration-[250ms] text-sm min-h-[44px]"
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
              Salvar
            </button>

            <span className="text-muted-foreground text-xs">
              {combatants.length} {combatants.length === 1 ? t("combatant") : t("combatants")}
            </span>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="px-3 py-2 bg-white/[0.06] text-muted-foreground font-medium rounded-md hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
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

        <ul
          className="space-y-2"
          role="list"
          aria-label={t("initiative_order")}
          data-testid="initiative-list"
        >
          {combatants.map((c, index) => (
            <CombatantRow
              key={c.id}
              combatant={c}
              isCurrentTurn={index === currentTurnIndex}
              showActions
              onApplyDamage={handleApplyDamage}
              onApplyHealing={handleApplyHealing}
              onSetTempHp={handleSetTempHp}
              onToggleCondition={handleToggleCondition}
              onSetDefeated={handleSetDefeated}
              onRemoveCombatant={handleRemoveCombatant}
              onUpdateStats={handleUpdateStats}
              onSwitchVersion={handleSwitchVersion}
              onUpdateDmNotes={handleUpdateDmNotes}
              onUpdatePlayerNotes={handleUpdatePlayerNotes}
            />
          ))}
        </ul>

        {/* Footer nudge */}
        <div className="pt-6 text-center text-sm text-muted-foreground/60">
          Gostou?{" "}
          <button
            type="button"
            onClick={() => openUpsell("save")}
            className="text-gold hover:underline underline-offset-2 transition-colors"
          >
            Salve suas campanhas →
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
