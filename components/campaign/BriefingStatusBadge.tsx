"use client";

import { useTranslations } from "next-intl";
import { Flame, Moon, Sparkles, CalendarClock, Radio } from "lucide-react";
import type { BriefingStatus } from "@/lib/types/campaign-briefing";

interface BriefingStatusBadgeProps {
  status: BriefingStatus;
  /** Optional human context (e.g. session name) for screen readers */
  contextLabel?: string | null;
}

const VARIANT = {
  active_combat: {
    wrapper:
      "bg-red-500/10 text-red-300 border-red-500/40 ring-1 ring-red-500/20",
    Icon: Flame,
    dot: "bg-red-400 animate-pulse",
  },
  active_session: {
    wrapper:
      "bg-amber-500/10 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/20",
    Icon: Radio,
    dot: "bg-amber-400 animate-pulse",
  },
  planned_next: {
    wrapper: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    Icon: CalendarClock,
    dot: "bg-emerald-400",
  },
  paused: {
    wrapper: "bg-slate-500/5 text-muted-foreground border-slate-500/20",
    Icon: Moon,
    dot: "bg-slate-400/60",
  },
  new: {
    wrapper: "bg-amber-500/5 text-amber-300/80 border-amber-500/20",
    Icon: Sparkles,
    dot: "bg-amber-300/70",
  },
} as const;

/**
 * Pill-shaped badge summarizing the campaign's current mode for the briefing
 * hero (SPEC-campaign-dashboard-briefing §3.1). Does not own any layout
 * responsibility; callers wrap it and add the halo treatment when needed.
 */
export function BriefingStatusBadge({ status, contextLabel }: BriefingStatusBadgeProps) {
  const t = useTranslations("briefing");
  const v = VARIANT[status];
  const Icon = v.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${v.wrapper}`}
      role="status"
      aria-label={contextLabel ? `${t(`status_${status}`)} — ${contextLabel}` : t(`status_${status}`)}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} aria-hidden="true" />
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{t(`status_${status}`)}</span>
    </span>
  );
}
