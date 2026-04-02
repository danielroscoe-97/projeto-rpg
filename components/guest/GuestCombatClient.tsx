"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Share2, Lock, User, UserCircle, Sparkles, Skull, Undo2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useGuestCombatStore, getGuestNumberedName } from "@/lib/stores/guest-combat-store";
import { useGuestUndoStack } from "@/lib/hooks/useGuestUndoStack";
import { RulesetSelector } from "@/components/session/RulesetSelector";
import { CombatantSetupRow } from "@/components/combat/CombatantSetupRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";
import { CombatantRow } from "@/components/combat/CombatantRow";
import { MonsterGroupHeader, getGroupInitiative, getGroupBaseName } from "@/components/combat/MonsterGroupHeader";
import { CombatTimer } from "@/components/combat/CombatTimer";
import { TurnTimer } from "@/components/combat/TurnTimer";
import { CombatLeaderboard } from "@/components/combat/CombatLeaderboard";
import { DifficultyPoll } from "@/components/combat/DifficultyPoll";
import { useGuestCombatStats } from "@/lib/stores/guest-combat-stats";
import type { CombatantStats } from "@/lib/utils/combat-stats";
import { GuestUpsellModal } from "@/components/guest/GuestUpsellModal";
import { GuestExpiryModal } from "@/components/guest/GuestExpiryModal";
import { MonsterSearchPanel } from "@/components/combat/MonsterSearchPanel";
import { PlayerSpellBrowser } from "@/components/player/PlayerSpellBrowser";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { assignInitiativeOrder, sortByInitiative, rollInitiativeForCombatant, adjustInitiativeAfterReorder } from "@/lib/utils/initiative";
import { useInitiativeRolling } from "@/lib/hooks/useInitiativeRolling";
import { generateCreatureName } from "@/lib/utils/creature-name-generator";
import type { RulesetVersion } from "@/lib/types/database";
import type { Combatant, CombatantRole } from "@/lib/types/combat";
import { COMBATANT_ROLE_CYCLE } from "@/lib/types/combat";
import type { HpMode } from "@/components/combat/HpAdjuster";
import type { UpsellTrigger } from "@/components/guest/GuestUpsellModal";
import { useCombatKeyboardShortcuts } from "@/lib/hooks/useCombatKeyboardShortcuts";
import { setLastHpMode } from "@/components/combat/HpAdjuster";
import { KeyboardCheatsheet } from "@/components/combat/KeyboardCheatsheet";
import { applyGroupRename } from "@/lib/utils/group-rename";
import { playTurnSfx } from "@/lib/utils/turn-sfx";

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

const DEFAULT_ADD_ROW_ROLE: CombatantRole = "monster";

const ADD_ROW_ROLE_CONFIG: Record<CombatantRole, { icon: typeof User; color: string; label: string }> = {
  player: { icon: User, color: "text-blue-400 border-blue-400/30", label: "setup_role_player" },
  npc: { icon: UserCircle, color: "text-gold border-gold/30", label: "setup_role_npc" },
  summon: { icon: Sparkles, color: "text-purple-400 border-purple-400/30", label: "setup_role_summon" },
  monster: { icon: Skull, color: "text-red-400 border-red-400/30", label: "setup_role_monster" },
};

// ─── Setup Phase ────────────────────────────────────────────────────────────

