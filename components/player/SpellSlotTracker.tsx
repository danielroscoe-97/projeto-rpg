"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Moon } from "lucide-react";
import { SpellSlotGrid } from "@/components/ui/SpellSlotGrid";

interface SpellSlotTrackerProps {
  spellSlots: Record<string, { max: number; used: number }>;
  onToggleSlot: (level: string, slotIndex: number) => void;
  onLongRest: () => void;
  collapsible?: boolean;
  readOnly?: boolean;
}

export function SpellSlotTracker({
  spellSlots,
  onToggleSlot,
  onLongRest,
  collapsible = false,
  readOnly = false,
}: SpellSlotTrackerProps) {
  const t = useTranslations("player");
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const levels = Object.entries(spellSlots)
    .filter(([, v]) => v.max > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  if (levels.length === 0) return null;

  const handleLongRest = useCallback(() => {
    if (readOnly) return;
    navigator.vibrate?.([100, 50, 100]);
    onLongRest();
  }, [readOnly, onLongRest]);

  // Summary: "4/4 | 2/3 | 1/2"
  const summary = levels
    .map(([, v]) => `${v.max - v.used}/${v.max}`)
    .join(" | ");

  return (
    <div className="space-y-1">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground/80 transition-colors w-full"
        >
          <span className="font-medium">{t("spell_slots_title")}</span>
          {!isExpanded && <span className="text-[10px] opacity-70">{summary}</span>}
          <span className="ml-auto">{isExpanded ? "▾" : "▸"}</span>
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{t("spell_slots_title")}</span>
          {!readOnly && (
            <button
              type="button"
              onClick={handleLongRest}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-blue-400 transition-colors"
              aria-label={t("spell_slots_long_rest")}
            >
              <Moon className="w-3 h-3" />
              {t("spell_slots_long_rest")}
            </button>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-1.5">
          {collapsible && !readOnly && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleLongRest}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-blue-400 transition-colors"
                aria-label={t("spell_slots_long_rest")}
              >
                <Moon className="w-3 h-3" />
                {t("spell_slots_long_rest")}
              </button>
            </div>
          )}
          {levels.map(([level, { max, used }]) => (
            <div key={level} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6 shrink-0">
                {level}°
              </span>
              <SpellSlotGrid
                used={used}
                max={max}
                variant="transient"
                density="compact"
                filledClassName="bg-purple-400 border-purple-400"
                readOnly={readOnly}
                onToggle={(i) => onToggleSlot(level, i)}
                ariaLabel={t("spell_slots_level", { level })}
                dotAriaLabel={(i, isFilled) =>
                  `${t("spell_slots_level", { level })} slot ${i + 1}, ${
                    isFilled ? t("spell_slots_available") : t("spell_slots_used")
                  }`
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
