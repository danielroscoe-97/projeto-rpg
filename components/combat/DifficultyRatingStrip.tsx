"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DIFFICULTY_OPTIONS } from "./DifficultyPoll";

interface DifficultyRatingStripProps {
  onSelect: (vote: 1 | 2 | 3 | 4 | 5) => void;
  initialValue?: number | null;
  /** Compact: icon-only (recap inline). Full: icon + label (standalone poll). */
  compact?: boolean;
  /** When true, user can reselect/change vote after initial click.
   *  Use for pages with explicit submit (e.g. /feedback/[token]).
   *  Default false matches in-session poll behavior (one-shot commit). */
  allowChange?: boolean;
}

export function DifficultyRatingStrip({ onSelect, initialValue = null, compact = false, allowChange = false }: DifficultyRatingStripProps) {
  const t = useTranslations("combat");
  const [selected, setSelected] = useState<number | null>(initialValue);
  const hasSelected = selected !== null;
  const isLocked = hasSelected && !allowChange;

  return (
    <div className={cn("flex justify-center", compact ? "gap-1.5" : "gap-2")}>
      {DIFFICULTY_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (!isLocked) {
                setSelected(opt.value);
                onSelect(opt.value);
              }
            }}
            disabled={isLocked}
            className={cn(
              "flex flex-col items-center rounded-lg border transition-all touch-manipulation",
              compact
                ? "justify-center w-10 h-10"
                : "gap-1.5 px-2.5 py-2.5 min-h-[44px]",
              selected === opt.value
                ? opt.bgActive
                : isLocked
                  ? "opacity-20 border-white/5"
                  : `border-white/10 hover:border-white/20 ${opt.color}`
            )}
            title={compact ? t(opt.labelKey) : undefined}
          >
            <Icon className={compact ? "size-5" : "w-6 h-6"} />
            {!compact && (
              <span className="text-xs leading-tight font-medium">
                {t(opt.labelKey)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
