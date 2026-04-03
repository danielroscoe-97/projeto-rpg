"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Crown, Shield, Heart, Swords, Share2, X, Zap, Timer } from "lucide-react";
import { toast } from "sonner";
import type { CombatantStats } from "@/lib/utils/combat-stats";
import { getTopForStat, getTimeAwards, formatShareText, formatDuration } from "@/lib/utils/combat-stats";

interface CombatLeaderboardProps {
  stats: CombatantStats[];
  encounterName: string;
  rounds: number;
  combatDuration?: number;
  onClose: () => void;
}

const RANK_COLORS = [
  "bg-gold/20 border-gold text-gold",        // #1 gold
  "bg-gray-300/10 border-gray-400 text-gray-300", // #2 silver
  "bg-amber-700/15 border-amber-600 text-amber-500", // #3 bronze
];

const BAR_COLORS = [
  "bg-gold",          // #1 gold
  "bg-gray-400",      // #2 silver
  "bg-amber-600",     // #3 bronze
];

export function CombatLeaderboard({ stats, encounterName, rounds, combatDuration, onClose }: CombatLeaderboardProps) {
  const t = useTranslations("combat");

  const maxDamage = stats.length > 0 ? stats[0].totalDamageDealt : 1;
  const mvp = stats.length > 0 ? stats[0] : null;
  const tank = getTopForStat(stats, "totalDamageReceived");
  const healer = getTopForStat(stats, "totalHealing");
  const critKing = getTopForStat(stats, "criticalHits");
  const { speedster, slowpoke } = getTimeAwards(stats);

  const handleShare = useCallback(async () => {
    const text = formatShareText(stats, encounterName, rounds, combatDuration);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("leaderboard_copied"));
    } catch {
      // Clipboard also failed — silent fail
    }
  }, [stats, encounterName, rounds, combatDuration, t]);

  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        data-testid="combat-leaderboard"
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-gold/30 bg-surface-primary shadow-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-gold">
                {t("leaderboard_title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {encounterName && <span className="mr-2">{encounterName}</span>}
                {t("leaderboard_rounds", { rounds })}
                {combatDuration != null && combatDuration > 0 && (
                  <span className="ml-1">• {formatDuration(combatDuration)}</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t("leaderboard_close")}
              data-testid="leaderboard-close-btn"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="px-4 py-4 sm:px-6 space-y-5">
            {/* MVP Section */}
            {mvp && mvp.totalDamageDealt > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 rounded-lg border-2 border-gold/40 bg-gold/5 p-3 sm:p-4"
                data-testid="leaderboard-mvp"
              >
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-gold/20">
                  <Crown className="size-6 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gold/70 font-medium uppercase tracking-wider">
                    {t("leaderboard_mvp")}
                  </p>
                  <p className="text-foreground font-semibold text-lg truncate">{mvp.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {mvp.totalDamageDealt} {t("leaderboard_damage_dealt").toLowerCase()}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Rankings */}
            {stats.length > 0 && (
              <div className="space-y-2" data-testid="leaderboard-rankings">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("leaderboard_damage_dealt")}
                </h3>
                {stats.map((s, i) => {
                  const pct = maxDamage > 0 ? (s.totalDamageDealt / maxDamage) * 100 : 0;
                  const barColor = i < 3 ? BAR_COLORS[i] : "bg-white/20";
                  const rankColor = i < 3 ? RANK_COLORS[i] : "bg-white/5 border-white/10 text-muted-foreground";

                  return (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      {/* Rank badge */}
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${rankColor}`}
                      >
                        {i + 1}
                      </span>

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-foreground truncate">{s.name}</span>
                          <span className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground font-mono">
                              {s.totalDamageDealt}
                            </span>
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
                            transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                            className={`h-full rounded-full ${barColor}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Secondary Stats Row */}
            {(tank || healer || critKing || speedster || slowpoke) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
                data-testid="leaderboard-secondary"
              >
                {tank && (
                  <SecondaryStatCard
                    icon={<Shield className="size-4 text-blue-400" />}
                    label={t("leaderboard_tank")}
                    name={tank.name}
                    value={tank.totalDamageReceived}
                  />
                )}
                {healer && (
                  <SecondaryStatCard
                    icon={<Heart className="size-4 text-green-400" />}
                    label={t("leaderboard_healer")}
                    name={healer.name}
                    value={healer.totalHealing}
                  />
                )}
                {critKing && (
                  <SecondaryStatCard
                    icon={<Swords className="size-4 text-amber-400" />}
                    label={t("leaderboard_crits")}
                    name={critKing.name}
                    value={critKing.criticalHits}
                  />
                )}
                {speedster && (
                  <SecondaryStatCard
                    icon={<Zap className="size-4 text-cyan-400" />}
                    label={t("leaderboard_speedster")}
                    name={speedster.name}
                    valueText={`avg ${formatDuration(speedster.totalTurnTime / speedster.turnCount)}/turn`}
                  />
                )}
                {slowpoke && (
                  <SecondaryStatCard
                    icon={<Timer className="size-4 text-orange-400" />}
                    label={t("leaderboard_slowpoke")}
                    name={slowpoke.name}
                    valueText={`avg ${formatDuration(slowpoke.totalTurnTime / slowpoke.turnCount)}/turn`}
                  />
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex gap-2 pt-2"
            >
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-sm font-medium min-h-[44px]"
                data-testid="leaderboard-share-btn"
              >
                <Share2 className="size-4" />
                {t("leaderboard_share")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-sm font-medium min-h-[44px]"
                data-testid="leaderboard-close-action-btn"
              >
                {t("leaderboard_close")}
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
  );
}

function SecondaryStatCard({
  icon,
  label,
  name,
  value,
  valueText,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value?: number;
  valueText?: string;
}) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 min-w-[140px]">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xs text-foreground font-medium truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{valueText ?? value}</p>
      </div>
    </div>
  );
}
