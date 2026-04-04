"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useCombatStore, getNumberedName } from "@/lib/stores/combat-store";
import { Info, Share2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShareSessionButton } from "@/components/session/ShareSessionButton";
import { createSessionOnly } from "@/lib/supabase/encounter";
import { RulesetSelector } from "@/components/session/RulesetSelector";
import { CampaignLoader } from "@/components/session/CampaignLoader";
import { PresetLoader } from "@/components/presets/PresetLoader";
import { CombatantSetupRow } from "@/components/combat/CombatantSetupRow";
import { SortableCombatantList } from "@/components/combat/SortableCombatantList";
import { MonsterSearchPanel } from "@/components/combat/MonsterSearchPanel";
import { CRCalculator } from "@/components/combat/CRCalculator";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { getLegendaryActionCount } from "@/lib/srd/legendary-actions";
import { useInitiativeRolling } from "@/lib/hooks/useInitiativeRolling";
import { rollInitiativeForCombatant } from "@/lib/utils/initiative";
import type { RulesetVersion, PlayerCharacter, MonsterPresetEntry } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";
import { applyGroupRename } from "@/lib/utils/group-rename";
import { hasLairActions, hasLairActionEntry, createLairActionCombatant } from "@/lib/utils/lair-action";
import { generateCreatureName } from "@/lib/utils/creature-name-generator";
import { generateEncounterName } from "@/lib/utils/encounter-name";
import { getMonsterById } from "@/lib/srd/srd-search";
import { resetDmChannel } from "@/lib/realtime/broadcast";
import { EncounterGeneratorDialog } from "@/components/encounter-generator/EncounterGeneratorDialog";

