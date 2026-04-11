"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Swords, Dna, Star, Sparkles, Wrench, Zap } from "lucide-react";
import { useCharacterAbilities } from "@/lib/hooks/useCharacterAbilities";
import { AbilityCard } from "./AbilityCard";
import { AddAbilityDialog } from "./AddAbilityDialog";
import type { AbilityType } from "@/lib/types/database";

type FilterType = AbilityType | "all";

const FILTER_TABS: Array<{
  key: FilterType;
  labelKey: string;
  icon: typeof Swords;
}> = [
  { key: "all", labelKey: "filter_all", icon: Zap },
  { key: "class_feature", labelKey: "filter_class", icon: Swords },
  { key: "racial_trait", labelKey: "filter_racial", icon: Dna },
  { key: "feat", labelKey: "filter_feat", icon: Star },
  { key: "subclass_feature", labelKey: "filter_subclass", icon: Sparkles },
  { key: "manual", labelKey: "filter_manual", icon: Wrench },
];

interface AbilitiesSectionProps {
  characterId: string;
  characterClass?: string | null;
  characterRace?: string | null;
  readOnly?: boolean;
}

export function AbilitiesSection({
  characterId,
  characterClass,
  characterRace,
  readOnly = false,
}: AbilitiesSectionProps) {
  const t = useTranslations("player_hq.abilities");
  const locale = useLocale();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    abilities,
    loading,
    addAbility,
    updateAbility,
    toggleDot,
    deleteAbility,
    resetAbility,
    filterByType,
  } = useCharacterAbilities(characterId);

  const filtered = useMemo(() => filterByType(filter), [filterByType, filter]);

  // Group by type for display
  const grouped = useMemo(() => ({
    class_feature: filtered.filter((a) => a.ability_type === "class_feature"),
    subclass_feature: filtered.filter((a) => a.ability_type === "subclass_feature"),
    racial_trait: filtered.filter((a) => a.ability_type === "racial_trait"),
    feat: filtered.filter((a) => a.ability_type === "feat"),
    manual: filtered.filter((a) => a.ability_type === "manual"),
  }), [filtered]);

  // Only show group headers when filter=all
  const showGroups = filter === "all";

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {FILTER_TABS.map(({ key, labelKey, icon: Icon }) => {
          const count =
            key === "all"
              ? abilities.length
              : abilities.filter((a) => a.ability_type === key).length;
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all ${
                filter === key
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                  : "border-border text-muted-foreground hover:border-white/20"
              }`}
            >
              <Icon className="w-3 h-3" />
              {t(labelKey)}
              <span className="text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Abilities list */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <Zap className="w-8 h-8 text-amber-400/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/70 italic">
            {t("empty_state")}
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300"
            >
              {t("add_first")}
            </button>
          )}
        </div>
      ) : showGroups ? (
        // Grouped view
        <div className="space-y-4">
          {(
            [
              "class_feature",
              "subclass_feature",
              "racial_trait",
              "feat",
              "manual",
            ] as const
          ).map((type) => {
            const items = grouped[type];
            if (items.length === 0) return null;
            return (
              <div key={type}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t(`filter_${type === "feat" ? "feat" : type === "class_feature" ? "class" : type === "racial_trait" ? "racial" : type === "subclass_feature" ? "subclass" : "manual"}`)}
                </h4>
                <div className="space-y-1.5">
                  {items.map((ability) => (
                    <AbilityCard
                      key={ability.id}
                      ability={ability}
                      readOnly={readOnly}
                      locale={locale}
                      onToggleDot={toggleDot}
                      onReset={resetAbility}
                      onEdit={setEditingId}
                      onDelete={deleteAbility}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat view (single type filter)
        <div className="space-y-1.5">
          {filtered.map((ability) => (
            <AbilityCard
              key={ability.id}
              ability={ability}
              readOnly={readOnly}
              locale={locale}
              onToggleDot={toggleDot}
              onReset={resetAbility}
              onEdit={setEditingId}
              onDelete={deleteAbility}
            />
          ))}
        </div>
      )}

      {/* Add button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-dashed border-white/[0.08] text-sm text-muted-foreground hover:text-amber-400 hover:border-amber-400/30 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          {t("add_ability")}
        </button>
      )}

      {/* Add dialog */}
      {showAdd && (
        <AddAbilityDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={addAbility}
          characterClass={characterClass}
          characterRace={characterRace}
        />
      )}

      {/* Edit dialog */}
      {editingId && (
        <AddAbilityDialog
          key={editingId}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          editing={abilities.find((a) => a.id === editingId)}
          onAdd={async (input) => {
            await updateAbility(editingId, input);
            setEditingId(null);
            return { data: null, error: null };
          }}
          onDelete={async () => {
            await deleteAbility(editingId);
            setEditingId(null);
          }}
          characterClass={characterClass}
          characterRace={characterRace}
        />
      )}
    </div>
  );
}
