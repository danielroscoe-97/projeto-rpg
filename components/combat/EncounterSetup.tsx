"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore, getNumberedName } from "@/lib/stores/combat-store";
import { RulesetSelector } from "@/components/session/RulesetSelector";
import { CampaignLoader } from "@/components/session/CampaignLoader";
import { PresetLoader } from "@/components/presets/PresetLoader";
import { CombatantSetupRow } from "@/components/combat/CombatantSetupRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";
import { MonsterSearchPanel } from "@/components/combat/MonsterSearchPanel";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { useInitiativeRolling } from "@/lib/hooks/useInitiativeRolling";
import { rollInitiativeForCombatant } from "@/lib/utils/initiative";
import type { RulesetVersion, PlayerCharacter, MonsterPresetEntry } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";

interface EncounterSetupProps {
  onStartCombat: (encounterName?: string) => Promise<void>;
  campaignId?: string | null;
  preloadedPlayers?: PlayerCharacter[];
}

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

export function EncounterSetup({ onStartCombat, campaignId, preloadedPlayers }: EncounterSetupProps) {
  const t = useTranslations("combat");
  const {
    combatants,
    addCombatant,
    removeCombatant,
    setInitiative,
    updateCombatantStats,
    updatePlayerNotes,
    reorderCombatants,
  } = useCombatStore();

  const [encounterName, setEncounterName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>("2014");
  const [addRow, setAddRow] = useState<AddRowForm>(EMPTY_ADD_ROW);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [addRowGlow, setAddRowGlow] = useState(false);
  const [invalidInitIds, setInvalidInitIds] = useState<Set<string>>(new Set());
  const [addRowErrors, setAddRowErrors] = useState<Set<string>>(new Set());
  const lastSelectedMonster = useRef<{ id: string; version: RulesetVersion } | null>(null);

  const initInputRef = useRef<HTMLInputElement>(null);

  const { handleRollOne, handleRollAll, handleRollNpcs } = useInitiativeRolling(
    useCombatStore,
    rulesetVersion
  );

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  // Bug #2: Clear stale validation error when combatants change
  useEffect(() => {
    if (submitError) setSubmitError(null);
    if (invalidInitIds.size > 0) setInvalidInitIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatants]);

  // Auto-load preloaded players from campaign selection (runs once on mount)
  const hasPreloaded = useRef(false);
  useEffect(() => {
    if (hasPreloaded.current || !preloadedPlayers || preloadedPlayers.length === 0) return;
    hasPreloaded.current = true;
    const currentCombatants = [...useCombatStore.getState().combatants];
    preloadedPlayers.forEach((pc) => {
      const numberedName = getNumberedName(pc.name, currentCombatants);
      const newCombatant: Omit<Combatant, "id"> = {
        name: numberedName,
        current_hp: pc.max_hp,
        max_hp: pc.max_hp,
        temp_hp: 0,
        ac: pc.ac,
        spell_save_dc: pc.spell_save_dc,
        initiative: null,
        initiative_order: null,
        conditions: [],
        ruleset_version: null,
        is_defeated: false,
        is_player: true,
        monster_id: null,
        dm_notes: "",
        player_notes: "",
      };
      addCombatant(newCombatant);
      currentCombatants.push({ ...newCombatant, id: crypto.randomUUID() });
    });
  }, [preloadedPlayers, addCombatant]);

  // Auto-add monster with rolled initiative when selected from compendium
  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const numberedName = getNumberedName(monster.name, useCombatStore.getState().combatants);

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

      lastSelectedMonster.current = null;
      setAddRow(EMPTY_ADD_ROW);
    },
    [addCombatant]
  );

  // Trigger golden glow on the add row after monster selection
  const handleMonsterAdded = useCallback(() => {
    setAddRowGlow(false);
    requestAnimationFrame(() => {
      setAddRowGlow(true);
      setTimeout(() => setAddRowGlow(false), 1500);
    });
  }, []);

  // Add combatant from the add-row
  const handleAddFromRow = useCallback(() => {
    const name = addRow.name.trim();
    const hp = parseInt(addRow.hp, 10);
    const ac = parseInt(addRow.ac, 10);
    const errors = new Set<string>();
    if (!name) errors.add("name");
    if (errors.size > 0) {
      setAddRowErrors(errors);
      return;
    }
    setAddRowErrors(new Set());

    const initVal = addRow.initiative.trim()
      ? parseInt(addRow.initiative, 10)
      : null;

    const sel = lastSelectedMonster.current;
    addCombatant({
      name,
      current_hp: isNaN(hp) || hp < 1 ? 0 : hp,
      max_hp: isNaN(hp) || hp < 1 ? 0 : hp,
      temp_hp: 0,
      ac: isNaN(ac) || ac < 1 ? 0 : ac,
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

  // Load campaign players
  const handleLoadCampaign = useCallback(
    (characters: PlayerCharacter[]) => {
      const currentCombatants = [...useCombatStore.getState().combatants];
      characters.forEach((pc) => {
        const numberedName = getNumberedName(pc.name, currentCombatants);
        const newCombatant: Omit<Combatant, "id"> = {
          name: numberedName,
          current_hp: pc.max_hp,
          max_hp: pc.max_hp,
          temp_hp: 0,
          ac: pc.ac,
          spell_save_dc: pc.spell_save_dc,
          initiative: null,
          initiative_order: null,
          conditions: [],
          ruleset_version: null,
          is_defeated: false,
          is_player: true,
          monster_id: null,
          dm_notes: "",
          player_notes: "",
        };
        addCombatant(newCombatant);
        currentCombatants.push({ ...newCombatant, id: crypto.randomUUID() });
      });
    },
    [addCombatant]
  );

  // Load monsters from a preset
  const handleLoadPreset = useCallback(
    (presetMonsters: MonsterPresetEntry[]) => {
      const currentCombatants = [...useCombatStore.getState().combatants];
      presetMonsters.forEach((pm) => {
        for (let i = 0; i < pm.quantity; i++) {
          const numberedName = getNumberedName(pm.name, currentCombatants);
          const newCombatant: Omit<Combatant, "id"> = {
            name: numberedName,
            current_hp: pm.hp,
            max_hp: pm.hp,
            temp_hp: 0,
            ac: pm.ac,
            spell_save_dc: null,
            initiative: null,
            initiative_order: null,
            conditions: [],
            ruleset_version: rulesetVersion,
            is_defeated: false,
            is_player: false,
            monster_id: pm.monster_id,
            dm_notes: "",
            player_notes: "",
          };
          addCombatant(newCombatant);
          currentCombatants.push({ ...newCombatant, id: crypto.randomUUID() });
        }
      });
    },
    [addCombatant, rulesetVersion]
  );

  // Row edit handlers
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
      // Pre-combat: max_hp and current_hp are always equal
      updateCombatantStats(id, { max_hp: hp });
      // Also update current_hp to match — applyHealing won't help here since max may be lower
      const store = useCombatStore.getState();
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

  const handleDuplicate = useCallback(
    (source: Combatant) => {
      addCombatant({
        name: getNumberedName(source.name, useCombatStore.getState().combatants),
        current_hp: source.max_hp,
        max_hp: source.max_hp,
        temp_hp: 0,
        ac: source.ac,
        spell_save_dc: source.spell_save_dc,
        initiative: null,
        initiative_order: null,
        conditions: [],
        ruleset_version: source.ruleset_version,
        is_defeated: false,
        is_player: source.is_player,
        monster_id: source.monster_id,
        dm_notes: "",
        player_notes: "",
      });
    },
    [addCombatant]
  );

  // Start combat
  const handleStartCombat = async () => {
    const trimmedName = encounterName.trim();
    if (!trimmedName) {
      setNameError(true);
      setSubmitError(t("error_encounter_name_required"));
      return;
    }
    setNameError(false);
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
    setIsPending(true);
    try {
      await onStartCombat(trimmedName);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("error_start_combat")
      );
    } finally {
      setIsPending(false);
    }
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("encounter_title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("encounter_description")}
        </p>
      </div>

      {/* Encounter name */}
      <div>
        <label htmlFor="encounter-name" className="text-sm font-medium text-foreground">
          {t("encounter_name_label")} <span className="text-red-400">*</span>
        </label>
        <input
          id="encounter-name"
          type="text"
          value={encounterName}
          onChange={(e) => {
            setEncounterName(e.target.value);
            if (nameError) setNameError(false);
          }}
          placeholder={t("encounter_name_placeholder")}
          maxLength={60}
          className={`mt-1 w-full max-w-md ${inputClass}${nameError ? " field-error" : ""}`}
          aria-invalid={nameError || undefined}
          aria-describedby={nameError ? "encounter-name-error" : undefined}
          data-testid="encounter-name-input"
        />
        {nameError && (
          <p id="encounter-name-error" className="text-red-400 text-xs mt-1">
            {t("error_encounter_name_required")}
          </p>
        )}
      </div>

      {/* Toolbar: Ruleset + SRD Search + Campaign Loader + Preset Loader */}
      <div className="flex items-end gap-3 flex-wrap">
        <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />
        <CampaignLoader onLoad={handleLoadCampaign} />
        <PresetLoader onLoad={handleLoadPreset} />
      </div>

      {/* SRD Monster Search */}
      <MonsterSearchPanel
        rulesetVersion={rulesetVersion}
        onSelectMonster={handleSelectMonster}
        onMonsterAdded={handleMonsterAdded}
      />

      {/* Column headers — always visible, aligned with both rows and add-row */}
      <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        <span className="w-5 flex-shrink-0" /> {/* drag handle / + icon spacer */}
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_init")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_name")}</span>
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_hp")}</span>
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_ac")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_notes")}</span>
        <span className="w-[170px] flex-shrink-0" /> {/* actions spacer (Duplicar + Ver Ficha + Remover / Adicionar) */}
      </div>

      {/* Combatant list (insertion order, drag-reorderable) */}
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
              onDuplicate={handleDuplicate}
              onNotesChange={handleRowNotesChange}
              onRemove={removeCombatant}
              onRollInitiative={handleRollOne}
              dragHandleProps={dragHandleProps}
              highlightInit={invalidInitIds.has(c.id)}
            />
          )}
        />

        {/* Empty state */}
        {combatants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/60 text-sm">
            {t("setup_empty")}
            <br />
            <span className="text-xs">{t("setup_empty_hint")}</span>
            <br />
            <span className="text-xs">{t("setup_empty_preset_hint")}</span>
          </div>
        )}
      </div>

      {/* Bottom add-row — always visible */}
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
          aria-label={t("setup_init_aria")}
          className={`${inputClass} w-16 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          data-testid="add-row-init"
        />
        <input
          type="text"
          value={addRow.name}
          onChange={(e) => {
            lastSelectedMonster.current = null;
            setAddRow((f) => ({ ...f, name: e.target.value }));
            if (addRowErrors.has("name")) setAddRowErrors((prev) => { const n = new Set(prev); n.delete("name"); return n; });
          }}
          placeholder={t("setup_col_name")}
          className={`${inputClass} flex-1 min-w-0${addRowErrors.has("name") ? " field-error" : ""}`}
          aria-label={t("setup_name_aria")}
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
          aria-label={t("setup_hp_aria")}
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
          aria-label={t("setup_ac_aria")}
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
          className="w-[170px] flex-shrink-0 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-500 transition-colors min-h-[32px] text-center"
          data-testid="add-row-btn"
        >
          {t("setup_add")}
        </button>
      </div>

      {/* Error */}
      {submitError && (
        <p className="text-red-400 text-sm" role="alert">
          {submitError}
        </p>
      )}

      {/* Start Combat */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">
            {combatants.length > 0
              ? t(combatants.length === 1 ? "combatants_count" : "combatants_count_plural", { count: combatants.length })
              : ""}
          </p>
          {combatants.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2">
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
        </div>
        <button
          type="button"
          onClick={handleStartCombat}
          disabled={combatants.length === 0 || isPending}
          className="px-5 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          data-testid="start-combat-btn"
        >
          {isPending ? t("starting") : t("start_combat")}
        </button>
      </div>
    </div>
  );
}
