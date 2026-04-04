"use client";

import Link from "next/link";
import { Flame } from "lucide-react";

export interface CombatHistoryData {
  session_id: string;
  encounter_name: string;
  session_name: string;
  round_number: number;
  is_active: boolean;
  updated_at: string;
}

interface CombatHistoryCardProps {
  combat: CombatHistoryData;
  translations: {
    round: string;
    in_progress: string;
  };
}

export function CombatHistoryCard({ combat, translations: t }: CombatHistoryCardProps) {
  const timeAgo = formatRelativeTime(combat.updated_at);

  return (
    <Link
      href={`/app/session/${combat.session_id}`}
      data-testid={`combat-card-${combat.session_id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)] transition-all duration-200 group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Flame
            className="w-4 h-4 text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground truncate group-hover:text-amber-400 transition-colors">
            {combat.encounter_name}
          </span>
        </div>
        {combat.is_active && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.in_progress}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {combat.session_name !== combat.encounter_name ? combat.session_name : ""}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono">
            {t.round} {combat.round_number}
          </span>
          {timeAgo && <span>{timeAgo}</span>}
        </div>
      </div>
    </Link>
  );
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  } catch {
    return "";
  }
}