interface EncounterSetupProps {
  onStartCombat: (encounterName?: string) => Promise<void>;
  campaignId?: string | null;
  preloadedPlayers?: PlayerCharacter[];
  /** Session ID for listening to player registrations via realtime */
  sessionId?: string | null;
  /** Called when an on-demand session is created for sharing */
  onSessionCreated?: (sessionId: string) => void;
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

/** Generate a generic display_name for non-player combatants (anti-metagaming).
 *  Counts existing "Creature #N" display names to determine the next number. */
function getDefaultDisplayName(creatureType: string | null | undefined, existingCombatants: Combatant[]): string {
  const existingNames = existingCombatants
    .filter((c) => !c.is_player && c.display_name)
    .map((c) => c.display_name!);
  return generateCreatureName(creatureType, existingNames);
}

export function EncounterSetup({ onStartCombat, campaignId, preloadedPlayers, sessionId, onSessionCreated }: EncounterSetupProps) {
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
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // On-demand session creation for sharing before combat starts
  const [onDemandSessionId, setOnDemandSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  // Effective session ID: use prop if available, otherwise on-demand created one
  const effectiveSessionId = sessionId ?? onDemandSessionId;

  const initInputRef = useRef<HTMLInputElement>(null);

  const { handleRollOne, handleRollAll, handleRollNpcs } = useInitiativeRolling(
    useCombatStore,
    rulesetVersion
  );

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  // Cleanup glow timer on unmount
  useEffect(() => {
    return () => {
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  // Bug #2: Clear stale validation error when combatants change
  useEffect(() => {
    if (submitError) setSubmitError(null);
    if (invalidInitIds.size > 0) setInvalidInitIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reset validation state when combatants change; including submitError/invalidInitIds would cause infinite loop
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
        is_hidden: false,
        is_player: true,
        monster_id: null,
        token_url: null,
        creature_type: null,
        display_name: null,
        monster_group_id: null,
        group_order: null,
        dm_notes: "",
        player_notes: "",
        player_character_id: pc.id,
        combatant_role: null,
        legendary_actions_total: null,
        legendary_actions_used: 0,
      };
      addCombatant(newCombatant);
      currentCombatants.push({ ...newCombatant, id: crypto.randomUUID() });
    });
  }, [preloadedPlayers, addCombatant]);

  // Create session on-demand when DM wants to share before combat starts
  const handlePrepareShare = useCallback(async () => {
    if (isCreatingSession || effectiveSessionId) return;
    setIsCreatingSession(true);
    try {
      const newSessionId = await createSessionOnly(rulesetVersion, campaignId);
      setOnDemandSessionId(newSessionId);
      onSessionCreated?.(newSessionId);
    } catch {
      setSubmitError(t("share_session_error"));
    } finally {
      setIsCreatingSession(false);
    }
  }, [isCreatingSession, effectiveSessionId, rulesetVersion, campaignId, onSessionCreated, t]);

  // Listen for players joining via realtime (player:joined broadcast)
  useEffect(() => {
    const sid = sessionId ?? onDemandSessionId;
    if (!sid) return;
    const supabase = createClient();
    const channel = supabase.channel(`session:${sid}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "player:joined" }, ({ payload }) => {
        if (!payload.name || !payload.id) return;
        const currentCombatants = useCombatStore.getState().combatants;
        // Avoid duplicate — use token ID, not name (two players could share a name)
        if (currentCombatants.some((c) => c.is_player && c.dm_notes === `token:${payload.id}`)) return;
        addCombatant({
          name: payload.name,
          current_hp: payload.hp ?? 0,
          max_hp: payload.hp ?? 0,
          temp_hp: 0,
          ac: payload.ac ?? 0,
          spell_save_dc: null,
          initiative: payload.initiative ?? null,
          initiative_order: null,
          conditions: [],
          ruleset_version: null,
          is_defeated: false,
          is_hidden: false,
          is_player: true,
          monster_id: null,
          token_url: null,
          creature_type: null,
          display_name: null,
          monster_group_id: null,
          group_order: null,
          dm_notes: `token:${payload.id}`,
          player_notes: "",
          player_character_id: null,
          combatant_role: null,
          legendary_actions_total: null,
          legendary_actions_used: 0,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Invalidate the broadcast singleton so CombatSessionClient recreates
      // a fresh channel instead of reusing the now-removed one.
      resetDmChannel();
    };
  }, [sessionId, onDemandSessionId, addCombatant]);

  // Auto-add monster with rolled initiative when selected from compendium
  const handleSelectMonster = useCallback(
    (monster: SrdMonster, options?: { isHidden?: boolean }) => {
      const currentCombatants = useCombatStore.getState().combatants;
      const numberedName = getNumberedName(monster.name, currentCombatants);
      const displayName = getDefaultDisplayName(monster.type, currentCombatants);

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
        is_hidden: options?.isHidden ?? false,
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
        legendary_actions_total: getLegendaryActionCount(monster),
        legendary_actions_used: 0,
      });

      // Auto-add Lair Action entry at initiative 20 if this monster has lair actions
      if (hasLairActions(monster) && !hasLairActionEntry(useCombatStore.getState().combatants)) {
        addCombatant(createLairActionCombatant());
      }

      lastSelectedMonster.current = null;
      setAddRow(EMPTY_ADD_ROW);
    },
    [addCombatant]
  );

  // Add a group of N monsters with shared group ID
  const handleSelectMonsterGroup = useCallback(
    (monster: SrdMonster, qty: number, options?: { isHidden?: boolean }) => {
      const groupId = crypto.randomUUID();
      // Roll initiative once for the whole group (D&D 5e PHB p.189)
      const groupInitResult = rollInitiativeForCombatant("group", monster.dex ?? undefined);
      const groupInit = groupInitResult.total;
      const groupBreakdown = { roll: groupInitResult.rolls[0], modifier: groupInitResult.modifier };
      const currentCombatants = useCombatStore.getState().combatants;
      const newCombatants: Omit<Combatant, "id">[] = [];
      // Generate ONE display name for the group, append numbers
      const groupDisplayBase = getDefaultDisplayName(monster?.type ?? null, currentCombatants as Combatant[]);
      for (let i = 1; i <= qty; i++) {
        const allExisting = [...currentCombatants, ...newCombatants] as Combatant[];
        newCombatants.push({
          name: getNumberedName(monster.name, allExisting),
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
          is_hidden: options?.isHidden ?? false,
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
          legendary_actions_total: getLegendaryActionCount(monster),
          legendary_actions_used: 0,
        });
      }
      useCombatStore.getState().addMonsterGroup(newCombatants);

      // Auto-add Lair Action entry at initiative 20 if this monster has lair actions
      if (hasLairActions(monster) && !hasLairActionEntry(useCombatStore.getState().combatants)) {
        addCombatant(createLairActionCombatant());
      }

      setAddRow(EMPTY_ADD_ROW);
    },
    [addCombatant]
  );

  // Add all monsters from encounter generator
  const handleGeneratedEncounter = useCallback(
    (generatedMonsters: Array<{ monster: SrdMonster; count: number }>) => {
      for (const group of generatedMonsters) {
        if (group.count === 1) {
          handleSelectMonster(group.monster);
        } else {
          handleSelectMonsterGroup(group.monster, group.count);
        }
      }
    },
    [handleSelectMonster, handleSelectMonsterGroup]
  );

  // Trigger golden glow on the add row after monster selection
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

  // Add combatant from the add-row
  const handleAddFromRow = useCallback(() => {
    const name = addRow.name.trim();
    const hpValue = addRow.hp.trim();
    const acValue = addRow.ac.trim();
    const hp = hpValue ? parseInt(hpValue, 10) : null;
    const ac = acValue ? parseInt(acValue, 10) : null;
    const errors = new Set<string>();
    if (!name) errors.add("name");
    if (errors.size > 0) {
      setAddRowErrors(errors);
      return;
    }
    setAddRowErrors(new Set());

    const safeHp = hp !== null && !isNaN(hp) && hp >= 1 ? hp : 0;
    const safeAc = ac !== null && !isNaN(ac) && ac >= 1 ? ac : 0;

    const initVal = addRow.initiative.trim()
      ? parseInt(addRow.initiative, 10)
      : null;

    const sel = lastSelectedMonster.current;
    // Use selected monster's creature type for thematic name, null for manual add
    const selType = sel ? (getMonsterById(sel.id, sel.version)?.type ?? null) : null;
    const displayName = getDefaultDisplayName(selType, useCombatStore.getState().combatants);
    addCombatant({
      name,
      current_hp: safeHp,
      max_hp: safeHp,
      temp_hp: 0,
      ac: safeAc,
      spell_save_dc: null,
      initiative: initVal !== null && !isNaN(initVal) ? Math.min(50, Math.max(-5, initVal)) : null,
      initiative_order: null,
      conditions: [],
      ruleset_version: sel?.version ?? null,
      is_defeated: false,
      is_hidden: false,
      is_player: false,
      monster_id: sel?.id ?? null,
      token_url: null,
      creature_type: selType,
      display_name: displayName,
      monster_group_id: null,
      group_order: null,
      dm_notes: "",
      player_notes: addRow.notes.trim(),
      player_character_id: null,
      combatant_role: sel?.id ? null : "player",
      legendary_actions_total: null,
      legendary_actions_used: 0,
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
          is_hidden: false,
          is_player: true,
          monster_id: null,
          token_url: null,
          creature_type: null,
          display_name: null,
          monster_group_id: null,
          group_order: null,
          dm_notes: "",
          player_notes: "",
          player_character_id: pc.id,
          combatant_role: null,
          legendary_actions_total: null,
          legendary_actions_used: 0,
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
          const displayName = getDefaultDisplayName(null, currentCombatants);
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
            is_hidden: false,
            is_player: false,
            monster_id: pm.monster_id,
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
    (id: string, value: number | null) => {
      const combatant = useCombatStore.getState().combatants.find((c) => c.id === id);
      // If grouped, propagate initiative to all group members
      if (combatant?.monster_group_id) {
        if (value !== null) {
          useCombatStore.getState().setGroupInitiative(combatant.monster_group_id, value);
        } else {
          // Clear initiative for all group members
          const members = useCombatStore.getState().combatants.filter(
            (c) => c.monster_group_id === combatant.monster_group_id
          );
          for (const m of members) useCombatStore.getState().setInitiative(m.id, null);
        }
      } else {
        setInitiative(id, value);
      }
    },
    [setInitiative]
  );
  const handleRowNameChange = useCallback(
    (id: string, name: string) => {
      const combatant = useCombatStore.getState().combatants.find((c) => c.id === id);

      // If this combatant belongs to a group, propagate the base name change to all members
      if (combatant?.monster_group_id) {
        const groupMembers = useCombatStore.getState().combatants
          .filter((c) => c.monster_group_id === combatant.monster_group_id)
          .sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));

        // Extract new base name (strip trailing " N" if present)
        const newBase = name.replace(/\s+\d+$/, "");

        // Rename all members: "NewBase 1", "NewBase 2", etc.
        const updates = groupMembers.map((m, i) => ({
          ...m,
          name: `${newBase} ${i + 1}`,
          display_name: m.display_name, // keep display_name as-is (DM controls it)
        }));

        useCombatStore.getState().hydrateCombatants(
          useCombatStore.getState().combatants.map((c) => {
            const updated = updates.find((u) => u.id === c.id);
            return updated ? { ...c, name: updated.name } : c;
          })
        );
      } else {
        updateCombatantStats(id, { name });
      }
    },
    [updateCombatantStats]
  );
  // Update display name — propagate to all group members if applicable
  const handleDisplayNameChange = useCallback(
    (id: string, displayName: string | null) => {
      if (!displayName) {
        updateCombatantStats(id, { display_name: displayName });
        return;
      }
      const { combatants } = useCombatStore.getState();
      const result = applyGroupRename(combatants, id, displayName);
      if (result.type === "group_rename") {
        useCombatStore.setState((state) => ({
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
      const currentCombatants = useCombatStore.getState().combatants;

      // If source belongs to a group, compute next group_order
      let groupOrder: number | null = null;
      if (source.monster_group_id) {
        const groupMembers = currentCombatants.filter(
          (c) => c.monster_group_id === source.monster_group_id
        );
        groupOrder = Math.max(...groupMembers.map((m) => m.group_order ?? 0)) + 1;
      }

      // For group members, use the group base name for proper numbering (e.g. "Goblin 4" not "Goblin 2 1")
      const baseName = source.monster_group_id
        ? source.name.replace(/\s+\d+$/, "")
        : source.name;

      addCombatant({
        name: getNumberedName(baseName, currentCombatants),
        current_hp: source.max_hp,
        max_hp: source.max_hp,
        temp_hp: 0,
        ac: source.ac,
        spell_save_dc: source.spell_save_dc,
        initiative: source.monster_group_id ? source.initiative : null,
        initiative_order: null,
        conditions: [],
        ruleset_version: source.ruleset_version,
        is_defeated: false,
        is_hidden: false,
        is_player: source.is_player,
        monster_id: source.monster_id,
        token_url: source.token_url,
        creature_type: source.creature_type,
        display_name: source.is_player ? null : getDefaultDisplayName(source.creature_type, currentCombatants),
        monster_group_id: source.monster_group_id,
        group_order: groupOrder,
        dm_notes: "",
        player_notes: "",
        player_character_id: null,
        combatant_role: source.combatant_role,
        legendary_actions_total: null,
        legendary_actions_used: 0,
      });
    },
    [addCombatant]
  );

  // Start combat
  const handleStartCombat = async () => {
    if (combatants.length < 2) {
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
      const finalName = generateEncounterName(combatants);
      await onStartCombat(finalName);
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{t("encounter_title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("encounter_description")}
          </p>
        </div>
        {/* Share button — only show here when not inside /app/session/[id] (which has its own) */}
        {!sessionId && (
          effectiveSessionId ? (
            <ShareSessionButton sessionId={effectiveSessionId} />
          ) : (
            <button
              type="button"
              onClick={handlePrepareShare}
              disabled={isCreatingSession}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-gold/90 text-surface-primary hover:bg-gold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 min-h-[44px] flex items-center gap-2 shadow-[0_0_12px_rgba(212,168,83,0.3)]"
              data-testid="share-prepare-btn"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              {isCreatingSession ? t("starting") : t("share_session")}
            </button>
          )
        )}
      </div>

      {/* Toolbar: Ruleset + CR Calculator + Campaign Loader + Preset Loader */}
      <div className="flex items-end gap-3 flex-wrap">
        <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />
        <CRCalculator rulesetVersion={rulesetVersion} />
        <CampaignLoader onLoad={handleLoadCampaign} />
        <PresetLoader onLoad={handleLoadPreset} />
        <EncounterGeneratorDialog rulesetVersion={rulesetVersion} onUseEncounter={handleGeneratedEncounter} />
      </div>

      {/* OmniBar: SRD Monster Search + Campaign Players + Manual Add */}
      <MonsterSearchPanel
        rulesetVersion={rulesetVersion}
        onSelectMonster={handleSelectMonster}
        onMonsterAdded={handleMonsterAdded}
        onSelectMonsterGroup={handleSelectMonsterGroup}
        campaignPlayers={preloadedPlayers?.map((pc) => ({ id: pc.id, name: pc.name, hp: pc.max_hp, ac: pc.ac, spell_save_dc: pc.spell_save_dc })) ?? []}
        onSelectPlayer={(player) => {
          const currentCombatants = useCombatStore.getState().combatants;
          if (currentCombatants.some((c) => c.player_character_id === player.id)) return;
          const numberedName = getNumberedName(player.name, currentCombatants);
          addCombatant({
            name: numberedName,
            current_hp: player.hp,
            max_hp: player.hp,
            temp_hp: 0,
            ac: player.ac,
            spell_save_dc: player.spell_save_dc ?? null,
            initiative: null,
            initiative_order: null,
            conditions: [],
            ruleset_version: null,
            is_defeated: false,
            is_hidden: false,
            is_player: true,
            monster_id: null,
            token_url: null,
            creature_type: null,
            display_name: null,
            monster_group_id: null,
            group_order: null,
            dm_notes: "",
            player_notes: "",
            player_character_id: player.id,
            combatant_role: null,
            legendary_actions_total: null,
            legendary_actions_used: 0,
          });
        }}
        showManualAdd
        defaultManualOpen
        onManualAdd={(data) => {
          const numberedName = getNumberedName(data.name, useCombatStore.getState().combatants);
          const displayName = getDefaultDisplayName(null, useCombatStore.getState().combatants);
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

      {/* Column headers — always visible, aligned with both rows and add-row */}
      <div
        className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider md:grid md:gap-x-1.5 md:items-center"
        style={{ gridTemplateColumns: "20px 64px 32px 1fr 64px 56px 1fr 170px" }}
      >
        <span /> {/* drag handle / + icon spacer */}
        <span className="w-12 md:w-auto text-center">{t("setup_col_init")}</span>
        <span className="hidden md:block" /> {/* monster token spacer */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1 md:flex-none min-w-0 inline-flex items-center gap-1 cursor-help">
                {t("setup_col_name")}
                <Info className="w-3 h-3 text-muted-foreground/40" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-[11px] leading-snug">
              {t("setup_col_name_tooltip")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="w-12 md:w-auto text-center">{t("setup_col_hp")}</span>
        <span className="w-10 md:w-auto text-center">{t("setup_col_ac")}</span>
        <span className="hidden md:block min-w-0">{t("setup_col_notes")}</span>
        <span className="hidden md:block" /> {/* actions spacer */}
      </div>

      {/* Combatant list (insertion order, drag-reorderable) */}
      <div className="space-y-1" data-testid="setup-combatant-list" role="list" aria-label={t("combatants_list")}>
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
              onRoleChange={(id, role) => {
                useCombatStore.setState((state) => ({
                  combatants: state.combatants.map((c2) =>
                    c2.id === id ? { ...c2, combatant_role: role } : c2
                  ),
                }));
              }}
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

      {/* Error */}
      {submitError && (
        <p className="text-red-400 text-sm" role="alert">
          {submitError}
        </p>
      )}

      {/* Start Combat */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
        <button
          type="button"
          onClick={handleStartCombat}
          disabled={combatants.length < 2 || isPending}
          className="px-5 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shrink-0"
          data-testid="start-combat-btn"
        >
          {isPending ? t("starting") : t("start_combat")}
        </button>
      </div>
    </div>
  );
}
