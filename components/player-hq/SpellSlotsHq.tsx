"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Wand2, Pencil } from "lucide-react";
import { SpellSlotGrid } from "@/components/ui/SpellSlotGrid";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

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
  // PRD decision #37 a11y — per-dot aria-label appends "used"/"available"
  // so screen-reader output stays unambiguous when V2 flips the visual
  // mapping. Same i18n keys as `components/player/SpellSlotTracker.tsx`.
  const tPlayer = useTranslations("player");
  const [editingMax, setEditingMax] = useState<string | null>(null);
  // PRD decision #37 — V2 ON inverts the dot semantic for transient
  // resources: filled = used/spent (instead of filled = available).
  const v2 = isPlayerHqV2Enabled();

  const slots = spellSlots ?? {};
  const levels = Object.entries(slots)
    .filter(([, v]) => v.max > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  const handleToggle = useCallback(
    (level: string, dotIndex: number) => {
      if (readOnly) return;
      const slot = slots[level];
      if (!slot) return;

      // Toggle semantics depend on the visual mapping:
      //   Legacy (V2 OFF): dot is filled when i < remaining → clicking a
      //     filled dot consumes (used+1); clicking an empty dot restores.
      //   Inverted (V2 ON): dot is filled when i < used → clicking a
      //     filled dot restores (used-1); clicking an empty dot consumes.
      let newUsed: number;
      if (v2) {
        if (dotIndex < slot.used) {
          newUsed = slot.used - 1;
        } else {
          newUsed = slot.used + 1;
        }
      } else {
        const filled = slot.max - slot.used;
        if (dotIndex < filled) {
          newUsed = slot.used + 1;
        } else {
          newUsed = slot.used - 1;
        }
      }
      newUsed = Math.max(0, Math.min(slot.max, newUsed));

      const updated = { ...slots, [level]: { ...slot, used: newUsed } };
      navigator.vibrate?.([50]);
      onUpdateSpellSlots(updated);
    },
    [slots, readOnly, onUpdateSpellSlots, v2]
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
    <div className="space-y-2 bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          {t("spell_slots_title")}
        </h3>
        {!readOnly && Object.keys(slots).length < 9 && (
          <button
            type="button"
            onClick={addLevel}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {t("spell_slots_add_level")}
          </button>
        )}
      </div>

      {levels.length === 0 ? (
        <div className="py-4 text-center">
          <Wand2 className="w-7 h-7 text-amber-400/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("spell_slots_empty")}</p>
          {!readOnly && (
            <button
              type="button"
              onClick={addLevel}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300"
            >
              {t("spell_slots_add_first")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {levels.map(([level, { max, used }]) => (
            <div key={level} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-amber-400 w-8 shrink-0 text-right">
                {level}°
              </span>
              <div className="flex-1">
                <SpellSlotGrid
                  used={used}
                  max={max}
                  variant="transient"
                  density="comfortable"
                  filledClassName="bg-amber-400 border-amber-400"
                  readOnly={readOnly}
                  onToggle={(idx) => handleToggle(level, idx)}
                  ariaLabel={`${t("spell_slots_level")} ${level}`}
                  dotAriaLabel={(i, isFilled) => {
                    // When inverted (V2 ON) filled = used; legacy filled = available.
                    const slotIsUsed = v2 ? isFilled : !isFilled;
                    return `${t("spell_slots_level")} ${level} slot ${i + 1}, ${
                      slotIsUsed
                        ? tPlayer("spell_slots_used")
                        : tPlayer("spell_slots_available")
                    }`;
                  }}
                  inverted={v2}
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
                    className="group/max text-[10px] text-muted-foreground hover:text-foreground tabular-nums w-10 text-center inline-flex items-center justify-center gap-0.5"
                    title={t("spell_slots_edit_max")}
                  >
                    max:{max}
                    <Pencil className="w-2 h-2 opacity-0 group-hover/max:opacity-100 transition-opacity" />
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
