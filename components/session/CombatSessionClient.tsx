"use client";

import { useEffect } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { persistInitiativeAndStartCombat } from "@/lib/supabase/session";
import { InitiativeTracker } from "@/components/combat/InitiativeTracker";
import type { Combatant } from "@/lib/types/combat";

interface CombatSessionClientProps {
  sessionId: string;
  encounterId: string;
  initialCombatants: Combatant[];
  isActive: boolean;
  roundNumber: number;
}

export function CombatSessionClient({
  sessionId,
  encounterId,
  initialCombatants,
  isActive,
  roundNumber,
}: CombatSessionClientProps) {
  const { combatants, startCombat, setEncounterId, is_active, setError } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);

  // Hydrate the store from server-fetched data. Uses hydrateCombatants to
  // preserve DB ids (avoids UUID regeneration on StrictMode double-invoke).
  useEffect(() => {
    const store = useCombatStore.getState();
    store.clearEncounter();
    store.setEncounterId(encounterId, sessionId);
    store.hydrateCombatants(initialCombatants);
    if (isActive) store.startCombat();
  }, [encounterId, sessionId, isActive, initialCombatants]);

  const handleStartCombat = async () => {
    const { combatants: current, encounter_id } = useCombatStore.getState();
    if (!encounter_id) {
      setError("Encounter ID missing.");
      return;
    }
    try {
      await persistInitiativeAndStartCombat(encounter_id, current);
      startCombat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start combat.");
    }
  };

  // Show initiative setup if not yet active
  if (!is_active) {
    return (
      <div className="max-w-2xl mx-auto">
        <InitiativeTracker onStartCombat={handleStartCombat} />
      </div>
    );
  }

  // Active combat view — combatant list with turn indicator
  return (
    <div className="max-w-2xl mx-auto space-y-4" data-testid="active-combat">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">
          Round <span className="font-mono text-[#e94560]">{roundNumber}</span>
        </h2>
        <span className="text-white/40 text-xs">{combatants.length} combatants</span>
      </div>

      <ul
        className="space-y-2"
        role="list"
        aria-label="Initiative order"
        data-testid="initiative-list"
      >
        {combatants.map((c, index) => {
          const isCurrentTurn = index === current_turn_index;
          const hpPct =
            c.max_hp > 0
              ? Math.max(0, Math.round((c.current_hp / c.max_hp) * 100))
              : 0;
          const hpColor =
            hpPct > 50
              ? "bg-green-500"
              : hpPct > 25
              ? "bg-yellow-500"
              : "bg-red-500";

          return (
            <li
              key={c.id}
              className={`rounded-md border px-4 py-3 ${
                isCurrentTurn
                  ? "border-[#e94560] bg-[#e94560]/10"
                  : "border-white/10 bg-[#16213e]"
              } ${c.is_defeated ? "opacity-40" : ""}`}
              aria-current={isCurrentTurn ? "true" : undefined}
              data-testid={`combatant-row-${c.id}`}
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-center text-white/40 text-sm font-mono shrink-0">
                  {c.initiative ?? "–"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white/90">
                      {c.name}
                    </span>
                    {isCurrentTurn && (
                      <span className="text-xs bg-[#e94560] text-white px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {c.is_defeated && (
                      <span className="text-xs text-white/30">Defeated</span>
                    )}
                  </div>
                  {c.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.conditions.map((cond) => (
                        <span
                          key={cond}
                          className="text-xs px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="text-sm text-white/80">
                    <span className="font-mono">
                      {c.current_hp}/{c.max_hp}
                    </span>
                    {c.temp_hp > 0 && (
                      <span className="text-purple-400 text-xs ml-1">
                        +{c.temp_hp}
                      </span>
                    )}
                    <span className="text-white/40 text-xs ml-2">
                      AC {c.ac}
                    </span>
                  </div>
                  <div
                    className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={c.current_hp}
                    aria-valuemin={0}
                    aria-valuemax={c.max_hp}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${hpColor}`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="text-center text-white/20 text-xs pt-4 border-t border-white/5">
        Turn advancement and HP controls coming in Story 3.4.
      </div>
    </div>
  );
}
