"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus, Minus, X, Save, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { EncounterPlayerSelector } from "./EncounterPlayerSelector";
import { EncounterDifficultyBar } from "./EncounterDifficultyBar";
import { CampaignEncounterList } from "./CampaignEncounterList";
import {
  createEncounterPreset,
  updateEncounterPreset,
  fetchEncounterPresets,
} from "@/lib/supabase/encounter-presets";
import type { EncounterPreset } from "@/lib/types/encounter-preset";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";
import { calculateDifficulty, type FormulaVersion } from "@/lib/utils/cr-calculator";
import { BUILDER_STARTER_ENCOUNTERS, type BuilderStarterEncounter } from "@/lib/data/starter-encounters";

interface MonsterOption {
  name: string;
  cr: string;
  type?: string;
  slug?: string;
  token_url?: string | null;
  source?: string;
}

interface EncounterMonster extends MonsterOption {
  id: string;
  count: number;
}

interface Props {
  campaignId: string;
  members: CampaignMemberWithUser[];
  characters: PlayerCharacter[];
  monsters: MonsterOption[];
}

function generateAutoName(creatures: EncounterMonster[]): string {
  return creatures
    .map((c) => `${c.count}x ${c.name}`)
    .join(" + ");
}

export function CampaignEncounterBuilder({ campaignId, members, characters, monsters }: Props) {
  const t = useTranslations("encounter_builder");

  // ── State ──
  const players = members.filter((m) => m.role === "player");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(() =>
    characters.map((c) => c.id)
  );
  const [encounter, setEncounter] = useState<EncounterMonster[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetNotes, setPresetNotes] = useState("");
  const [formulaVersion, setFormulaVersion] = useState<FormulaVersion>("2014");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // ── Presets ──
  const [presets, setPresets] = useState<EncounterPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);

  useEffect(() => {
    fetchEncounterPresets(campaignId)
      .then(setPresets)
      .catch(() => {})
      .finally(() => setPresetsLoading(false));
  }, [campaignId]);

  // ── Computed party data ──
  const { partySize, partyLevel } = useMemo(() => {
    const selectedChars = characters.filter((c) =>
      selectedCharacterIds.includes(c.id),
    );

    const size = selectedChars.length;
    const totalLevel = selectedChars.reduce((sum, c) => sum + (c.level ?? 1), 0);
    const avgLevel = size > 0 ? Math.round(totalLevel / size) : 1;

    return { partySize: size, partyLevel: avgLevel };
  }, [selectedCharacterIds, characters]);

  // ── Monster search ──
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return monsters.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 15);
  }, [search, monsters]);

  // ── Monster for difficulty bar ──
  const monstersForCalc = useMemo(
    () => encounter.map((m) => ({ cr: m.cr, count: m.count })),
    [encounter]
  );

  // ── Auto name ──
  const autoName = useMemo(() => generateAutoName(encounter), [encounter]);

  // ── Actions ──
  const addMonster = useCallback((monster: MonsterOption) => {
    setEncounter((prev) => {
      const existing = prev.find(
        (m) => m.name === monster.name && m.cr === monster.cr
      );
      if (existing) {
        return prev.map((m) =>
          m.id === existing.id ? { ...m, count: m.count + 1 } : m
        );
      }
      return [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          name: monster.name,
          cr: monster.cr,
          count: 1,
          slug: monster.slug,
          token_url: monster.token_url,
          source: monster.source,
        },
      ];
    });
    setSearch("");
    setShowSearch(false);
  }, []);

  const adjustCount = useCallback((id: string, delta: number) => {
    setEncounter((prev) =>
      prev
        .map((m) => (m.id === id ? { ...m, count: Math.max(0, m.count + delta) } : m))
        .filter((m) => m.count > 0)
    );
  }, []);

  const removeMonster = useCallback((id: string) => {
    setEncounter((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ── Save preset ──
  async function handleSave() {
    if (encounter.length === 0) return;
    setSaving(true);
    setSaveError(false);
    try {
      const name = presetName.trim() || autoName || t("unnamed_preset");

      // P1: compute difficulty/xp for persistence
      const expanded = encounter.flatMap((m) =>
        Array.from({ length: m.count }, () => ({ cr: m.cr }))
      );
      const calc = calculateDifficulty(formulaVersion, partyLevel, partySize, expanded);

      // P6: propagate correct source from monster metadata
      const creatures = encounter.map((m) => ({
        monster_slug: m.slug ?? null,
        name: m.name,
        cr: m.cr,
        quantity: m.count,
        source: m.source ?? (m.slug ? "srd" : "manual"),
      }));

      const presetData = {
        name,
        notes: presetNotes || null,
        difficulty: calc.difficulty,
        totalXp: calc.totalValue,
        adjustedXp: calc.totalValue,
        selectedMembers: selectedCharacterIds,
        formulaVersion,
        creatures,
      };

      if (editingPresetId) {
        const updated = await updateEncounterPreset(editingPresetId, presetData);
        setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setEditingPresetId(null);
      } else {
        const created = await createEncounterPreset(campaignId, presetData);
        setPresets((prev) => [created, ...prev]);
      }

      // Reset builder
      setPresetName("");
      setPresetNotes("");
      setEncounter([]);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  // ── Load preset for editing ──
  function handleEditPreset(preset: EncounterPreset) {
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetNotes(preset.notes ?? "");
    // Try character IDs first, then fallback to member-based matching (old presets)
    const validCharIds = new Set(characters.map((c) => c.id));
    let filtered = preset.selected_members.filter((id) => validCharIds.has(id));
    if (filtered.length === 0) {
      // Fallback: old preset stored member IDs — resolve to character IDs via user_id
      const memberMap = new Map(players.map((p) => [p.id, p.user_id]));
      filtered = preset.selected_members
        .map((mid) => {
          const userId = memberMap.get(mid);
          return userId ? characters.find((c) => c.user_id === userId)?.id : undefined;
        })
        .filter((id): id is string => !!id);
    }
    setSelectedCharacterIds(filtered.length > 0 ? filtered : characters.map((c) => c.id));
    setFormulaVersion(preset.formula_version as FormulaVersion);
    setEncounter(
      preset.creatures.map((c) => ({
        id: Math.random().toString(36).slice(2),
        name: c.name,
        cr: c.cr ?? "0",
        count: c.quantity,
        slug: c.monster_slug ?? undefined,
        token_url: null,
      }))
    );
  }

  function handleDeletedPreset(presetId: string) {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (editingPresetId === presetId) {
      setEditingPresetId(null);
      setEncounter([]);
      setPresetName("");
      setPresetNotes("");
    }
  }

  // ── Starter Packs ──
  const [startersOpen, setStartersOpen] = useState(false);

  function loadStarter(starter: BuilderStarterEncounter) {
    setEditingPresetId(null);
    setPresetName(t(starter.nameKey));
    setPresetNotes("");
    setEncounter(
      starter.creatures.map((c) => ({
        id: Math.random().toString(36).slice(2),
        name: c.name,
        cr: c.cr,
        count: c.quantity,
        slug: c.slug,
        token_url: null,
        source: c.source,
      }))
    );
    setStartersOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Tab headers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Builder */}
        <div className="lg:col-span-2 space-y-4">
          {/* Player selector */}
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <EncounterPlayerSelector
              characters={characters}
              selectedCharacterIds={selectedCharacterIds}
              onSelectionChange={setSelectedCharacterIds}
            />
          </div>

          {/* Formula toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("formula")}:</span>
            {(["2014", "2024"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFormulaVersion(v)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  formulaVersion === v
                    ? "border-amber-500 text-amber-400 bg-amber-500/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                DMG {v}
              </button>
            ))}
          </div>

          {/* Monster search */}
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <label className="text-sm text-amber-400 font-semibold block mb-2">
              {t("add_monster")}
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  placeholder={t("search_placeholder")}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-amber-500/50"
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-xl z-30 max-h-60 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={`${m.name}-${m.cr}`}
                      type="button"
                      onClick={() => addMonster(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <div className="w-6 h-6 shrink-0 rounded-full overflow-hidden bg-gray-800 border border-gray-700">
                        {m.token_url ? (
                          <img src={m.token_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">?</div>
                        )}
                      </div>
                      <span className="text-foreground flex-1 truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">CR {m.cr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monster list */}
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-amber-400">
                {t("encounter_monsters")} ({encounter.reduce((s, m) => s + m.count, 0)})
              </h2>
              {encounter.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEncounter([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("clear_all")}
                </button>
              )}
            </div>

            {encounter.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("no_monsters")}</p>
            ) : (
              <div className="space-y-2">
                {encounter.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-gray-800 border border-gray-700">
                        {m.token_url ? (
                          <img src={m.token_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">?</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => adjustCount(m.id, -1)}
                          className="w-6 h-6 rounded text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-foreground">
                          {m.count}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustCount(m.id, 1)}
                          className="w-6 h-6 rounded text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm text-foreground truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">CR {m.cr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMonster(m.id)}
                      className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save controls */}
          {encounter.length > 0 && (
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-400">
                {editingPresetId ? t("update_preset") : t("save_preset")}
              </h3>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={autoName || t("preset_name_placeholder")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-amber-500/50"
              />
              <textarea
                value={presetNotes}
                onChange={(e) => setPresetNotes(e.target.value)}
                placeholder={t("notes_placeholder")}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-amber-500/50 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-black hover:brightness-110 transition-all disabled:opacity-50 min-h-[40px]"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingPresetId ? t("update") : t("save")}
                </button>
                {editingPresetId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPresetId(null);
                      setEncounter([]);
                      setPresetName("");
                      setPresetNotes("");
                    }}
                    className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors min-h-[40px]"
                  >
                    {t("cancel")}
                  </button>
                )}
              </div>
              {saveError && (
                <p className="text-xs text-red-400">{t("error_save")}</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Difficulty bar */}
        <div className="lg:col-span-1">
          <EncounterDifficultyBar
            partyLevel={partyLevel}
            partySize={partySize}
            monsters={monstersForCalc}
            formulaVersion={formulaVersion}
          />
        </div>
      </div>

      {/* Starter Packs */}
      <div className="border-t border-border pt-6">
        <button
          type="button"
          onClick={() => setStartersOpen((v) => !v)}
          className="flex items-center gap-2 w-full text-left mb-3"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-400 flex-1">{t("starter_packs")}</h2>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              startersOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {startersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {BUILDER_STARTER_ENCOUNTERS.map((starter) => {
              const creaturePreview = starter.creatures
                .map((c) => `${c.quantity}x ${c.name}`)
                .join(", ");
              const diffColor =
                starter.difficulty === "easy" ? "text-green-400 border-green-700" :
                starter.difficulty === "medium" ? "text-yellow-400 border-yellow-700" :
                starter.difficulty === "hard" ? "text-orange-400 border-orange-700" :
                "text-red-400 border-red-700";
              return (
                <button
                  key={starter.id}
                  type="button"
                  onClick={() => loadStarter(starter)}
                  className="text-left rounded-lg border border-border bg-card/50 p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{t(starter.nameKey)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${diffColor}`}>
                      {t(`diff_${starter.difficulty}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(starter.descriptionKey)}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {creaturePreview} &middot; {t("level_range", { min: starter.levelRange[0], max: starter.levelRange[1] })}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved presets */}
      <div className="border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-amber-400 mb-3">{t("saved_presets")}</h2>
        {presetsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CampaignEncounterList
            campaignId={campaignId}
            presets={presets}
            onEdit={handleEditPreset}
            onDeleted={handleDeletedPreset}
          />
        )}
      </div>
    </div>
  );
}