function GuestEncounterSetup({ onStartCombat, onShareUpsell }: { onStartCombat: () => void; onShareUpsell: () => void }) {
  const t = useTranslations("combat");
  const tg = useTranslations("guest");
  const tCommon = useTranslations("common");

  const {
    combatants,
    addCombatant,
    addMonsterGroup,
    removeCombatant,
    setInitiative,
    updateCombatantStats,
    updatePlayerNotes,
    reorderCombatants,
    resetCombat,
  } = useGuestCombatStore();

  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>("2014");
  const [addRow, setAddRow] = useState<AddRowForm>(EMPTY_ADD_ROW);
  const [addRowRole, setAddRowRole] = useState<CombatantRole>(DEFAULT_ADD_ROW_ROLE);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [addRowGlow, setAddRowGlow] = useState(false);
  const [invalidInitIds, setInvalidInitIds] = useState<Set<string>>(new Set());
  const [addRowErrors, setAddRowErrors] = useState<Set<string>>(new Set());
  const lastSelectedMonster = useRef<{ id: string; version: RulesetVersion } | null>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initInputRef = useRef<HTMLInputElement>(null);

  // Cleanup glow timer on unmount
  useEffect(() => {
    return () => {
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  const { handleRollOne, handleRollAll, handleRollNpcs } = useInitiativeRolling(
    useGuestCombatStore,
    rulesetVersion
  );

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const handleConfirmClear = useCallback(() => {
    resetCombat();
    setAddRow(EMPTY_ADD_ROW);
    setAddRowRole(DEFAULT_ADD_ROW_ROLE);
    setSubmitError(null);
    lastSelectedMonster.current = null;
    setShowClearConfirm(false);
  }, [resetCombat]);

  // Bug #2: Clear stale validation error when combatants change (e.g. initiative filled)
  useEffect(() => {
    if (submitError) setSubmitError(null);
    if (invalidInitIds.size > 0) setInvalidInitIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reset validation state when combatants change; including submitError/invalidInitIds would cause infinite loop
  }, [combatants]);

  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const currentCombatants = useGuestCombatStore.getState().combatants;
      const numberedName = getGuestNumberedName(monster.name, currentCombatants);
      const existingNames = currentCombatants
        .filter((c) => !c.is_player && c.display_name)
        .map((c) => c.display_name!);
      const displayName = generateCreatureName(monster.type, existingNames);

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
        initiative_breakdown: { roll: rollResult.rolls[0], modifier: rollResult.modifier },
        initiative_order: null,
        conditions: [],
        ruleset_version: monster.ruleset_version,
        is_defeated: false,
        is_hidden: false,
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
        combatant_role: null,
        legendary_actions_total: null,
        legendary_actions_used: 0,
      });

      setAddRow(EMPTY_ADD_ROW);
      setAddRowRole(DEFAULT_ADD_ROW_ROLE);
      lastSelectedMonster.current = null;
      setSubmitError(null);
    },
    [addCombatant]
  );

  // Add a group of N monsters with shared group ID
  const handleSelectMonsterGroup = useCallback(
    (monster: SrdMonster, qty: number) => {
      const groupId = crypto.randomUUID();
      // Roll initiative once for the whole group (D&D 5e PHB p.189)
      const groupInitResult = rollInitiativeForCombatant("group", monster.dex ?? undefined);
      const groupInit = groupInitResult.total;
      const groupBreakdown = { roll: groupInitResult.rolls[0], modifier: groupInitResult.modifier };
      const currentCombatants = useGuestCombatStore.getState().combatants;
      const newCombatants: Omit<Combatant, "id">[] = [];
      // Generate ONE display name for the group, append numbers
      const existingNames = currentCombatants
        .filter((c) => !c.is_player && c.display_name)
        .map((c) => c.display_name!);
      const groupDisplayBase = generateCreatureName(monster.type ?? null, existingNames);
      for (let i = 1; i <= qty; i++) {
        const allExisting = [...currentCombatants, ...newCombatants] as Combatant[];
        newCombatants.push({
          name: getGuestNumberedName(monster.name, allExisting),
          current_hp: monster.hit_points,
          max_hp: monster.hit_points,
          temp_hp: 0,
          ac: monster.armor_class,
          spell_save_dc: null,
          initiative: groupInit,
          initiative_breakdown: groupBreakdown,
          initiative_order: null,
          conditions: [],
          ruleset_version: monster.ruleset_version,
          is_defeated: false,
          is_hidden: false,
          is_player: false,
          monster_id: monster.id,
          token_url: monster.token_url ?? null,
          creature_type: monster.type ?? null,
          display_name: `${groupDisplayBase} ${i}`,
          monster_group_id: groupId,
          group_order: i,
          dm_notes: "",
          player_notes: "",
          player_character_id: null,
          combatant_role: null,
          legendary_actions_total: null,
          legendary_actions_used: 0,
        });
      }
      addMonsterGroup(newCombatants);
      setAddRow(EMPTY_ADD_ROW);
    },
    [addMonsterGroup]
  );

  const handleMonsterAdded = useCallback(() => {
    setAddRowGlow(false);
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    requestAnimationFrame(() => {
      setAddRowGlow(true);
      glowTimerRef.current = setTimeout(() => {
        glowTimerRef.current = null;
        setAddRowGlow(false);
      }, 1500);
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
    const currentCombatants = useGuestCombatStore.getState().combatants;
    const existingNames = currentCombatants
      .filter((c) => !c.is_player && c.display_name)
      .map((c) => c.display_name!);
    const displayName = generateCreatureName(null, existingNames);
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
      is_hidden: false,
      is_player: !sel && addRowRole === "player",
      monster_id: sel?.id ?? null,
      token_url: null,
      creature_type: null,
      display_name: displayName,
      monster_group_id: null,
      group_order: null,
      dm_notes: "",
      player_notes: addRow.notes.trim(),
      player_character_id: null,
      combatant_role: sel ? null : addRowRole,
      legendary_actions_total: null,
      legendary_actions_used: 0,
    });

    lastSelectedMonster.current = null;
    setAddRow(EMPTY_ADD_ROW);
    // Keep addRowRole — user likely adds multiple combatants of the same role
    setSubmitError(null);
    initInputRef.current?.focus();
  }, [addRow, addRowRole, addCombatant, t]);

  const handleRowInitChange = useCallback(
    (id: string, value: number | null) => {
      const combatant = useGuestCombatStore.getState().combatants.find((c) => c.id === id);
      if (combatant?.monster_group_id) {
        if (value !== null) {
          useGuestCombatStore.getState().setGroupInitiative(combatant.monster_group_id, value);
        } else {
          const members = useGuestCombatStore.getState().combatants.filter(
            (c) => c.monster_group_id === combatant.monster_group_id
          );
          for (const m of members) useGuestCombatStore.getState().setInitiative(m.id, null);
        }
      } else {
        setInitiative(id, value);
      }
    },
    [setInitiative]
  );
  const handleRowNameChange = useCallback(
    (id: string, name: string) => {
      const combatant = useGuestCombatStore.getState().combatants.find((c) => c.id === id);
      if (combatant?.monster_group_id) {
        const groupMembers = useGuestCombatStore.getState().combatants
          .filter((c) => c.monster_group_id === combatant.monster_group_id)
          .sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));
        const newBase = name.replace(/\s+\d+$/, "");
        useGuestCombatStore.getState().hydrateCombatants(
          useGuestCombatStore.getState().combatants.map((c) => {
            const idx = groupMembers.findIndex((m) => m.id === c.id);
            return idx !== -1 ? { ...c, name: `${newBase} ${idx + 1}` } : c;
          })
        );
      } else {
        updateCombatantStats(id, { name });
      }
    },
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

  // Update display name — propagate to all group members if applicable
  const handleDisplayNameChange = useCallback(
    (id: string, displayName: string | null) => {
      if (!displayName) {
        updateCombatantStats(id, { display_name: displayName });
        return;
      }
      // A.7: Reuse shared group rename logic
      const result = applyGroupRename(
        useGuestCombatStore.getState().combatants,
        id,
        displayName
      );
      if (result.type === "group_rename") {
        useGuestCombatStore.setState((state) => ({
          combatants: state.combatants.map((c) => {
            const update = result.updates.get(c.id);
            return update ? { ...c, ...update } : c;
          }),
        }));
      } else {
        updateCombatantStats(id, { display_name: displayName });
      }
    },
    [updateCombatantStats]
  );

  const handleDuplicate = useCallback(
    (source: Combatant) => {
      const currentCombatants = useGuestCombatStore.getState().combatants;

      // Determine group order for duplicated combatant
      let groupOrder: number | null = null;
      if (source.monster_group_id) {
        const groupMembers = currentCombatants.filter(
          (c) => c.monster_group_id === source.monster_group_id
        );
        groupOrder = groupMembers.length + 1;
      }

      // Generate numbered name
      const baseName = source.name.replace(/\s+\d+$/, "");
      const numberedName = getGuestNumberedName(baseName, currentCombatants);

      // Generate display name
      const existingNames = currentCombatants
        .filter((c) => !c.is_player && c.display_name)
        .map((c) => c.display_name!);
      const displayName = source.is_player ? null : generateCreatureName(source.creature_type, existingNames);

      addCombatant({
        name: numberedName,
        current_hp: source.max_hp,
        max_hp: source.max_hp,
        temp_hp: 0,
        ac: source.ac,
        spell_save_dc: source.spell_save_dc,
        initiative: source.initiative,
        initiative_order: null,
        conditions: [],
        ruleset_version: source.ruleset_version,
        is_defeated: false,
        is_hidden: false,
        is_player: source.is_player,
        monster_id: source.monster_id,
        token_url: source.token_url,
        creature_type: source.creature_type,
        display_name: displayName,
        monster_group_id: source.monster_group_id,
        group_order: groupOrder,
        dm_notes: "",
        player_notes: "",
        player_character_id: null,
        combatant_role: null,
        legendary_actions_total: null,
        legendary_actions_used: 0,
      });
    },
    [addCombatant]
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
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-tour-id="welcome">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{t("encounter_title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("encounter_description")}</p>
        </div>
        {/* Share upsell — nudge guest to sign up for sharing */}
        <button
          type="button"
          onClick={onShareUpsell}
          className="px-3 py-2 text-sm font-medium rounded-md bg-white/[0.06] text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] flex items-center gap-1.5"
          title={tg("share_requires_account")}
          data-testid="guest-share-upsell"
        >
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          <Share2 className="w-4 h-4" aria-hidden="true" />
          {tg("share_upsell_cta")}
        </button>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />
      </div>

      {/* SRD Monster Search */}
      <div data-tour-id="monster-search">
        <MonsterSearchPanel
          rulesetVersion={rulesetVersion}
          onSelectMonster={handleSelectMonster}
          onSelectMonsterGroup={handleSelectMonsterGroup}
          onMonsterAdded={handleMonsterAdded}
          showManualAdd
          onManualAdd={(data) => {
            const currentCombatants = useGuestCombatStore.getState().combatants;
            const numberedName = getGuestNumberedName(data.name, currentCombatants);
            const existingNames = currentCombatants.filter((c: { is_player: boolean; display_name: string | null }) => !c.is_player && c.display_name).map((c: { display_name: string | null }) => c.display_name!);
            const displayName = generateCreatureName(null, existingNames);
            addCombatant({
              name: numberedName,
              current_hp: data.hp ?? 0,
              max_hp: data.hp ?? 0,
              temp_hp: 0,
              ac: data.ac ?? 0,
              spell_save_dc: null,
              initiative: data.initiative ?? null,
              initiative_order: null,
              conditions: [],
              ruleset_version: null,
              is_defeated: false,
              is_hidden: false,
              is_player: false,
              monster_id: null,
              token_url: null,
              creature_type: null,
              display_name: displayName,
              monster_group_id: null,
              group_order: null,
              dm_notes: "",
              player_notes: "",
              player_character_id: null,
              combatant_role: null,
              legendary_actions_total: null,
              legendary_actions_used: 0,
            });
          }}
        />
      </div>

      {/* Column headers — Sticky for usability in long lists */}
      <div
        className="sticky top-[72px] z-20 bg-background/95 backdrop-blur-sm py-2 -mx-2 px-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1 md:grid md:gap-x-1.5 md:items-center"
        style={{ gridTemplateColumns: "20px 64px 32px 1fr 64px 56px 1fr 170px" }}
      >
        <span /> {/* drag handle spacer */}
        <span className="w-12 md:w-auto text-center">{t("setup_col_init")}</span>
        <span className="hidden md:block" /> {/* token spacer */}
        <span className="flex-1 md:flex-none min-w-0">{t("setup_col_name")}</span>
        <span className="w-12 md:w-auto text-center">{t("setup_col_hp")}</span>
        <span className="w-10 md:w-auto text-center">{t("setup_col_ac")}</span>
        <span className="hidden md:block min-w-0">{t("setup_col_notes")}</span>
        <span className="hidden md:block" /> {/* actions spacer */}
      </div>

      {/* Combatant list */}
      <div className="space-y-1" data-testid="setup-combatant-list" data-tour-id="combatant-list" role="list" aria-label="Combatants">
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
              onDisplayNameChange={handleDisplayNameChange}
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


      {submitError && (
        <p className="text-red-400 text-sm" role="alert">{submitError}</p>
      )}

      {/* Clear confirmation banner */}
      {showClearConfirm && (
        <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 rounded-md px-3 py-2">
          <p className="text-sm text-foreground/80 flex-1">{t("clear_all_confirm_message")}</p>
          <button
            type="button"
            onClick={handleConfirmClear}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-500 transition-colors min-h-[32px]"
            data-testid="clear-confirm-yes"
          >
            {t("clear_all_confirm_yes")}
          </button>
          <button
            type="button"
            onClick={() => setShowClearConfirm(false)}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded transition-colors min-h-[32px]"
            data-testid="clear-confirm-no"
          >
            {tCommon("cancel")}
          </button>
        </div>
      )}

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-2">
        {combatants.length > 0 ? (
          <button
            type="button"
            onClick={() => { setShowClearConfirm(true); }}
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
                data-tour-id="roll-initiative"
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
            data-tour-id="start-combat"
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
  const tg = useTranslations("guest");
  const tCommon = useTranslations("common");
  const [showAddForm, setShowAddForm] = useState(false);
  const [midCombatRuleset] = useState<RulesetVersion>("2014");
  const [midCombatAddRow, setMidCombatAddRow] = useState<AddRowForm>(EMPTY_ADD_ROW);
  const [midCombatAddRowRole, setMidCombatAddRowRole] = useState<CombatantRole>(DEFAULT_ADD_ROW_ROLE);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellTrigger, setUpsellTrigger] = useState<UpsellTrigger>("save");
  const [leaderboardStats, setLeaderboardStats] = useState<CombatantStats[] | null>(null);
  const [spellsOpen, setSpellsOpen] = useState(false);
  // C.15/UX.04: Post-combat state machine (leaderboard → done, poll skipped for guest)
  type GuestPostCombatPhase = "leaderboard" | null;
  const [guestPostCombatPhase, setGuestPostCombatPhase] = useState<GuestPostCombatPhase>(null);

  // Redirect URL for Google OAuth: returns to the confirm route with from=guest-combat
  // so the callback can track onboarding source and preserve combat data
  const googleRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/confirm?from=guest-combat`
      : undefined;

  const {
    phase,
    combatants,
    currentTurnIndex,
    roundNumber,
    combatStartTime,
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
    updateDmNotes,
    updatePlayerNotes,
    hydrateCombatants,
    resetCombat,
    addDeathSaveSuccess,
    addDeathSaveFailure,
    isExpired,
    checkExpiry,
    resetForNewSession,
    expandedGroups,
    toggleGroupExpanded,
    setGroupInitiative,
    setLegendaryActionsUsed,
  } = useGuestCombatStore();

  // ─── Undo stack (Story 1.1) ─────────────────────────────────────────────────
  const {
    undoLastAction,
    canUndo,
    pushHpUndo,
    pushConditionUndo,
    pushDefeatedUndo,
    pushTurnUndo,
    pushHiddenUndo,
  } = useGuestUndoStack();

  const handleUndo = useCallback(() => {
    const entry = undoLastAction();
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
      case "hidden":
        toast(t("undo_hidden"));
        break;
    }
  }, [undoLastAction, t]);

  // O(1) index lookup for combatant rows (avoids O(n²) findIndex in renderItem)
  const combatantIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    combatants.forEach((c, i) => map.set(c.id, i));
    return map;
  }, [combatants]);

  // Turn timer — resets each time currentTurnIndex changes
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
  useEffect(() => {
    if (phase === "combat") setTurnStartedAt(Date.now());
  }, [currentTurnIndex, phase]);

  // Wrap advanceTurn to push undo entry first (Story 1.1)
  const handleAdvanceTurn = useCallback(() => {
    const store = useGuestCombatStore.getState();
    pushTurnUndo(store.combatants, store.currentTurnIndex, store.roundNumber);
    advanceTurn();
    playTurnSfx();
  }, [advanceTurn, pushTurnUndo]);

  // Keyboard shortcuts (space = next turn, arrow keys, D/H/C, etc.)
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  useCombatKeyboardShortcuts({
    enabled: phase === "combat",
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
    cheatsheetOpen,
    onToggleCheatsheet: () => setCheatsheetOpen((v) => !v),
    onUndo: handleUndo,
  });

  // Periodically check guest session expiry (every 30s)
  useEffect(() => {
    checkExpiry(); // Check immediately on mount
    const interval = setInterval(() => {
      checkExpiry();
    }, 30_000);
    return () => clearInterval(interval);
  }, [checkExpiry]);

  const handleExpiryReset = useCallback(() => {
    resetForNewSession();
  }, [resetForNewSession]);

  const openUpsell = useCallback((trigger: UpsellTrigger) => {
    // Save current combat state to localStorage before showing upsell
    try {
      const state = useGuestCombatStore.getState();
      const combatSnapshot = state.combatants.map((c) => ({
        name: c.name,
        current_hp: c.current_hp,
        max_hp: c.max_hp,
        ac: c.ac,
        initiative: c.initiative,
        conditions: c.conditions,
      }));
      localStorage.setItem("guest-combat-state", JSON.stringify(combatSnapshot));
    } catch {
      // storage unavailable
    }
    setUpsellTrigger(trigger);
    setUpsellOpen(true);
  }, []);

  // Auto-scroll to active combatant when turn advances (skip initial mount)
  const isFirstTurnRef = useRef(true);
  useEffect(() => {
    if (phase !== "combat") return;
    if (isFirstTurnRef.current) {
      isFirstTurnRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      const activeCard = document.querySelector('[aria-current="true"]') as HTMLElement | null;
      activeCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [currentTurnIndex, phase]);

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

  const handleMidCombatSelectMonster = useCallback(
    (monster: SrdMonster, options?: { isHidden?: boolean }) => {
      const currentCombatants = useGuestCombatStore.getState().combatants;
      const numberedName = getGuestNumberedName(monster.name, currentCombatants);
      const existingNames = currentCombatants.filter((c) => !c.is_player && c.display_name).map((c) => c.display_name!);
      const displayName = generateCreatureName(monster.type, existingNames);
      const rollResult = rollInitiativeForCombatant("tmp", monster.dex ?? undefined);
      addCombatant({
        name: numberedName, current_hp: monster.hit_points, max_hp: monster.hit_points, temp_hp: 0,
        ac: monster.armor_class, spell_save_dc: null, initiative: rollResult.total,
        initiative_breakdown: { roll: rollResult.rolls[0], modifier: rollResult.modifier },
        initiative_order: null, conditions: [], ruleset_version: monster.ruleset_version,
        is_defeated: false, is_hidden: options?.isHidden ?? false, is_player: false,
        monster_id: monster.id, token_url: monster.token_url ?? null, creature_type: monster.type ?? null,
        display_name: displayName, monster_group_id: null, group_order: null,
        dm_notes: "", player_notes: "", player_character_id: null, combatant_role: null,
        legendary_actions_total: null, legendary_actions_used: 0,
      });
      const all = useGuestCombatStore.getState().combatants;
      hydrateCombatants(assignInitiativeOrder(sortByInitiative(all)));
    },
    [addCombatant, hydrateCombatants]
  );

  const handleMidCombatSelectMonsterGroup = useCallback(
    (monster: SrdMonster, qty: number, options?: { isHidden?: boolean }) => {
      const groupId = crypto.randomUUID();
      const initResult = rollInitiativeForCombatant("group", monster.dex ?? undefined);
      const currentCombatants = useGuestCombatStore.getState().combatants;
      const existingNames = currentCombatants.filter((c) => !c.is_player && c.display_name).map((c) => c.display_name!);
      const groupDisplayBase = generateCreatureName(monster.type ?? null, existingNames);
      const newCombatants: Omit<Combatant, "id">[] = [];
      for (let i = 0; i < qty; i++) {
        const allExisting = [...currentCombatants, ...newCombatants] as Combatant[];
        newCombatants.push({
          name: getGuestNumberedName(monster.name, allExisting), current_hp: monster.hit_points, max_hp: monster.hit_points, temp_hp: 0,
          ac: monster.armor_class, spell_save_dc: null, initiative: initResult.total,
          initiative_breakdown: { roll: initResult.rolls[0], modifier: initResult.modifier },
          initiative_order: null, conditions: [], ruleset_version: monster.ruleset_version,
          is_defeated: false, is_hidden: options?.isHidden ?? false, is_player: false,
          monster_id: monster.id, token_url: monster.token_url ?? null, creature_type: monster.type ?? null,
          display_name: `${groupDisplayBase} ${i + 1}`, monster_group_id: groupId, group_order: i + 1,
          dm_notes: "", player_notes: "", player_character_id: null, combatant_role: null,
          legendary_actions_total: null, legendary_actions_used: 0,
        });
      }
      useGuestCombatStore.getState().addMonsterGroup(newCombatants);
      const all = useGuestCombatStore.getState().combatants;
      hydrateCombatants(assignInitiativeOrder(sortByInitiative(all)));
    },
    [hydrateCombatants]
  );

  const handleMidCombatAddFromRow = useCallback(() => {
    const name = midCombatAddRow.name.trim();
    if (!name) return;
    const hp = midCombatAddRow.hp.trim() ? parseInt(midCombatAddRow.hp, 10) : 0;
    const acVal = midCombatAddRow.ac.trim() ? parseInt(midCombatAddRow.ac, 10) : 0;
    const initVal = midCombatAddRow.initiative.trim() ? parseInt(midCombatAddRow.initiative, 10) : null;
    const currentCombatants = useGuestCombatStore.getState().combatants;
    const existingNames = currentCombatants.filter((c) => !c.is_player && c.display_name).map((c) => c.display_name!);
    const displayName = generateCreatureName(null, existingNames);
    addCombatant({
      name, current_hp: isNaN(hp) || hp < 0 ? 0 : hp, max_hp: isNaN(hp) || hp < 0 ? 0 : hp, temp_hp: 0,
      ac: isNaN(acVal) || acVal < 0 ? 0 : acVal, spell_save_dc: null,
      initiative: initVal !== null && !isNaN(initVal) ? Math.min(50, Math.max(-5, initVal)) : null,
      initiative_order: null, conditions: [], ruleset_version: null,
      is_defeated: false, is_hidden: false, is_player: midCombatAddRowRole === "player",
      monster_id: null, token_url: null, creature_type: null, display_name: displayName,
      monster_group_id: null, group_order: null, dm_notes: "", player_notes: midCombatAddRow.notes.trim(),
      player_character_id: null, combatant_role: midCombatAddRowRole,
      legendary_actions_total: null, legendary_actions_used: 0,
    });
    const all = useGuestCombatStore.getState().combatants;
    hydrateCombatants(assignInitiativeOrder(sortByInitiative(all)));
    setMidCombatAddRow(EMPTY_ADD_ROW);
    setMidCombatAddRowRole(DEFAULT_ADD_ROW_ROLE);
  }, [addCombatant, hydrateCombatants, midCombatAddRow, midCombatAddRowRole]);

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
    (id: string, amount: number) => {
      const store = useGuestCombatStore.getState();
      const actor = store.combatants[store.currentTurnIndex];
      const target = store.combatants.find((c) => c.id === id);
      if (target) pushHpUndo(target, "damage");
      // Calculate effective damage (clamped by temp_hp + current_hp)
      const effectiveDamage = target ? Math.min(amount, target.temp_hp + target.current_hp) : amount;
      applyDamage(id, amount);
      if (actor && target) {
        const stats = useGuestCombatStats.getState();
        stats.trackDamage(actor.display_name ?? actor.name, target.display_name ?? target.name, effectiveDamage);
      }
    },
    [applyDamage, pushHpUndo]
  );
  const handleApplyHealing = useCallback(
    (id: string, amount: number) => {
      const store = useGuestCombatStore.getState();
      const actor = store.combatants[store.currentTurnIndex];
      const target = store.combatants.find((c) => c.id === id);
      if (target) pushHpUndo(target, "heal");
      // Calculate effective healing (clamped by max_hp - current_hp)
      const effectiveHealing = target ? Math.min(amount, target.max_hp - target.current_hp) : amount;
      applyHealing(id, amount);
      if (actor) {
        const stats = useGuestCombatStats.getState();
        stats.trackHealing(actor.display_name ?? actor.name, effectiveHealing);
      }
    },
    [applyHealing, pushHpUndo]
  );
  const handleSetTempHp = useCallback(
    (id: string, value: number) => {
      const target = useGuestCombatStore.getState().combatants.find((c) => c.id === id);
      if (target) pushHpUndo(target, "temp");
      setTempHp(id, value);
    },
    [setTempHp, pushHpUndo]
  );
  const handleToggleCondition = useCallback(
    (id: string, condition: string) => {
      const target = useGuestCombatStore.getState().combatants.find((c) => c.id === id);
      if (target) {
        const wasAdded = !target.conditions.includes(condition);
        pushConditionUndo(id, condition, wasAdded);
      }
      toggleCondition(id, condition);
    },
    [toggleCondition, pushConditionUndo]
  );
  const handleSetDefeated = useCallback(
    (id: string, isDefeated: boolean) => {
      const store = useGuestCombatStore.getState();
      const target = store.combatants.find((c) => c.id === id);
      if (target) pushDefeatedUndo(target);
      setDefeated(id, isDefeated);
      // Track kills when a combatant is defeated
      if (isDefeated) {
        const actor = store.combatants[store.currentTurnIndex];
        if (actor) {
          useGuestCombatStats.getState().trackKill(actor.display_name ?? actor.name);
        }
      }
    },
    [setDefeated, pushDefeatedUndo]
  );
  // Story 1.2 — toggle hidden flag (visual only, no broadcast in guest)
  const handleToggleHidden = useCallback(
    (id: string) => {
      const store = useGuestCombatStore.getState();
      const combatant = store.combatants.find((c) => c.id === id);
      if (!combatant) return;
      pushHiddenUndo(combatant);
      store.hydrateCombatants(
        store.combatants.map((c) =>
          c.id === id ? { ...c, is_hidden: !c.is_hidden } : c
        )
      );
    },
    [pushHiddenUndo]
  );
  const handleUpdateStats = useCallback(
    (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => {
      // A.7: Handle display_name with group rename propagation
      if (stats.display_name !== undefined) {
        const result = applyGroupRename(
          useGuestCombatStore.getState().combatants,
          id,
          stats.display_name ?? ""
        );
        if (result.type === "group_rename") {
          // Functional update to avoid race condition with concurrent HP updates
          useGuestCombatStore.setState((state) => ({
            combatants: state.combatants.map((c) => {
              const update = result.updates.get(c.id);
              return update ? { ...c, ...update } : c;
            }),
          }));
        } else {
          updateCombatantStats(id, { display_name: stats.display_name });
        }
        // Process remaining stats separately
        const { display_name: _, ...restStats } = stats;
        if (Object.keys(restStats).length > 0) {
          updateCombatantStats(id, restStats);
        }
      } else {
        updateCombatantStats(id, stats);
      }
    },
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
      const store = useGuestCombatStore.getState();
      const combatant = store.combatants.find((c) => c.id === id);
      if (combatant?.monster_group_id && value !== null) {
        store.setGroupInitiative(combatant.monster_group_id, value);
      } else if (combatant?.monster_group_id && value === null) {
        // Clear initiative for all group members
        store.hydrateCombatants(
          store.combatants.map((c) =>
            c.monster_group_id === combatant.monster_group_id ? { ...c, initiative: null } : c
          )
        );
      } else {
        store.setInitiative(id, value);
      }
    },
    []
  );
  const handleUpdateDmNotes = useCallback(
    (id: string, notes: string) => updateDmNotes(id, notes),
    [updateDmNotes]
  );
  const handleUpdatePlayerNotes = useCallback(
    (id: string, notes: string) => updatePlayerNotes(id, notes),
    [updatePlayerNotes]
  );

  const handleApplyToMultiple = useCallback(
    (targetIds: string[], amount: number, mode: HpMode) => {
      const store = useGuestCombatStore.getState();
      const actor = store.combatants[store.currentTurnIndex];
      const actorName = actor ? (actor.display_name ?? actor.name) : "Unknown";
      for (const id of targetIds) {
        const target = store.combatants.find((c) => c.id === id);
        if (mode === "damage") {
          const effective = target ? Math.min(amount, target.temp_hp + target.current_hp) : amount;
          applyDamage(id, amount);
          if (target) useGuestCombatStats.getState().trackDamage(actorName, target.display_name ?? target.name, effective);
        } else if (mode === "heal") {
          const effective = target ? Math.min(amount, target.max_hp - target.current_hp) : amount;
          applyHealing(id, amount);
          useGuestCombatStats.getState().trackHealing(actorName, effective);
        } else {
          setTempHp(id, amount);
        }
      }
    },
    [applyDamage, applyHealing, setTempHp]
  );

  const handleEndEncounter = useCallback(() => {
    // Show leaderboard with accumulated stats before resetting
    const stats = useGuestCombatStats.getState().getStats();
    if (stats.length > 0 && stats.some((s) => s.totalDamageDealt > 0 || s.totalDamageReceived > 0)) {
      setLeaderboardStats(stats);
      setGuestPostCombatPhase("leaderboard"); // C.15: Start post-combat flow
    } else {
      useGuestCombatStats.getState().reset();
      resetCombat();
    }
  }, [resetCombat]);

  // C.15: Dismiss all post-combat screens — guest has no DB persistence
  const handleGuestDismissAll = useCallback(() => {
    setGuestPostCombatPhase(null);
    setLeaderboardStats(null);
    useGuestCombatStats.getState().reset();
    resetCombat();
  }, [resetCombat]);

  // UX.04/P3.04 — Guest skips poll: no players to collect votes from, no DB persistence.
  // Vote would be discarded intentionally — showing poll UI would be misleading.
  const handleLeaderboardClose = useCallback(() => {
    handleGuestDismissAll();
  }, [handleGuestDismissAll]);

  if (phase === "setup" || phase === "ended") {
    return (
      <>
        <GuestEncounterSetup
          onStartCombat={handleStartCombat}
          onShareUpsell={() => { setUpsellTrigger("player-link"); setUpsellOpen(true); }}
        />
        <GuestUpsellModal
          isOpen={upsellOpen}
          onClose={() => setUpsellOpen(false)}
          trigger={upsellTrigger}
          redirectTo={googleRedirectTo}
        />
        {isExpired && <GuestExpiryModal onReset={handleExpiryReset} />}
      </>
    );
  }

  // Active combat view
  return (
    <>
      <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-testid="active-combat" data-tour-id="tour-complete">
        <div className="sticky top-[72px] z-30 bg-background pb-3 space-y-3 border-b border-white/[0.06] -mx-2 px-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-foreground font-semibold">
              {t("round")} <span className="font-mono text-gold">{roundNumber}</span>
            </h2>
            {combatStartTime && <CombatTimer startTime={combatStartTime} />}
            {turnStartedAt && <TurnTimer startTime={turnStartedAt} />}
          </div>
          <div className="flex items-center gap-3 flex-wrap" data-tour-id="combat-controls">
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
              className="px-3 py-2 bg-white/[0.06] text-muted-foreground/60 font-medium rounded-md hover:bg-white/[0.1] hover:text-muted-foreground transition-all duration-[250ms] text-sm min-h-[44px] flex items-center gap-1.5"
              title={tg("save_requires_account")}
              data-testid="save-btn"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              {tCommon("save")}
            </button>

            {/* Weather teaser — upsell para contas registradas (Story 1.7) */}
            <button
              type="button"
              onClick={() => openUpsell("weather")}
              className="px-2 py-2 text-muted-foreground/60 hover:text-muted-foreground bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-[250ms] text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md"
              aria-label={tg("weather_upsell_label")}
              title={tg("weather_upsell_label")}
              data-testid="weather-upsell-btn"
            >
              🌤️
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
              onClick={() => setCheatsheetOpen(true)}
              className="px-3 py-2 bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1] font-mono font-medium rounded-md transition-all duration-[250ms] text-sm min-h-[44px]"
              aria-label="Keyboard shortcuts"
              data-testid="cheatsheet-btn"
              title={t("shortcut_title")}
            >
              ?
            </button>

            {/* Spell browser (C.14) */}
            <button
              type="button"
              onClick={() => setSpellsOpen(true)}
              className="px-2 py-2 bg-white/[0.06] text-gold/70 hover:text-gold hover:bg-white/[0.1] rounded-md transition-all duration-[250ms] text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
              aria-label={t("spell_open")}
              title={t("spell_open")}
              data-testid="spell-browser-btn"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Undo last action (Story 1.1) */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo()}
              className="px-2 py-2 bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1] rounded-md transition-all duration-[250ms] text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t("shortcut_undo_action")}
              title={`${t("shortcut_undo_action")} (Ctrl+Z)`}
              data-testid="undo-btn"
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleAdvanceTurn}
              className="px-4 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
              aria-label="Advance to next turn"
              data-testid="next-turn-btn"
              data-tour-id="next-turn"
            >
              {t("next_turn")}
            </button>
          </div>
        </div>
        {/* Sticky turn indicator row */}
        {phase === "combat" && (
          <div className="flex items-center gap-2 py-1.5 border-t border-border/30" data-testid="dm-sticky-turn-indicator">
            <span className="text-gold text-sm leading-none select-none" aria-hidden="true">▶</span>
            <span className="text-foreground text-sm font-medium truncate max-w-[200px]">
              {combatants[currentTurnIndex]?.name ?? t("dm_turn_label")}
            </span>
            {combatants[currentTurnIndex] && (
              combatants[currentTurnIndex].is_player ? (
                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  {t("player_tag")}
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                  {t("monster_tag")}
                </span>
              )
            )}
            {combatants[currentTurnIndex + 1] && (
              <span className="text-muted-foreground text-xs ml-auto truncate max-w-[160px]">
                {t("next_label")}: {combatants[currentTurnIndex + 1].name}
              </span>
            )}
          </div>
        )}
        </div>{/* end sticky controls */}

        {showAddForm && (
          <div className="space-y-3 p-3 bg-white/[0.04] rounded-md border border-border" data-testid="mid-combat-add-panel">
            <MonsterSearchPanel
              rulesetVersion={midCombatRuleset}
              onSelectMonster={handleMidCombatSelectMonster}
              onSelectMonsterGroup={handleMidCombatSelectMonsterGroup}
            />
            <div
              className="flex flex-wrap items-center gap-1.5 md:grid md:gap-x-1.5 md:items-center bg-card/50 border border-dashed border-border rounded-md px-2 py-1.5"
              style={{ gridTemplateColumns: "64px 1fr 64px 56px 1fr 170px" }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMidCombatAddFromRow(); } }}
              data-testid="mid-combat-add-row"
            >
              <input type="text" inputMode="numeric" pattern="-?[0-9]*" value={midCombatAddRow.initiative} onChange={(e) => { const raw = e.target.value; if (raw === "" || raw === "-" || /^-?\d+$/.test(raw)) setMidCombatAddRow((f) => ({ ...f, initiative: raw })); }} placeholder={t("setup_col_init")} className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px] w-16 md:w-full text-center font-mono" />
              <input type="text" value={midCombatAddRow.name} onChange={(e) => setMidCombatAddRow((f) => ({ ...f, name: e.target.value }))} placeholder={t("setup_col_name")} className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px] basis-full md:basis-auto md:w-full min-w-0" />
              <input type="number" value={midCombatAddRow.hp} onChange={(e) => setMidCombatAddRow((f) => ({ ...f, hp: e.target.value }))} placeholder={t("setup_col_hp")} min={1} className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px] w-12 md:w-full text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <input type="number" value={midCombatAddRow.ac} onChange={(e) => setMidCombatAddRow((f) => ({ ...f, ac: e.target.value }))} placeholder={t("setup_col_ac")} min={1} className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px] w-10 md:w-full text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <input type="text" value={midCombatAddRow.notes} onChange={(e) => setMidCombatAddRow((f) => ({ ...f, notes: e.target.value }))} placeholder={t("setup_col_notes")} className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px] hidden md:block w-full min-w-0 text-muted-foreground" />
              <div className="flex items-center gap-1 md:w-full">
                {(() => { const config = ADD_ROW_ROLE_CONFIG[midCombatAddRowRole]; const Icon = config.icon; const nextRole = COMBATANT_ROLE_CYCLE[(COMBATANT_ROLE_CYCLE.indexOf(midCombatAddRowRole) + 1) % COMBATANT_ROLE_CYCLE.length]; return (<button type="button" onClick={() => setMidCombatAddRowRole(nextRole)} className={`flex items-center justify-center gap-1 px-1.5 py-1 text-xs rounded transition-all flex-shrink-0 border min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0 ${config.color}`} title={t("setup_role_tooltip")} data-testid="mid-add-row-role"><Icon className="w-3.5 h-3.5" /><span>{t(config.label)}</span></button>); })()}
                <button type="button" onClick={handleMidCombatAddFromRow} className="flex-1 py-1.5 px-3 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-500 transition-colors min-h-[32px] text-center" data-testid="mid-add-row-btn">{t("setup_add")}</button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[32px]">{tCommon("close")}</button>
            </div>
          </div>
        )}

        <div
          role="list"
          aria-label={t("initiative_order")}
          data-testid="initiative-list"
          data-tour-id="hp-adjust"
          className="space-y-2"
        >
          <SortableCombatantList
            combatants={combatants}
            onReorder={handleReorderCombatants}
            renderItem={(c, dragHandleProps) => {
              const index = combatantIndexMap.get(c.id) ?? -1;
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
                  onUpdateDmNotes={handleUpdateDmNotes}
                  onUpdatePlayerNotes={handleUpdatePlayerNotes}
                  allCombatants={combatants}
                  onApplyToMultiple={handleApplyToMultiple}
                  onToggleHidden={handleToggleHidden}
                  onAddDeathSaveSuccess={addDeathSaveSuccess}
                  onAddDeathSaveFailure={addDeathSaveFailure}
                  onAdvanceTurn={handleAdvanceTurn}
                  onSetLegendaryActionsUsed={setLegendaryActionsUsed}
                />
              );
            }}
            renderGroup={(groupId, members, dragHandleProps) => {
              const isExpanded = expandedGroups[groupId] ?? true;
              const isCurrentTurn = members.some(
                (m) => (combatantIndexMap.get(m.id) ?? -1) === currentTurnIndex
              );
              return (
                <MonsterGroupHeader
                  groupName={getGroupBaseName(members)}
                  members={members}
                  isExpanded={isExpanded}
                  onToggle={() => toggleGroupExpanded(groupId)}
                  groupInitiative={getGroupInitiative(members)}
                  onSetGroupInitiative={(value) => setGroupInitiative(groupId, value)}
                  isCurrentTurn={isCurrentTurn}
                >
                  {members.map((c, i) => (
                    <CombatantRow
                      key={c.id}
                      combatant={c}
                      isCurrentTurn={(combatantIndexMap.get(c.id) ?? -1) === currentTurnIndex}
                      showActions
                      dragHandleProps={i === 0 ? dragHandleProps : {}}
                      onApplyDamage={handleApplyDamage}
                      onApplyHealing={handleApplyHealing}
                      onSetTempHp={handleSetTempHp}
                      onToggleCondition={handleToggleCondition}
                      onSetDefeated={handleSetDefeated}
                      onRemoveCombatant={handleRemoveCombatant}
                      onUpdateStats={handleUpdateStats}
                      onSetInitiative={handleSetInitiative}
                      onUpdateDmNotes={handleUpdateDmNotes}
                      onUpdatePlayerNotes={handleUpdatePlayerNotes}
                      allCombatants={combatants}
                      onApplyToMultiple={handleApplyToMultiple}
                      onToggleHidden={handleToggleHidden}
                      onAddDeathSaveSuccess={addDeathSaveSuccess}
                      onAddDeathSaveFailure={addDeathSaveFailure}
                      onAdvanceTurn={handleAdvanceTurn}
                      onSetLegendaryActionsUsed={setLegendaryActionsUsed}
                    />
                  ))}
                </MonsterGroupHeader>
              );
            }}
          />
        </div>

        {/* Footer nudge */}
        <div className="pt-6 text-center text-sm text-muted-foreground/60">
          {tg("footer_enjoyed")}{" "}
          <button
            type="button"
            onClick={() => openUpsell("save")}
            className="text-gold hover:underline underline-offset-2 transition-colors"
          >
            {tg("footer_create_account")}
          </button>
        </div>
      </div>

      <GuestUpsellModal
        isOpen={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        trigger={upsellTrigger}
        redirectTo={googleRedirectTo}
      />

      {isExpired && <GuestExpiryModal onReset={handleExpiryReset} />}

      {guestPostCombatPhase === "leaderboard" && leaderboardStats && (
        <CombatLeaderboard
          stats={leaderboardStats}
          encounterName={tg("try_encounter_name")}
          rounds={roundNumber}
          onClose={handleLeaderboardClose}
        />
      )}

      {/* UX.04 — Guest poll phase removed: DM jumps from leaderboard directly to dismiss */}

      <KeyboardCheatsheet
        open={cheatsheetOpen}
        onClose={() => setCheatsheetOpen(false)}
      />

      {/* Spell browser (C.14 — DM parity) */}
      <PlayerSpellBrowser
        open={spellsOpen}
        onOpenChange={setSpellsOpen}
        rulesetVersion={midCombatRuleset}
      />
    </>
  );
}
