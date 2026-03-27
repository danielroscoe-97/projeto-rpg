"use client";

import { useTranslations } from "next-intl";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { getHpBarColor, getHpThresholdKey } from "@/lib/utils/hp-status";
import type { RulesetVersion } from "@/lib/types/database";
import { Swords, Shield } from "lucide-react";

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
      className="fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur-sm border-t border-border safe-area-pb lg:hidden"
      data-testid={`player-bottom-bar-${character.id}`}
    >
      <div className="px-4 py-3 space-y-2">
        {/* Character name + AC row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Swords className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
            <span className="text-foreground text-xl font-semibold truncate">
              {character.name}
            </span>
            {character.is_defeated && (
              <span className="text-xs text-red-400 font-medium shrink-0">
                {t("defeated")}
              </span>
            )}
          </div>
          {character.ac != null && (
            <div className="flex items-center gap-1 shrink-0">
              <Shield className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-foreground text-base font-mono font-semibold">
                {character.ac}
              </span>
            </div>
          )}
        </div>

        {/* HP bar row */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground text-sm">{t("hp_label")}</span>
            <span className="text-foreground text-lg font-mono font-bold">
              {currentHp}
              <span className="text-muted-foreground text-sm font-normal"> / {maxHp}</span>
              {hpThresholdKey && (
                <span className="text-xs font-mono ml-2 text-muted-foreground">
                  {t(hpThresholdKey)}
                </span>
              )}
              {hasTempHp && (
                <span className="text-[#9f7aea] ml-1 text-xs">
                  {t("temp_hp", { value: tempHp })}
                </span>
              )}
            </span>
          </div>
          <div
            className="h-6 lg:h-4 bg-white/[0.06] rounded-full overflow-hidden"
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

        {/* Condition badges */}
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
