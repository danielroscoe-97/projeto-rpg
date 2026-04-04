"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Clock, Repeat, Swords, HeartCrack, Skull, Target, Dice5, Timer, TrendingDown, TrendingUp } from "lucide-react";
import type { CombatReportSummary } from "@/lib/types/combat-report";
import type { CombatantStats } from "@/lib/utils/combat-stats";
import { formatDuration } from "@/lib/utils/combat-stats";

const RANK_COLORS = [
  "bg-gold/20 border-gold text-gold",
  "bg-gray-300/10 border-gray-400 text-gray-300",
  "bg-amber-700/15 border-amber-600 text-amber-500",
];

const BAR_COLORS = ["bg-gold", "bg-gray-400", "bg-amber-600"];

interface RecapSummaryProps {
  summary: CombatReportSummary;
  rankings: CombatantStats[];
  /** CTA-11: Previous encounter duration in ms for trend comparison */
  previousDurationMs?: number | null;
}

export function RecapSummary({ summary, rankings, previousDurationMs }: RecapSummaryProps) {
  const t = useTranslations("combat");
  const maxDamage = rankings.length > 0 ? rankings[0].totalDamageDealt : 1;

  // CTA-11: Calculate trend vs previous encounter
  const trend = previousDurationMs && previousDurationMs > 0 && summary.totalDuration > 0
    ? Math.round(((summary.totalDuration - previousDurationMs) / previousDurationMs) * 100)
    : null;

  const statItems = [
    { icon: Clock, label: t("recap_stat_duration"), value: formatDuration(summary.totalDuration), show: summary.totalDuration > 0 },
    { icon: Repeat, label: t("recap_stat_rounds"), value: `${summary.totalRounds}`, show: true },
    { icon: Swords, label: t("recap_stat_total_damage"), value: `${summary.totalDamage}`, show: summary.totalDamage > 0 },
    { icon: HeartCrack, label: t("recap_stat_pcs_down"), value: `${summary.pcsDown}`, show: summary.pcsDown > 0 },
    { icon: Skull, label: t("recap_stat_monsters_slain"), value: `${summary.monstersDefeated}`, show: summary.monstersDefeated > 0 },
    { icon: Target, label: t("recap_stat_crits"), value: `${summary.totalCrits}`, show: summary.totalCrits > 0 },
    { icon: Dice5, label: t("recap_stat_fumbles"), value: `${summary.totalFumbles}`, show: summary.totalFumbles > 0 },
    { icon: Timer, label: t("recap_stat_avg_turn"), value: formatDuration(summary.avgTurnTime), show: summary.avgTurnTime > 0 },
  ].filter((s) => s.show);

  return (
    <div className="space-y-4">
      {/* Stat pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-2"
      >
        {statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1.5"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs text-foreground font-mono font-medium">{item.value}</span>
            </div>
          );
        })}
        {trend !== null && Math.abs(trend) >= 5 && (
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${
            trend < 0
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            {trend < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
            <span className="text-xs font-medium">
              {trend < 0
                ? t("recap_trend_faster", { pct: Math.abs(trend) })
                : t("recap_trend_slower", { pct: trend })}
            </span>
          </div>
        )}
      </motion.div>

      {/* Damage ranking */}
      {rankings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("leaderboard_damage_dealt")}
          </h3>
          {rankings.map((s, i) => {
            const pct = maxDamage > 0 ? (s.totalDamageDealt / maxDamage) * 100 : 0;
            const barColor = i < 3 ? BAR_COLORS[i] : "bg-white/20";
            const rankColor = i < 3 ? RANK_COLORS[i] : "bg-white/5 border-white/10 text-muted-foreground";

            return (
              <motion.div
                key={`${s.name}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${rankColor}`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm text-foreground truncate">{s.name}</span>
                    <span className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">{s.totalDamageDealt}</span>
                      {s.totalTurnTime > 0 && (
                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                          {formatDuration(s.totalTurnTime)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${barColor}`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
