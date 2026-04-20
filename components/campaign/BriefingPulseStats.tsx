import { getTranslations } from "next-intl/server";
import {
  UserCircle,
  MapPin,
  Flag,
  FileText,
  Swords,
  History,
} from "lucide-react";
import { CampaignHealthBadge } from "@/components/campaign/CampaignHealthBadge";
import { CampaignStatsBar } from "@/components/campaign/CampaignStatsBar";
import { calculateCampaignHealth } from "@/lib/utils/campaign-health";
import type { AggregatedCampaignStats } from "@/lib/utils/campaign-stats";

interface BriefingPulseStatsProps {
  npcCount: number;
  locationCount: number;
  factionCount: number;
  noteCount: number;
  finishedEncounterCount: number;
  sessionCount: number;
  playerCount: number;
  lastSessionDate: string | null;
  campaignStats: AggregatedCampaignStats;
}

/**
 * "Pulso da campanha" — métricas suaves + health badge + combat stats
 * (SPEC-campaign-dashboard-briefing §3.5). Pure server view; no fetching.
 */
export async function BriefingPulseStats({
  npcCount,
  locationCount,
  factionCount,
  noteCount,
  finishedEncounterCount,
  sessionCount,
  playerCount,
  lastSessionDate,
  campaignStats,
}: BriefingPulseStatsProps) {
  const t = await getTranslations("briefing");

  const health = calculateCampaignHealth({
    playerCount,
    encounterCount: finishedEncounterCount,
    sessionCount,
    noteCount,
    npcCount,
    lastSessionDate,
  });

  const counters: Array<{
    icon: typeof UserCircle;
    label: string;
    value: number;
    emptyLabel: string;
    color: string;
  }> = [
    {
      icon: UserCircle,
      label: t("pulse_npcs"),
      value: npcCount,
      emptyLabel: t("pulse_npcs_empty"),
      color: "text-purple-400",
    },
    {
      icon: MapPin,
      label: t("pulse_locations"),
      value: locationCount,
      emptyLabel: t("pulse_locations_empty"),
      color: "text-green-400",
    },
    {
      icon: Flag,
      label: t("pulse_factions"),
      value: factionCount,
      emptyLabel: t("pulse_factions_empty"),
      color: "text-rose-400",
    },
    {
      icon: FileText,
      label: t("pulse_notes"),
      value: noteCount,
      emptyLabel: t("pulse_notes_empty"),
      color: "text-blue-400",
    },
    {
      icon: Swords,
      label: t("pulse_encounters"),
      value: finishedEncounterCount,
      emptyLabel: t("pulse_encounters_empty"),
      color: "text-red-400",
    },
    {
      icon: History,
      label: t("pulse_sessions"),
      value: sessionCount,
      emptyLabel: t("pulse_sessions_empty"),
      color: "text-amber-400",
    },
  ];

  const shouldShowHealth = playerCount > 0 || sessionCount > 0;

  return (
    <section className="space-y-4" aria-labelledby="briefing-pulse-title">
      <h2
        id="briefing-pulse-title"
        className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
      >
        {t("pulse_title")}
      </h2>

      {/* Counters grid: 2 cols mobile, 3 cols sm, 6 cols lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {counters.map((c) => {
          const Icon = c.icon;
          const isEmpty = c.value === 0;
          return (
            <div
              key={c.label}
              className="bg-card border border-white/[0.04] rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon
                  className={`w-3.5 h-3.5 flex-shrink-0 ${isEmpty ? "text-muted-foreground/60" : c.color}`}
                  aria-hidden="true"
                />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                  {c.label}
                </span>
              </div>
              {isEmpty ? (
                <p className="text-xs text-muted-foreground/80 italic">
                  {c.emptyLabel}
                </p>
              ) : (
                <p className="text-lg font-semibold text-foreground">
                  {c.value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Campaign health (moved here from hero per spec §3.1) */}
      {shouldShowHealth && (
        <div className="bg-card border border-white/[0.04] rounded-lg p-4">
          <CampaignHealthBadge health={health} mode="expanded" />
        </div>
      )}

      {/* Combat stats bar (moved here from dm view per spec §3.5).
          CampaignStatsBar returns null when totalEncounters < 2, so safe
          to always render. */}
      <CampaignStatsBar stats={campaignStats} />
    </section>
  );
}
