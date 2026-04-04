"use client";

import { useTranslations } from "next-intl";
import { Swords, Repeat, Clock, Crown, HeartCrack, Skull } from "lucide-react";
import type { AggregatedCampaignStats } from "@/lib/utils/campaign-stats";
import { formatDuration } from "@/lib/utils/combat-stats";

interface CampaignStatsBarProps {
  stats: AggregatedCampaignStats;
}

export function CampaignStatsBar({ stats }: CampaignStatsBarProps) {
  const t = useTranslations("campaign");

  // Only show if >= 2 encounters
  if (stats.totalEncounters < 2) return null;

  const items = [
    { icon: Swords, label: t("stats_encounters"), value: `${stats.totalEncounters}` },
    { icon: Repeat, label: t("stats_rounds"), value: `${stats.totalRounds}` },
    { icon: Clock, label: t("stats_playtime"), value: formatDuration(stats.totalDuration) },
    ...(stats.mvpName ? [{ icon: Crown, label: "MVP", value: `${stats.mvpName} (x${stats.mvpCount})` }] : []),
    ...(stats.monstersDefeated > 0 ? [{ icon: Skull, label: t("stats_monsters"), value: `${stats.monstersDefeated}` }] : []),
    ...(stats.pcsDown > 0 ? [{ icon: HeartCrack, label: t("stats_pcs_down"), value: `${stats.pcsDown}` }] : []),
  ];

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {t("stats_title")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5"
            >
              <Icon className="size-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm text-foreground font-medium truncate">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
