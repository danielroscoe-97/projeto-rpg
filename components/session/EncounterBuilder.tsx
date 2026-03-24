"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCombatStore, getNumberedName } from "@/lib/stores/combat-store";
import { buildMonsterIndex, searchMonsters } from "@/lib/srd/srd-search";
import { loadMonsters } from "@/lib/srd/srd-loader";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { createEncounterWithCombatants } from "@/lib/supabase/encounter";
import { RulesetSelector, VersionBadge } from "@/components/session/RulesetSelector";
import { CampaignLoader } from "@/components/session/CampaignLoader";
import type { RulesetVersion, PlayerCharacter } from "@/lib/types/database";
import type { Combatant } from "@/lib/types/combat";

const DEBOUNCE_MS = 150;

interface CustomNpcForm {
  name: string;
  max_hp: string;
  ac: string;
  spell_save_dc: string;
}

const EMPTY_NPC: CustomNpcForm = {
  name: "",
  max_hp: "",
  ac: "",
  spell_save_dc: "",
};

export function EncounterBuilder() {
  const router = useRouter();
  const { combatants, addCombatant, removeCombatant, clearEncounter } =
    useCombatStore();

  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>("2014");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdMonster[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [npcForm, setNpcForm] = useState<CustomNpcForm>(EMPTY_NPC);
  const [npcErrors, setNpcErrors] = useState<Partial<CustomNpcForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Clear encounter on mount so the builder always starts fresh
  useEffect(() => {
    clearEncounter();
  }, [clearEncounter]);

  // Load and index monsters when ruleset version changes
  useEffect(() => {
    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);
    loadMonsters(rulesetVersion)
      .then((monsters) => {
        if (!cancelled) {
          buildMonsterIndex(monsters);
          setIsSearching(false);
          // Re-run the current query against the new index
          setResults(
            query.trim()
              ? searchMonsters(query, rulesetVersion)
                  .map((r) => r.item)
                  .slice(0, 8)
              : []
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSearching(false);
          setSearchError("Failed to load monsters. Please refresh.");
        }
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesetVersion]);

  // Debounced search — only runs when the index is ready (isSearching = false)
  useEffect(() => {
    if (isSearching) return;
    const timer = setTimeout(() => {
      setResults(
        query.trim()
          ? searchMonsters(query, rulesetVersion).map((r) => r.item).slice(0, 8)
          : []
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, rulesetVersion, isSearching]);

  const handleAddMonster = useCallback(
    (monster: SrdMonster) => {
      const numberedName = getNumberedName(monster.name, combatants);
      addCombatant({
        name: numberedName,
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
      });
    },
    [addCombatant, combatants]
  );

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
        };
        addCombatant(newCombatant);
        currentCombatants.push({ ...newCombatant, id: crypto.randomUUID() });
      });
    },
    [addCombatant]
  );

  const validateNpc = (): boolean => {
    const errors: Partial<CustomNpcForm> = {};
    if (!npcForm.name.trim()) errors.name = "Name is required";
    const hp = Number(npcForm.max_hp);
    if (!npcForm.max_hp || isNaN(hp) || hp < 1) errors.max_hp = "Must be ≥ 1";
    const ac = Number(npcForm.ac);
    if (!npcForm.ac || isNaN(ac) || ac < 1) errors.ac = "Must be ≥ 1";
    if (
      npcForm.spell_save_dc &&
      (isNaN(Number(npcForm.spell_save_dc)) || Number(npcForm.spell_save_dc) < 1)
    ) {
      errors.spell_save_dc = "Must be ≥ 1";
    }
    setNpcErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddNpc = () => {
    if (!validateNpc()) return;
    const hp = Number(npcForm.max_hp);
    addCombatant({
      name: npcForm.name.trim(),
      current_hp: hp,
      max_hp: hp,
      temp_hp: 0,
      ac: Number(npcForm.ac),
      spell_save_dc: npcForm.spell_save_dc ? Number(npcForm.spell_save_dc) : null,
      initiative: null,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_player: false,
      monster_id: null,
    });
    setNpcForm(EMPTY_NPC);
    setNpcErrors({});
    setShowCustomForm(false);
  };

  const handleStartCombat = () => {
    if (combatants.length === 0) {
      setSubmitError("Add at least one combatant before starting.");
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      try {
        const { session_id, encounter_id } = await createEncounterWithCombatants(
          combatants,
          rulesetVersion
        );
        useCombatStore.getState().setEncounterId(encounter_id, session_id);
        router.push(`/app/session/${session_id}`);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to create encounter."
        );
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">New Encounter</h1>
        <p className="text-white/50 text-sm mt-1">
          Search monsters or add custom NPCs to build your encounter.
        </p>
      </div>

      {/* Ruleset selector */}
      <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />

      {/* Monster search */}
      <div className="space-y-2">
        <label className="text-white/80 text-sm font-medium block">
          Search Monsters (SRD {rulesetVersion})
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a monster name or type…"
          className="w-full bg-[#16213e] border border-white/10 rounded-md px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-[#e94560]"
          data-testid="monster-search-input"
        />
        {isSearching && (
          <p className="text-white/30 text-xs">Searching…</p>
        )}
        {searchError && (
          <p className="text-red-400 text-xs" role="alert">{searchError}</p>
        )}
        {results.length > 0 && (
          <ul
            className="bg-[#16213e] border border-white/10 rounded-md divide-y divide-white/5 overflow-hidden"
            data-testid="monster-results"
          >
            {results.map((monster) => (
              <li
                key={monster.id}
                className="flex items-center justify-between px-4 py-2 hover:bg-white/5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">
                    {monster.name}
                  </span>
                  <VersionBadge version={monster.ruleset_version} />
                  <span className="text-white/40 text-xs">
                    CR {monster.cr} · {monster.type} · HP {monster.hit_points} · AC{" "}
                    {monster.armor_class}
                  </span>
                </div>
                <button
                  onClick={() => handleAddMonster(monster)}
                  className="text-xs px-2 py-1 bg-[#e94560]/20 text-[#e94560] rounded hover:bg-[#e94560]/40 transition-colors"
                  data-testid={`add-monster-${monster.id}`}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Custom NPC form + Load Campaign */}
      <div>
        {!showCustomForm ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCustomForm(true)}
              className="text-sm text-white/50 hover:text-white/80 underline transition-colors"
              data-testid="show-custom-npc-btn"
            >
              + Add Custom NPC
            </button>
            <CampaignLoader onLoad={handleLoadCampaign} />
          </div>
        ) : (
          <div
            className="bg-[#16213e] border border-white/10 rounded-md p-4 space-y-3"
            data-testid="custom-npc-form"
          >
            <h3 className="text-white/80 text-sm font-medium">Custom NPC</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  value={npcForm.name}
                  onChange={(e) =>
                    setNpcForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Name"
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#e94560]"
                  data-testid="npc-name-input"
                />
                {npcErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{npcErrors.name}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  value={npcForm.max_hp}
                  onChange={(e) =>
                    setNpcForm((f) => ({ ...f, max_hp: e.target.value }))
                  }
                  placeholder="Max HP"
                  min={1}
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#e94560]"
                  data-testid="npc-hp-input"
                />
                {npcErrors.max_hp && (
                  <p className="text-red-400 text-xs mt-1">{npcErrors.max_hp}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  value={npcForm.ac}
                  onChange={(e) =>
                    setNpcForm((f) => ({ ...f, ac: e.target.value }))
                  }
                  placeholder="AC"
                  min={1}
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#e94560]"
                  data-testid="npc-ac-input"
                />
                {npcErrors.ac && (
                  <p className="text-red-400 text-xs mt-1">{npcErrors.ac}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  value={npcForm.spell_save_dc}
                  onChange={(e) =>
                    setNpcForm((f) => ({
                      ...f,
                      spell_save_dc: e.target.value,
                    }))
                  }
                  placeholder="Spell Save DC (optional)"
                  min={1}
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#e94560]"
                  data-testid="npc-dc-input"
                />
                {npcErrors.spell_save_dc && (
                  <p className="text-red-400 text-xs mt-1">
                    {npcErrors.spell_save_dc}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddNpc}
                className="px-3 py-1 bg-[#e94560] text-white text-sm rounded hover:bg-[#c73652] transition-colors"
                data-testid="add-npc-btn"
              >
                Add NPC
              </button>
              <button
                onClick={() => {
                  setShowCustomForm(false);
                  setNpcForm(EMPTY_NPC);
                  setNpcErrors({});
                }}
                className="px-3 py-1 bg-white/10 text-white/60 text-sm rounded hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Combatant list */}
      {combatants.length > 0 && (
        <div>
          <h2 className="text-white/80 text-sm font-medium mb-2">
            Combatants ({combatants.length})
          </h2>
          <ul
            className="space-y-1"
            data-testid="combatant-list"
            role="list"
            aria-label="Combatants"
          >
            {combatants.map((c: Combatant) => (
              <li
                key={c.id}
                className="flex items-center justify-between bg-[#16213e] border border-white/5 rounded px-4 py-2"
                data-testid={`combatant-row-${c.id}`}
              >
                <div>
                  <span className="text-white text-sm font-medium">{c.name}</span>
                  <span className="text-white/40 text-xs ml-2">
                    HP {c.current_hp}/{c.max_hp} · AC {c.ac}
                    {c.spell_save_dc ? ` · DC ${c.spell_save_dc}` : ""}
                    {c.ruleset_version ? ` · ${c.ruleset_version}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => removeCombatant(c.id)}
                  className="text-white/30 hover:text-red-400 text-xs transition-colors"
                  aria-label={`Remove ${c.name}`}
                  data-testid={`remove-combatant-${c.id}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {submitError && (
        <p className="text-red-400 text-sm" role="alert">
          {submitError}
        </p>
      )}

      {/* Start Combat */}
      <div className="flex justify-end">
        <button
          onClick={handleStartCombat}
          disabled={isPending}
          className="px-5 py-2 bg-[#e94560] text-white font-medium rounded-md hover:bg-[#c73652] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="start-combat-btn"
        >
          {isPending ? "Creating…" : "Start Combat"}
        </button>
      </div>
    </div>
  );
}
