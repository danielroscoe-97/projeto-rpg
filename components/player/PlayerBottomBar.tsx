"use client";

import { useTranslations } from "next-intl";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { getHpBarColor, getHpThresholdKey } from "@/lib/utils/hp-status";
import type { RulesetVersion } from "@/lib/types/database";
import { Shield } from "lucide-react";

interface PlayerBottomBarProps {
  character: {
    id: string;
    name: string;
    current_hp: number;
    max_hp: number;
    temp_hp?: number;
    ac?: number;
    conditions: string[];
    is_defeated: boolean;
    ruleset_version: string | null;
  };
  rulesetVersion: RulesetVersion;
  /** Callback when a player edits their own character's note */
  onPlayerNote?: (combatantId: string, note: string) => void;
}

export function PlayerBottomBar({ character, rulesetVersion }: PlayerBottomBarProps) {
  const t = useTranslations("player");

  const currentHp = character.current_hp;
  const maxHp = character.max_hp;
  const tempHp = character.temp_hp ?? 0;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 0;
  const hpBarColor = getHpBarColor(currentHp, maxHp);
  const hpThresholdKey = getHpThresholdKey(currentHp, maxHp);
  const hasTempHp = tempHp > 0;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-sm border-t border-border/50 safe-area-pb lg:hidden"
      data-testid={`player-bottom-bar-${character.id}`}
    >
      <div className="px-4 py-2.5 space-y-1.5">
        {/* Compact single-line: Name | HP bar | HP numbers | AC */}
        <div className="flex items-center gap-3">
          {/* Name — compact */}
          <span className="text-foreground text-sm font-semibold truncate max-w-[100px]">
            {character.name}
          </span>

          {character.is_defeated && (
            <span className="text-xs text-red-400 font-medium shrink-0">
              {t("defeated")}
            </span>
          )}

          {/* HP bar — flexible middle */}
          <div className="flex-1 min-w-0">
            <div
              className="h-4 bg-white/[0.06] rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={currentHp}
              aria-valuemin={0}
              aria-valuemax={maxHp}
              aria-label={t("hp_aria", { name: character.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${hpBarColor}`}
                style={{ width: `${hpPct * 100}%` }}
              />
            </div>
          </div>

          {/* HP numbers */}
          <span className="text-foreground text-sm font-mono font-bold shrink-0">
            {currentHp}<span className="text-muted-foreground text-xs font-normal">/{maxHp}</span>
            {hasTempHp && (
              <span className="text-[#9f7aea] ml-1 text-xs">
                +{tempHp}
              </span>
            )}
          </span>

          {/* AC */}
          {character.ac != null && (
            <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-foreground text-sm font-mono font-semibold">
                {character.ac}
              </span>
            </div>
          )}
        </div>

        {/* Condition badges — only if present */}
        {character.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label={`${character.name} ${t("bottom_bar_conditions_label")}`}>
            {character.conditions.map((condition) => (
              <ConditionBadge
                key={condition}
                condition={condition}
                rulesetVersion={(character.ruleset_version as RulesetVersion) ?? rulesetVersion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
