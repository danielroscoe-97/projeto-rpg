"use client";

import { useTranslations } from "next-intl";
import type { CampaignHealthResult } from "@/lib/utils/campaign-health";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Props ───────────────────────────────────────────────────────────────────

interface CampaignHealthBadgeProps {
  health: CampaignHealthResult;
  mode: "compact" | "expanded";
}

// ── Color mapping ───────────────────────────────────────────────────────────

const DOT_COLORS: Record<CampaignHealthResult["lastSessionColor"], string> = {
  green: "bg-emerald-400",
  yellow: "bg-yellow-400",
  red: "bg-red-400",
  gray: "bg-muted-foreground/50",
};

// ── Segments ────────────────────────────────────────────────────────────────

type SegmentKey = "players" | "encounters" | "sessions" | "content";

const SEGMENTS: {
  key: SegmentKey;
  componentKey: keyof CampaignHealthResult["components"];
}[] = [
  { key: "players", componentKey: "hasPlayers" },
  { key: "encounters", componentKey: "hasEncounters" },
  { key: "sessions", componentKey: "hasSessions" },
  { key: "content", componentKey: "hasContent" },
];

// ── Component ───────────────────────────────────────────────────────────────

export function CampaignHealthBadge({ health, mode }: CampaignHealthBadgeProps) {
  const t = useTranslations("campaignHealth");

  if (mode === "compact") {
    return <CompactBadge health={health} t={t} />;
  }

  return <ExpandedBadge health={health} t={t} />;
}

// ── Compact mode ────────────────────────────────────────────────────────────

function CompactBadge({
  health,
  t,
}: {
  health: CampaignHealthResult;
  t: ReturnType<typeof useTranslations>;
}) {
  const dotClass = DOT_COLORS[health.lastSessionColor];

  const label =
    health.daysSinceLastSession !== null
      ? health.daysSinceLastSession === 0
        ? t("last_session_today")
        : health.daysSinceLastSession === 1
          ? t("last_session_yesterday")
          : t("last_session_days_ago", { days: health.daysSinceLastSession })
      : t("no_sessions_yet");

  return (
    <div className="flex items-center gap-1.5 min-h-[44px]">
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
        aria-hidden="true"
      />
      <span className="text-xs text-muted-foreground truncate">{label}</span>
    </div>
  );
}

// ── Expanded mode ───────────────────────────────────────────────────────────

function ExpandedBadge({
  health,
  t,
}: {
  health: CampaignHealthResult;
  t: ReturnType<typeof useTranslations>;
}) {
  const levelLabel = t(`level_${health.level}` as Parameters<typeof t>[0]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full space-y-2">
        {/* Progress bar with 4 segments */}
        <div className="flex gap-1 w-full">
          {SEGMENTS.map((seg) => {
            const filled = health.components[seg.componentKey];
            return (
              <Tooltip key={seg.key}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      filled ? "bg-amber-400" : "bg-white/[0.06]"
                    }`}
                    role="meter"
                    aria-label={t(`segment_${seg.key}` as Parameters<typeof t>[0])}
                    aria-valuenow={filled ? 25 : 0}
                    aria-valuemin={0}
                    aria-valuemax={25}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">
                    {t(`segment_${seg.key}` as Parameters<typeof t>[0])}
                  </p>
                  <p className="text-muted-foreground">
                    {t(`tooltip_${seg.key}` as Parameters<typeof t>[0])}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Segment labels */}
        <div className="flex gap-1 w-full">
          {SEGMENTS.map((seg) => (
            <p
              key={seg.key}
              className="flex-1 text-[10px] text-muted-foreground text-center truncate"
            >
              {t(`segment_${seg.key}` as Parameters<typeof t>[0])}
            </p>
          ))}
        </div>

        {/* Score summary */}
        <p className="text-xs text-muted-foreground">
          {t("score_label", { score: health.score })}
          {" — "}
          <span className="text-foreground font-medium">{levelLabel}</span>
        </p>
      </div>
    </TooltipProvider>
  );
}
