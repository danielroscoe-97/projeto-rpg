"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Sparkles } from "lucide-react";
import { ActiveEffectCard } from "./ActiveEffectCard";
import { AddActiveEffectDialog } from "./AddActiveEffectDialog";
import type { ActiveEffect, ActiveEffectInsert, ActiveEffectUpdate } from "@/lib/types/database";

interface ActiveEffectsPanelProps {
  effects: ActiveEffect[];
  loading: boolean;
  readOnly?: boolean;
  onAdd: (input: Omit<ActiveEffectInsert, "player_character_id">) => Promise<{
    data: unknown;
    error: unknown;
  }>;
  onUpdate: (id: string, updates: ActiveEffectUpdate) => Promise<unknown>;
  onDismiss: (id: string) => Promise<void>;
  onDecrementQuantity: (id: string) => Promise<void>;
  onIncrementQuantity: (id: string) => Promise<void>;
  concentrationConflictName?: string | null;
  onDismissConcentration?: () => Promise<void>;
}

export function ActiveEffectsPanel({
  effects,
  loading,
  readOnly = false,
  onAdd,
  onUpdate,
  onDismiss,
  onDecrementQuantity,
  onIncrementQuantity,
  concentrationConflictName,
  onDismissConcentration,
}: ActiveEffectsPanelProps) {
  const t = useTranslations("player_hq.active_effects");
  const [showAdd, setShowAdd] = useState(false);

  // Concentration effects first, then rest by created_at desc
  const sorted = [...effects].sort((a, b) => {
    if (a.is_concentration && !b.is_concentration) return -1;
    if (!a.is_concentration && b.is_concentration) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const concentrationEffects = sorted.filter((e) => e.is_concentration);
  const otherEffects = sorted.filter((e) => !e.is_concentration);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-400">
            {t("title")}
          </h3>
          {effects.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
              {effects.length}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors min-h-[44px] px-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("add")}
          </button>
        )}
      </div>

      {/* Effects list */}
      {effects.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 py-2 text-center">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {/* Concentration effects */}
          {concentrationEffects.map((effect) => (
            <ActiveEffectCard
              key={effect.id}
              effect={effect}
              onUpdate={onUpdate}
              onDismiss={onDismiss}
              onDecrementQuantity={onDecrementQuantity}
              onIncrementQuantity={onIncrementQuantity}
              readOnly={readOnly}
            />
          ))}

          {/* Separator if both groups exist */}
          {concentrationEffects.length > 0 && otherEffects.length > 0 && (
            <div className="border-t border-white/[0.04]" />
          )}

          {/* Other effects */}
          {otherEffects.map((effect) => (
            <ActiveEffectCard
              key={effect.id}
              effect={effect}
              onUpdate={onUpdate}
              onDismiss={onDismiss}
              onDecrementQuantity={onDecrementQuantity}
              onIncrementQuantity={onIncrementQuantity}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <AddActiveEffectDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={onAdd}
        concentrationConflict={concentrationConflictName}
        onDismissConcentration={onDismissConcentration}
      />
    </div>
  );
}
