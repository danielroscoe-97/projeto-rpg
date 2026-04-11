"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BookOpen, Plus, Search, Filter } from "lucide-react";
import { SpellCard } from "./SpellCard";
import { useCharacterSpells } from "@/lib/hooks/useCharacterSpells";
import type { CharacterSpellInsert, SpellStatus } from "@/lib/types/database";

type FilterMode = "all" | "prepared" | "favorite" | "cantrips";

interface SpellListSectionProps {
  characterId: string;
}

export function SpellListSection({ characterId }: SpellListSectionProps) {
  const t = useTranslations("player_hq.spells");
  const { spells, loading, addSpell, toggleStatus, removeSpell } = useCharacterSpells(characterId);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSpell, setNewSpell] = useState({ name: "", level: "0" });
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [concFilter, setConcFilter] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Collect available schools for filter pills
  const availableSchools = useMemo(() => {
    const schools = new Set<string>();
    for (const s of spells) {
      if (s.school) schools.add(s.school);
    }
    return [...schools].sort();
  }, [spells]);

  // Collect available levels for filter pills
  const availableLevels = useMemo(() => {
    const levels = new Set<number>();
    for (const s of spells) levels.add(s.spell_level);
    return [...levels].sort((a, b) => a - b);
  }, [spells]);

  const filtered = useMemo(() => {
    let result = spells;
    if (filter === "prepared") result = result.filter((s) => s.status === "prepared");
    else if (filter === "favorite") result = result.filter((s) => s.status === "favorite");
    else if (filter === "cantrips") result = result.filter((s) => s.spell_level === 0);

    if (levelFilter !== null) result = result.filter((s) => s.spell_level === levelFilter);
    if (schoolFilter) result = result.filter((s) => s.school === schoolFilter);
    if (concFilter) result = result.filter((s) => s.is_concentration);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.spell_name.toLowerCase().includes(q) ||
          (s.school && s.school.toLowerCase().includes(q))
      );
    }
    return result;
  }, [spells, filter, search, levelFilter, schoolFilter, concFilter]);

  // Group by level for display
  const grouped = useMemo(() => {
    const groups: Record<number, typeof filtered> = {};
    for (const spell of filtered) {
      if (!groups[spell.spell_level]) groups[spell.spell_level] = [];
      groups[spell.spell_level].push(spell);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([level, spells]) => ({ level: Number(level), spells }));
  }, [filtered]);

  const handleAddManual = async () => {
    const name = newSpell.name.trim();
    if (!name) return;
    const insert: CharacterSpellInsert = {
      player_character_id: characterId,
      spell_name: name,
      spell_level: parseInt(newSpell.level, 10) || 0,
    };
    await addSpell(insert);
    setNewSpell({ name: "", level: "0" });
    setShowAddForm(false);
    navigator.vibrate?.([30]);
  };

  const filters: { key: FilterMode; label: string }[] = [
    { key: "all", label: t("filter_all") },
    { key: "prepared", label: t("filter_prepared") },
    { key: "favorite", label: t("filter_favorite") },
    { key: "cantrips", label: t("filter_cantrips") },
  ];

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-white/5 rounded" />
        <div className="h-16 bg-white/5 rounded" />
        <div className="h-16 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-amber-400">{t("title")}</h3>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full bg-white/5 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-amber-400 hover:text-amber-300 transition-colors"
          aria-label={t("add_spell")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`shrink-0 px-3 min-h-[36px] text-xs rounded-full border transition-colors ${
              filter === key
                ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                : "border-border text-muted-foreground hover:border-white/20"
            }`}
          >
            {label}
          </button>
        ))}
        {spells.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`shrink-0 px-3 min-h-[36px] text-xs rounded-full border transition-colors flex items-center gap-1 ${
              showAdvanced || levelFilter !== null || schoolFilter || concFilter
                ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                : "border-border text-muted-foreground hover:border-white/20"
            }`}
          >
            <Filter className="w-3 h-3" />
            {t("advanced_filters")}
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-white/[0.02] rounded-lg border border-border/30 p-3 space-y-2">
          {/* Level filter */}
          {availableLevels.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-12 shrink-0">{t("filter_level")}</span>
              <button
                type="button"
                onClick={() => setLevelFilter(null)}
                className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                  levelFilter === null ? "bg-amber-400/15 text-amber-400 border border-amber-400/30" : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {t("filter_all")}
              </button>
              {availableLevels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(levelFilter === lvl ? null : lvl)}
                  className={`text-[10px] px-2 py-1 rounded-md font-mono transition-colors ${
                    levelFilter === lvl ? "bg-amber-400/15 text-amber-400 border border-amber-400/30" : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {lvl === 0 ? "C" : lvl}
                </button>
              ))}
            </div>
          )}

          {/* School filter */}
          {availableSchools.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-12 shrink-0">{t("filter_school")}</span>
              <button
                type="button"
                onClick={() => setSchoolFilter(null)}
                className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                  !schoolFilter ? "bg-amber-400/15 text-amber-400 border border-amber-400/30" : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {t("filter_all")}
              </button>
              {availableSchools.map((school) => (
                <button
                  key={school}
                  type="button"
                  onClick={() => setSchoolFilter(schoolFilter === school ? null : school)}
                  className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                    schoolFilter === school ? "bg-amber-400/15 text-amber-400 border border-amber-400/30" : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {school}
                </button>
              ))}
            </div>
          )}

          {/* Concentration toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-12 shrink-0">{t("filter_conc")}</span>
            <button
              type="button"
              onClick={() => setConcFilter(!concFilter)}
              className={`text-[10px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                concFilter ? "bg-orange-500/15 text-orange-300 border border-orange-500/30" : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-300">C</span>
              {t("filter_concentration")}
            </button>
          </div>
        </div>
      )}

      {/* Add manual form */}
      {showAddForm && (
        <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-border/50">
          <input
            type="text"
            autoFocus
            value={newSpell.name}
            onChange={(e) => setNewSpell((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddManual(); if (e.key === "Escape") setShowAddForm(false); }}
            placeholder={t("spell_name_placeholder")}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border/30 pb-1"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">{t("spell_level_label")}</label>
            <select
              value={newSpell.level}
              onChange={(e) => setNewSpell((s) => ({ ...s, level: e.target.value }))}
              className="bg-white/5 border border-border rounded px-2 py-1 text-xs text-foreground"
            >
              <option value="0">{t("cantrip")}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={String(n)}>{t("level_n", { n })}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-2"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleAddManual}
              disabled={!newSpell.name.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 min-h-[44px] px-2"
            >
              {t("add")}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {spells.length === 0 && !showAddForm && (
        <div className="py-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t("empty_state")}</p>
          <Link
            href="/app/compendium?tab=spells"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-amber-400/10 border border-amber-400/20 text-sm text-amber-400 hover:bg-amber-400/20 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {t("browse_srd_spells")}
          </Link>
        </div>
      )}

      {/* Grouped spell list */}
      {grouped.map(({ level, spells: levelSpells }) => (
        <div key={level} className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground px-1">
            {level === 0 ? t("cantrips_header") : t("level_header", { n: level })}
          </h4>
          {levelSpells.map((spell) => (
            <SpellCard
              key={spell.id}
              spell={spell}
              onToggleStatus={toggleStatus}
              onRemove={removeSpell}
            />
          ))}
        </div>
      ))}

      {search && filtered.length === 0 && spells.length > 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("no_search_results")}
        </p>
      )}
    </div>
  );
}
