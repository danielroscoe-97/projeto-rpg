"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Trash2,
  Pencil,
  Moon,
  MoonStar,
  Sun,
  RefreshCw,
  Swords,
  Dna,
  Star,
  Sparkles,
  Wrench,
} from "lucide-react";
import { ResourceDots } from "./ResourceDots";
import type { CharacterAbility } from "@/lib/types/database";

const RESET_ICONS: Record<string, typeof Moon> = {
  short_rest: MoonStar,
  long_rest: Moon,
  dawn: Sun,
  manual: RefreshCw,
};

const RESET_COLORS: Record<string, string> = {
  short_rest: "text-amber-400",
  long_rest: "text-blue-400",
  dawn: "text-orange-400",
  manual: "text-muted-foreground",
};

const DOT_COLORS: Record<string, string> = {
  short_rest: "bg-amber-400 border-amber-400",
  long_rest: "bg-blue-400 border-blue-400",
  dawn: "bg-orange-400 border-orange-400",
  manual: "bg-amber-400 border-amber-400",
};

const TYPE_ICONS: Record<string, typeof Swords> = {
  class_feature: Swords,
  racial_trait: Dna,
  feat: Star,
  subclass_feature: Sparkles,
  manual: Wrench,
};

const TYPE_COLORS: Record<string, string> = {
  class_feature: "text-amber-400",
  racial_trait: "text-emerald-400",
  feat: "text-purple-400",
  subclass_feature: "text-cyan-400",
  manual: "text-muted-foreground",
};

interface AbilityCardProps {
  ability: CharacterAbility;
  readOnly?: boolean;
  locale?: string;
  onToggleDot: (abilityId: string, dotIndex: number) => void;
  onReset: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AbilityCard({
  ability,
  readOnly = false,
  locale = "pt-BR",
  onToggleDot,
  onReset,
  onEdit,
  onDelete,
}: AbilityCardProps) {
  const t = useTranslations("player_hq.abilities");
  const [expanded, setExpanded] = useState(false);

  const isPt = locale.startsWith("pt");
  const displayName = (isPt && ability.name_pt) || ability.name;
  const displayDesc = (isPt && ability.description_pt) || ability.description;
  const hasDescription = !!displayDesc;
  const hasUses = ability.max_uses != null && ability.max_uses > 0;

  const TypeIcon = TYPE_ICONS[ability.ability_type] ?? Wrench;
  const typeColor = TYPE_COLORS[ability.ability_type] ?? "text-muted-foreground";
  const resetType = ability.reset_type ?? "manual";
  const ResetIcon = RESET_ICONS[resetType] ?? RefreshCw;
  const resetColor = RESET_COLORS[resetType] ?? "text-muted-foreground";
  const dotColor = DOT_COLORS[resetType] ?? "bg-amber-400 border-amber-400";

  // Source label
  const sourceLabel = ability.source_class
    ? ability.source_class.charAt(0).toUpperCase() + ability.source_class.slice(1)
    : ability.source_race
      ? ability.source_race.charAt(0).toUpperCase() + ability.source_race.slice(1)
      : null;

  return (
    <div className="bg-card border border-border rounded-xl transition-all duration-200 hover:border-white/[0.12]">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Expand toggle */}
        {hasDescription ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        {/* Type icon + Name */}
        <button
          type="button"
          onClick={() => hasDescription && setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5">
            <TypeIcon className={`w-3.5 h-3.5 ${typeColor} shrink-0`} />
            <span className="text-sm font-medium text-foreground truncate">
              {displayName}
            </span>
            {ability.source === "srd" && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded shrink-0">
                SRD
              </span>
            )}
          </div>
          {/* Subtitle: source + level + reset */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {sourceLabel && (
              <span className="text-[11px] text-muted-foreground">{sourceLabel}</span>
            )}
            {ability.level_acquired && (
              <>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {t("level_prefix")}{ability.level_acquired}
                </span>
              </>
            )}
            {hasUses && (
              <>
                <span className="text-[11px] text-muted-foreground/50">·</span>
                <ResetIcon className={`w-3 h-3 ${resetColor}`} />
                <span className={`text-[11px] ${resetColor}`}>
                  {t(`reset_${resetType}`)}
                </span>
              </>
            )}
          </div>
        </button>

        {/* Actions (right side) */}
        {!readOnly && (
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Reset button */}
            {hasUses && ability.current_uses > 0 && (
              <button
                type="button"
                onClick={() => onReset(ability.id)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px]"
                aria-label={`Reset ${displayName}`}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            {/* Edit */}
            <button
              type="button"
              onClick={() => onEdit(ability.id)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px]"
              aria-label={t("edit")}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Dots row (if has uses) */}
      {hasUses && (
        <div className="px-3 pb-2 pl-10">
          <ResourceDots
            usedCount={ability.current_uses}
            max={ability.max_uses!}
            color={dotColor}
            size="md"
            readOnly={readOnly}
            onToggle={(idx) => onToggleDot(ability.id, idx)}
            label={displayName}
          />
        </div>
      )}

      {/* Expanded description */}
      {expanded && hasDescription && (
        <div className="px-3 pb-3 pl-10 border-t border-border/50 mt-1 pt-2">
          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
            {displayDesc}
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onDelete(ability.id)}
              className="mt-2 flex items-center gap-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              {t("remove")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
