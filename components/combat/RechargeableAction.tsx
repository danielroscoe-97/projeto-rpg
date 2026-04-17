"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { parseRecharge, type RechargeRollResult } from "@/lib/combat/parse-recharge";
import { trackEvent } from "@/lib/analytics/track";
import { useCombatLogStore } from "@/lib/stores/combat-log-store";

import { RechargeButton } from "./RechargeButton";

export interface RechargeState {
  [actionKey: string]: { depleted: boolean; threshold: number } | undefined;
}

export interface CombatantContext {
  /** Combatant ID — used as key prefix for state. */
  id: string;
  /** Display name (for log entries). */
  name: string;
  /** Optional monster slug for telemetry (SRD monster_id / slug). */
  monsterSlug?: string;
  /** Current recharge state — `undefined` or empty = all abilities available. */
  rechargeState?: RechargeState;
  /** Setter called with (actionKey, depleted, threshold). */
  onRechargeToggle: (actionKey: string, depleted: boolean, threshold: number) => void;
  /** Round number for log entries (optional — falls back to 1). */
  round?: number;
}

export interface RechargeableActionProps {
  actionName: string;
  desc: ReactNode;
  combatant: CombatantContext;
}

/**
 * Wraps a single monster action block with a Recharge toggle button when the
 * action's name contains a `(Recharge X)` / `(Recharge X-Y)` pattern.
 *
 * When the parser returns null (plain abilities or rest-based recharges), the
 * component renders exactly the same markup as MonsterStatBlock's SectionBlock
 * so callers can use it as a drop-in replacement inside a combat context.
 *
 * DM-only: the parent (MonsterStatBlock) is responsible for only passing
 * `combatantContext` when the DM is viewing a combatant in active combat.
 * In compendium read-only contexts, no context is passed and this wrapper is
 * not used.
 */
export function RechargeableAction({
  actionName,
  desc,
  combatant,
}: RechargeableActionProps) {
  const t = useTranslations("combat.recharge");
  const addLogEntry = useCombatLogStore((s) => s.addEntry);

  const info = parseRecharge(actionName);

  const currentState = info && combatant.rechargeState
    ? combatant.rechargeState[info.key]
    : undefined;
  const depleted = currentState?.depleted ?? false;

  const handleToggle = useCallback(
    (nextDepleted: boolean, rollInfo?: RechargeRollResult) => {
      if (!info) return;

      // Commit state first so the UI responds immediately.
      combatant.onRechargeToggle(info.key, nextDepleted, info.threshold);

      const round = combatant.round ?? 1;

      if (rollInfo) {
        // Depleted → rolled d6 (may or may not have recharged).
        const description = rollInfo.recharged
          ? t("success", { action: actionName })
          : t("failed", {
              action: actionName,
              roll: rollInfo.roll,
              threshold: info.threshold,
            });
        addLogEntry({
          type: "system",
          round,
          actorName: combatant.name,
          description,
          details: { rollResult: rollInfo.roll },
        });
        trackEvent("combat:recharge_rolled", {
          monster_slug: combatant.monsterSlug ?? null,
          action_key: info.key,
          roll: rollInfo.roll,
          threshold: info.threshold,
          recharged: rollInfo.recharged,
        });
      } else {
        // Marked as used (available → depleted).
        addLogEntry({
          type: "system",
          round,
          actorName: combatant.name,
          description: t("used_by", {
            caster: combatant.name,
            action: actionName,
          }),
        });
        trackEvent("combat:recharge_used", {
          monster_slug: combatant.monsterSlug ?? null,
          action_key: info.key,
        });
      }
    },
    [info, combatant, actionName, addLogEntry, t],
  );

  // No recharge pattern → render the standard trait-block line unchanged.
  if (!info) {
    return (
      <p className="trait-block">
        <span className="trait-name">{actionName}. </span>
        <span className="trait-desc">{desc}</span>
      </p>
    );
  }

  return (
    <p className="trait-block">
      <span className="trait-name inline-flex items-center gap-2">
        {actionName}.
        <RechargeButton
          actionName={actionName}
          depleted={depleted}
          threshold={info.threshold}
          onToggle={handleToggle}
        />
      </span>{" "}
      <span
        className="trait-desc"
        style={depleted ? { opacity: 0.55 } : undefined}
      >
        {desc}
      </span>
    </p>
  );
}
