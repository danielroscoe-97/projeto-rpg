"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { ResourceDots } from "./ResourceDots";

interface SpellSlotsHqProps {
  spellSlots: Record<string, { max: number; used: number }> | null;
  onUpdateSpellSlots: (
    slots: Record<string, { max: number; used: number }>
  ) => void;
  readOnly?: boolean;
}

export function SpellSlotsHq({
  spellSlots,
  onUpdateSpellSlots,
  readOnly = false,
}: SpellSlotsHqProps) {
  const t = useTranslations("player_hq.resources");
  const [editingMax, setEditingMax] = useState<string | null>(null);

  const slots = spellSlots ?? {};
  const levels = Object.entries(slots)
    .filter(([, v]) => v.max > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  const handleToggle = useCallback(
    (level: string, dotIndex: number) => {
      if (readOnly) return;
      const slot = slots[level];
      if (!slot) return;

      const filled = slot.max - slot.used;
      let newUsed: number;

      if (dotIndex < filled) {
        newUsed = slot.used + 1;
      } else {
        newUsed = slot.used - 1;
      }
      newUsed = Math.max(0, Math.min(slot.max, newUsed));

      const updated = { ...slots, [level]: { ...slot, used: newUsed } };
      navigator.vibrate?.([50]);
      onUpdateSpellSlots(updated);
    },
    [slots, readOnly, onUpdateSpellSlots]
  );

  const handleMaxChange = useCallback(
    (level: string, newMax: number) => {
      if (readOnly) return;
      const slot = slots[level] ?? { max: 0, used: 0 };
      const clampedMax = Math.max(0, newMax);
      const clampedUsed = Math.min(slot.used, clampedMax);
      // M-06 fix: avoid delete on spread — filter out zero-max levels
      if (clampedMax === 0) {
        const { [level]: _, ...rest } = slots;
        onUpdateSpellSlots(rest);
      } else {
        onUpdateSpellSlots({
          ...slots,
          [level]: { max: clampedMax, used: clampedUsed },
        });
      }
    },
    [slots, readOnly, onUpdateSpellSlots]
  );

  const addLevel = useCallback(() => {
    const existingLevels = Object.keys(slots).map(Number);
    const nextLevel =
      existingLevels.length > 0 ? Math.max(...existingLevels) + 1 : 1;
    if (nextLevel > 9) return;
    const updated = { ...slots, [String(nextLevel)]: { max: 1, used: 0 } };
    onUpdateSpellSlots(updated);
  }, [slots, onUpdateSpellSlots]);

  if (levels.length === 0 && readOnly) return null;

  return (
    <div className="space-y-2 bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("spell_slots_title")}
        </h3>
        {!readOnly && Object.keys(slots).length < 9 && (
          <button
            type="button"
            onClick={addLevel}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {t("spell_slots_add_level")}
          </button>
        )}
      </div>

      {levels.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">{t("spell_slots_empty")}</p>
          {!readOnly && (
            <button
              type="button"
              onClick={addLevel}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300"
            >
              {t("spell_slots_add_first")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {levels.map(([level, { max, used }]) => (
            <div key={level} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8 shrink-0 text-right">
                {level}°
              </span>
              <div className="flex-1">
                <ResourceDots
                  usedCount={used}
                  max={max}
                  color="bg-purple-400 border-purple-400"
                  size="md"
                  readOnly={readOnly}
                  onToggle={(idx) => handleToggle(level, idx)}
                  label={`${t("spell_slots_level")} ${level}`}
                />
              </div>
              {/* Inline max edit */}
              {!readOnly && (
                editingMax === level ? (
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={max}
                    onChange={(e) =>
                      handleMaxChange(level, parseInt(e.target.value, 10) || 0)
                    }
                    onBlur={() => setEditingMax(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingMax(null)}
                    autoFocus
                    className="w-10 bg-background border border-border rounded px-1 py-0.5 text-xs text-center text-foreground"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingMax(level)}
                    className="text-[10px] text-muted-foreground hover:text-foreground tabular-nums w-10 text-center"
                    title={t("spell_slots_edit_max")}
                  >
                    max:{max}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
