"use client";

import { useCallback } from "react";
import { HpDisplay } from "./HpDisplay";
import { ConditionBadges } from "./ConditionBadges";

interface CharacterStatusPanelProps {
  currentHp: number;
  maxHp: number;
  hpTemp: number;
  conditions: string[];
  readOnly?: boolean;
  /** Character identity for per-character testid suffix + aria announcements. */
  characterId?: string;
  characterName?: string;
  onHpChange: (newHp: number) => void;
  onTempHpChange: (newTemp: number) => void;
  onToggleCondition: (condition: string) => void;
  onSetConditions: (conditions: string[]) => void;
}

export function CharacterStatusPanel({
  currentHp,
  maxHp,
  hpTemp,
  conditions,
  readOnly = false,
  characterId,
  characterName,
  onHpChange,
  onTempHpChange,
  onToggleCondition,
  onSetConditions,
}: CharacterStatusPanelProps) {
  // Extract exhaustion level from conditions
  const exhaustionMatch = conditions.find((c) => c.startsWith("exhaustion:"));
  const exhaustionLevel = exhaustionMatch
    ? parseInt(exhaustionMatch.split(":")[1], 10)
    : 0;

  const filteredConditions = conditions.filter(
    (c) => !c.startsWith("exhaustion:")
  );

  // C-03 fix: proper exhaustion handler that sets the full conditions array
  const handleExhaustionChange = useCallback(
    (level: number) => {
      const cleaned = conditions.filter((c) => !c.startsWith("exhaustion:"));
      if (level > 0) {
        cleaned.push(`exhaustion:${level}`);
      }
      onSetConditions(cleaned);
    },
    [conditions, onSetConditions]
  );

  return (
    <div className="space-y-2 bg-card border border-border/40 rounded-xl px-4 py-3">
      <HpDisplay
        currentHp={currentHp}
        maxHp={maxHp}
        hpTemp={hpTemp}
        readOnly={readOnly}
        characterId={characterId}
        characterName={characterName}
        onHpChange={onHpChange}
        onTempHpChange={onTempHpChange}
      />
      <div className="border-t border-border pt-3">
        <ConditionBadges
          conditions={filteredConditions}
          exhaustionLevel={exhaustionLevel}
          readOnly={readOnly}
          onToggleCondition={onToggleCondition}
          onExhaustionChange={handleExhaustionChange}
        />
      </div>
    </div>
  );
}
