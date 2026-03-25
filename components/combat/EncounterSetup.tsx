"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore, getNumberedName } from "@/lib/stores/combat-store";
import { buildMonsterIndex, searchMonsters } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { loadMonsters } from "@/lib/srd/srd-loader";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { RulesetSelector, VersionBadge } from "@/components/session/RulesetSelector";
import { CampaignLoader } from "@/components/session/CampaignLoader";
import { CombatantSetupRow } from "@/components/combat/CombatantSetupRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";
import type { RulesetVersion, PlayerCharacter } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";

const DEBOUNCE_MS = 150;

interface EncounterSetupProps {
  onStartCombat: () => Promise<void>;
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

export function EncounterSetup({ onStartCombat }: EncounterSetupProps) {
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
  } = useCombatStore();

  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>("2014");
  const [addRow, setAddRow] = useState<AddRowForm>(EMPTY_ADD_ROW);
  const [srdQuery, setSrdQuery] = useState("");
  const [srdResults, setSrdResults] = useState<SrdMonster[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const initInputRef = useRef<HTMLInputElement>(null);

  // Load monster index on ruleset version change
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
              searchMonsters(srdQuery, rulesetVersion)
                .map((r) => r.item)
                .slice(0, 6)
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

  // Debounced SRD search
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

  // Auto-fill add row from SRD monster selection
  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const numberedName = getNumberedName(monster.name, useCombatStore.getState().combatants);
      setAddRow((prev) => ({
        ...prev,
        name: numberedName,
        hp: String(monster.hit_points),
        ac: String(monster.armor_class),
      }));
      setSrdQuery("");
      setSrdResults([]);
      // Focus initiative field so DM just types init and Enter
      initInputRef.current?.focus();
    },
    []
  );

  // Add combatant from the add-row
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
      initiative: initVal !== null && !isNaN(initVal) ? Math.min(50, Math.max(-5, initVal)) : null,
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

      {/* Toolbar: Ruleset + SRD Search + Campaign Loader */}
      <div className="flex items-end gap-3 flex-wrap">
        <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />
        <CampaignLoader onLoad={handleLoadCampaign} />
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
                data-testid={`srd-result-${monster.id}`}
              >
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 flex-wrap text-left cursor-pointer"
                  onClick={() => handleSelectMonster(monster)}
                >
                  <span className="text-foreground text-sm font-medium">
                    {monster.name}
                  </span>
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
                  data-testid={`pin-srd-${monster.id}`}
                  title="Pin stat block"
                >
                  📌
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Column headers — always visible, aligned with both rows and add-row */}
      <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        <span className="w-5 flex-shrink-0" /> {/* drag handle / + icon spacer */}
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_init")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_name")}</span>
        <span className="w-16 flex-shrink-0 text-center">{t("setup_col_hp")}</span>
        <span className="w-14 flex-shrink-0 text-center">{t("setup_col_ac")}</span>
        <span className="flex-1 min-w-0">{t("setup_col_notes")}</span>
        <span className="w-14 flex-shrink-0" /> {/* remove btn / Add btn spacer */}
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
            />
          )}
        />

        {/* Empty state */}
        {combatants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/60 text-sm">
            {t("setup_empty")}
            <br />
            <span className="text-xs">{t("setup_empty_hint")}</span>
          </div>
        )}
      </div>

      {/* Bottom add-row — always visible */}
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
          max={50}
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
