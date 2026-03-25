"use client";

import { useTranslations } from "next-intl";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import type { RulesetVersion } from "@/lib/types/database";

interface PlayerCombatant {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number;
  temp_hp: number;
  ac: number;
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  monster_id: string | null;
  ruleset_version: string | null;
}

function getHpBarColor(current: number, max: number): string {
  if (max === 0) return "bg-gray-500";
  const pct = current / max;
  if (pct > 0.5) return "bg-green-500";
  if (pct > 0.25) return "bg-amber-400";
  return "bg-red-500";
}

function getHpThresholdKey(current: number, max: number): string | null {
  if (max === 0) return null;
  const pct = current / max;
  if (pct > 0.5) return "hp_ok";
  if (pct > 0.25) return "hp_low";
  return "hp_crit";
}

interface PlayerInitiativeBoardProps {
  combatants: PlayerCombatant[];
  currentTurnIndex: number;
  rulesetVersion: RulesetVersion;
}

export function PlayerInitiativeBoard({
  combatants,
  currentTurnIndex,
}: PlayerInitiativeBoardProps) {
  const t = useTranslations("player");
  return (
    <ul
      className="space-y-2"
      role="list"
      aria-label={t("initiative_order")}
      data-testid="player-initiative-board"
    >
      {combatants.map((combatant, index) => {
        const isCurrentTurn = index === currentTurnIndex;
        const hpPct =
          combatant.max_hp > 0
            ? Math.max(0, Math.min(1, combatant.current_hp / combatant.max_hp))
            : 0;
        const hpBarColor = getHpBarColor(combatant.current_hp, combatant.max_hp);
        const hpThresholdKey = getHpThresholdKey(
          combatant.current_hp,
          combatant.max_hp
        );
        const hasTempHp = combatant.temp_hp > 0;

        return (
          <li
            key={combatant.id}
            className={`bg-card border rounded-md px-4 py-3 transition-colors ${
              isCurrentTurn ? "border-gold" : "border-border"
            } ${combatant.is_defeated ? "opacity-50" : ""}`}
            role="listitem"
            aria-current={isCurrentTurn ? true : undefined}
            data-testid={`player-combatant-${combatant.id}`}
          >
            {/* Name row */}
            <div className="flex items-center gap-2 mb-2">
              {isCurrentTurn && (
                <span
                  className="text-gold shrink-0 text-xs leading-none select-none"
                  aria-label={t("current_turn")}
                >
                  ▶
                </span>
              )}
              <span className="text-foreground text-sm font-medium flex-1">
                {combatant.name}
              </span>
              {combatant.is_defeated && (
                <span className="text-xs text-red-400 font-medium">
                  {t("defeated")}
                </span>
              )}
            </div>

            {/* HP bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
                <span className="text-muted-foreground text-xs font-mono">
                  {combatant.current_hp} / {combatant.max_hp}
                  {hpThresholdKey && (
                    <span className="text-xs font-mono ml-1 text-muted-foreground">
                      {t(hpThresholdKey)}
                    </span>
                  )}
                  {hasTempHp && (
                    <span className="text-[#9f7aea] ml-1">
                      {t("temp_hp", { value: combatant.temp_hp })}
                    </span>
                  )}
                </span>
              </div>
              <div
                className="h-2 bg-white/[0.06] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={combatant.current_hp}
                aria-valuemin={0}
                aria-valuemax={combatant.max_hp}
                aria-label={t("hp_aria", { name: combatant.name }) + (hpThresholdKey ? ` — ${t(hpThresholdKey)}` : "")}
              >
                <div
                  className={`h-full rounded-full transition-all ${hpBarColor}`}
                  style={{ width: `${hpPct * 100}%` }}
                />
              </div>
            </div>

            {/* Condition badges */}
            {combatant.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1" role="list" aria-label={`${combatant.name} conditions`}>
                {combatant.conditions.map((condition) => (
                  <ConditionBadge key={condition} condition={condition} rulesetVersion={(combatant.ruleset_version as RulesetVersion) ?? "2014"} />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
