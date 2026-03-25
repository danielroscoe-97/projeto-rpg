"use client";

import Link from "next/link";

export interface SavedEncounterRow {
  session_id: string;
  encounter_name: string;
  session_name: string;
  round_number: number;
  is_active: boolean;
  updated_at: string;
}

interface SavedEncountersProps {
  encounters: SavedEncounterRow[];
}

export function SavedEncounters({ encounters }: SavedEncountersProps) {
  if (encounters.length === 0) return null;

  return (
    <div className="mt-8" data-testid="saved-encounters">
      <h2 className="text-lg font-semibold text-white mb-3">Active Encounters</h2>
      <div className="space-y-2">
        {encounters.map((enc) => (
          <Link
            key={enc.session_id}
            href={`/app/session/${enc.session_id}`}
            className="block bg-[#16213e] border border-white/10 rounded-md p-4 hover:border-[#e94560]/50 transition-colors"
            data-testid={`encounter-link-${enc.session_id}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium text-sm">{enc.encounter_name}</span>
                <span className="text-white/40 text-xs ml-2">{enc.session_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs font-mono">
                  Round {enc.round_number}
                </span>
                {enc.is_active && (
                  <span className="text-xs text-green-400 font-medium">In Progress</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
