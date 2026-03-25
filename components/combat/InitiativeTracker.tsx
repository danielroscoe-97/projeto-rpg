"use client";

import { useTransition } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { detectTies } from "@/lib/utils/initiative";
import { TiebreakerDragList } from "./TiebreakerDragList";
import type { Combatant } from "@/lib/types/combat";

interface InitiativeTrackerProps {
  onStartCombat: () => Promise<void>;
}

export function InitiativeTracker({ onStartCombat }: InitiativeTrackerProps) {
  const { combatants, setInitiative, is_loading, error } = useCombatStore();
  const [isPending, startTransition] = useTransition();

  const ties = detectTies(combatants);
  const allSet = combatants.length > 0 &&
    combatants.every((c) => c.initiative !== null);

  // Group tied combatants by initiative value for TiebreakerDragList
  const tieGroups = new Map<number, Combatant[]>();
  for (const c of combatants) {
    if (c.initiative !== null && ties.has(c.initiative)) {
      const group = tieGroups.get(c.initiative) ?? [];
      group.push(c);
      tieGroups.set(c.initiative, group);
    }
  }

  const handleStartCombat = () => {
    startTransition(async () => {
      await onStartCombat();
    });
  };

  return (
    <div className="space-y-4" data-testid="initiative-tracker">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Set Initiative</h2>
        {ties.size > 0 && (
          <span className="text-amber-400 text-xs">
            <span role="img" aria-label="Warning">⚠</span> Ties detected — drag to resolve
          </span>
        )}
      </div>

      {/* Initiative input list */}
      <ul className="space-y-2" role="list" aria-label="Combatant initiative inputs">
        {combatants.map((c) => {
          const isTied = c.initiative !== null && ties.has(c.initiative);
          return (
            <li
              key={c.id}
              className={`flex items-center gap-3 bg-card border rounded-md px-4 py-2 transition-colors ${
                isTied ? "border-amber-400/50" : "border-border"
              }`}
              data-testid={`initiative-row-${c.id}`}
            >
              <span className="flex-1 text-sm text-foreground font-medium">
                {c.name}
              </span>
              {isTied && (
                <span className="text-amber-400 text-xs" aria-label="Tie">
                  Tie
                </span>
              )}
              <input
                type="number"
                value={c.initiative ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setInitiative(c.id, null);
                    return;
                  }
                  const val = Number(raw);
                  if (isNaN(val)) return;
                  setInitiative(c.id, Math.min(30, Math.max(-5, val)));
                }}
                placeholder="Init"
                min={-5}
                max={30}
                className="w-16 bg-background border border-border rounded px-2 py-1 text-foreground text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label={`Initiative for ${c.name}`}
                data-testid={`initiative-input-${c.id}`}
              />
            </li>
          );
        })}
      </ul>

      {/* Tiebreaker sections */}
      {Array.from(tieGroups.entries()).map(([value, group]) => (
        <div key={value}>
          <p className="text-amber-400 text-xs mb-1">
            Drag to resolve tie at initiative {value}:
          </p>
          <TiebreakerDragList tiedCombatants={group} />
        </div>
      ))}

      {/* Errors */}
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Start Combat */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-xs">
          {allSet
            ? "All initiatives set. Ready to start."
            : `${combatants.filter((c) => c.initiative === null).length} remaining`}
        </p>
        <button
          type="button"
          onClick={handleStartCombat}
          disabled={!allSet || isPending || is_loading}
          className="px-5 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          data-testid="start-combat-btn"
        >
          {isPending || is_loading ? "Starting…" : "Start Combat →"}
        </button>
      </div>
    </div>
  );
}
