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
import type { RulesetVersion, PlayerCharacter, MonsterPresetEntry } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";

interface EncounterSetupProps {
  onStartCombat: () => Promise<void>;
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

  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>("2014");
  const [addRow, setAddRow] = useState<AddRowForm>(EMPTY_ADD_ROW);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [addRowGlow, setAddRowGlow] = useState(false);
  const [invalidInitIds, setInvalidInitIds] = useState<Set<string>>(new Set());
  const [addRowErrors, setAddRowErrors] = useState<Set<string>>(new Set());
  const lastSelectedMonster = useRef<{ id: string; version: RulesetVersion } | null>(null);

  const initInputRef = useRef<HTMLInputElement>(null);

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

  // Fill add row from monster search selection
  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const numberedName = getNumberedName(monster.name, useCombatStore.getState().combatants);
      lastSelectedMonster.current = { id: monster.id, version: monster.ruleset_version };
      setAddRow((prev) => ({
        ...prev,
        name: numberedName,
        hp: String(monster.hit_points),
        ac: String(monster.armor_class),
      }));
      initInputRef.current?.focus();
    },
    []
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
    if (isNaN(hp) || hp < 1) errors.add("hp");
    if (isNaN(ac) || ac < 1) errors.add("ac");
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
      current_hp: hp,
      max_hp: hp,
      temp_hp: 0,
      ac,
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

  // Start combat
  const handleStartCombat = async () => {
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
      await onStartCombat();
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
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_init")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_name")}</span>
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_hp")}</span>
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_ac")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_notes")}</span>
        <span className="w-[140px] flex-shrink-0" /> {/* actions spacer (Ver Ficha + Remover / Adicionar) */}
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
              onNotesChange={handleRowNotesChange}
              onRemove={removeCombatant}
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
          className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
          aria-invalid={addRowErrors.has("name") || undefined}
          data-testid="add-row-name"
        />
        <input
          type="number"
          value={addRow.hp}
          onChange={(e) => {
            setAddRow((f) => ({ ...f, hp: e.target.value }));
            if (addRowErrors.has("hp")) setAddRowErrors((prev) => { const n = new Set(prev); n.delete("hp"); return n; });
          }}
          onFocus={selectOnFocus}
          placeholder={t("setup_col_hp")}
          min={1}
          className={`${inputClass} w-16 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${addRowErrors.has("hp") ? " field-error" : ""}`}
          aria-invalid={addRowErrors.has("hp") || undefined}
          data-testid="add-row-hp"
        />
        <input
          type="number"
          value={addRow.ac}
          onChange={(e) => {
            setAddRow((f) => ({ ...f, ac: e.target.value }));
            if (addRowErrors.has("ac")) setAddRowErrors((prev) => { const n = new Set(prev); n.delete("ac"); return n; });
          }}
          onFocus={selectOnFocus}
          placeholder={t("setup_col_ac")}
          min={1}
          className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${addRowErrors.has("ac") ? " field-error" : ""}`}
          aria-invalid={addRowErrors.has("ac") || undefined}
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

      {/* Error */}
      {submitError && (
        <p className="text-red-400 text-sm" role="alert">
          {submitError}
        </p>
      )}

      {/* Start Combat */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-xs">
          {combatants.length > 0
            ? `${combatants.length} combatant${combatants.length !== 1 ? "s" : ""}`
            : ""}
        </p>
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
