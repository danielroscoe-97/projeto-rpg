"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  UserCircle,
  MapPin,
  Flag,
  FileText,
  ScrollText,
  Sparkles,
} from "lucide-react";
import type { RecentActivityItem, RecentActivityType } from "@/lib/types/campaign-briefing";

interface BriefingActivityTimelineProps {
  items: RecentActivityItem[];
}

const TYPE_CONFIG: Record<
  RecentActivityType,
  { icon: typeof UserCircle; section: string; color: string }
> = {
  npc: { icon: UserCircle, section: "npcs", color: "text-purple-400" },
  location: { icon: MapPin, section: "locations", color: "text-green-400" },
  faction: { icon: Flag, section: "factions", color: "text-rose-400" },
  note: { icon: FileText, section: "notes", color: "text-blue-400" },
  quest: { icon: ScrollText, section: "quests", color: "text-amber-400" },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns { key, value } for next-intl: callers map keys to the
 * `briefing.relative_*` message set. Mirrors the helper in NextSessionCard.tsx
 * but returns only past-tense forms (activity items are always in the past).
 */
function getRelativePast(dateStr: string): { key: string; value?: number } {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 1) return { key: "relative_just_now" };
  if (diffMinutes < 60) return { key: "relative_minutes_ago", value: diffMinutes };

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return { key: "relative_hours_ago", value: diffHours };

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return { key: "relative_yesterday" };
  if (diffDays < 7) return { key: "relative_days_ago", value: diffDays };

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return { key: "relative_weeks_ago", value: diffWeeks };

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return { key: "relative_months_ago", value: diffMonths };

  return { key: "relative_long_ago" };
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * "Atividade recente" — Roam-style timeline of the 5 most-recently-updated
 * entities across NPCs, Locations, Factions, Notes, and Quests
 * (SPEC-campaign-dashboard-briefing §3.3). Every row is a Link to the
 * entity's section ("every card is a door" — F15).
 */
export function BriefingActivityTimeline({ items }: BriefingActivityTimelineProps) {
  const t = useTranslations("briefing");

  const rendered = useMemo(
    () =>
      items.map((item) => {
        const cfg = TYPE_CONFIG[item.type];
        const rel = getRelativePast(item.timestamp);
        return {
          ...item,
          cfg,
          relKey: rel.key,
          relValue: rel.value,
        };
      }),
    [items],
  );

  return (
    <section
      className="space-y-3"
      aria-labelledby="briefing-activity-title"
    >
      <h2
        id="briefing-activity-title"
        className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
      >
        {t("activity_title")}
      </h2>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-[color:var(--dim-inactive,rgba(100,80,40,0.3))] bg-card/50 px-4 py-5">
          <Sparkles className="w-4 h-4 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-sm text-muted-foreground italic">{t("activity_empty")}</p>
        </div>
      ) : (
        <ol className="relative border-l border-white/[0.06] pl-5 space-y-1.5 ml-1">
          {rendered.map((item) => {
            const Icon = item.cfg.icon;
            const entityName = item.label?.trim() || t("activity_untitled");
            return (
              <li key={`${item.type}-${item.id}`} className="relative">
                {/* Timeline dot */}
                <span
                  className={`absolute -left-[1.65rem] top-3 w-1.5 h-1.5 rounded-full ${item.cfg.color.replace("text-", "bg-")}`}
                  aria-hidden="true"
                />
                <Link
                  href={`?section=${item.cfg.section}`}
                  scroll={false}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-white/[0.03] focus-visible:bg-white/[0.04] transition-colors group"
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${item.cfg.color}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">
                      {entityName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="capitalize">{t(`activity_type_${item.type}`)}</span>
                      {" · "}
                      <span>
                        {item.relValue !== undefined
                          ? t(item.relKey, { count: item.relValue })
                          : t(item.relKey)}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
