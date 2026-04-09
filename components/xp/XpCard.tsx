"use client";

import { useState } from "react";
import { useUserXp } from "@/lib/xp/hooks";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronRight, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

interface XpCardProps {
  userRole: "dm" | "player" | "both";
}

export function XpCard({ userRole }: XpCardProps) {
  const t = useTranslations("xp");
  const xp = useUserXp();
  // DM-first: show DM rank by default, toggle to player
  const [showingPlayer, setShowingPlayer] = useState(false);

  if (xp.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
        <div className="h-5 bg-white/[0.05] rounded w-32" />
        <div className="h-8 bg-white/[0.05] rounded-full" />
        <div className="h-4 bg-white/[0.05] rounded w-20" />
      </div>
    );
  }

  const hasBothRoles = userRole === "both";

  // Determine which rank to display
  const isDm = userRole === "dm" || (hasBothRoles && !showingPlayer);

  const icon = isDm ? xp.dmIcon : xp.playerIcon;
  const title = isDm ? xp.dmTitle : xp.playerTitle;
  const currentXp = isDm ? xp.dmXp : xp.playerXp;
  const nextRankXp = isDm ? xp.dmNextRankXp : xp.playerNextRankXp;
  const roleLabel = isDm ? t("dm_rank") : t("player_rank");
  const altRoleLabel = isDm ? t("player_rank") : t("dm_rank");

  // At max rank, nextRankXp is null — show full bar
  const isMaxRank = nextRankXp == null;
  const percentage = isMaxRank
    ? 100
    : nextRankXp > 0
      ? Math.min((currentXp / nextRankXp) * 100, 100)
      : 0;

  return (
    <div className="rounded-xl border border-gold/15 bg-gold/[0.02] p-4 hover:border-gold/30 transition-all group">
      <div className="flex items-center justify-between mb-2">
        <Link href="/methodology" className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none">{icon}</span>
          <div>
            <p className="text-xs text-foreground/50 leading-none">{roleLabel}</p>
            <p className="text-sm font-semibold text-gold">{title}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Toggle button — only for "both" role */}
          {hasBothRoles && (
            <button
              onClick={() => setShowingPlayer((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-foreground/40 hover:text-gold/70 transition-colors px-2 py-1 rounded-md hover:bg-gold/[0.06]"
              title={altRoleLabel}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span className="hidden sm:inline">{altRoleLabel}</span>
            </button>
          )}
          <Link href="/methodology">
            <ChevronRight className="w-4 h-4 text-gold/30 group-hover:text-gold/60 transition-colors" />
          </Link>
        </div>
      </div>

      {/* XP Bar — golden HP bar style */}
      <div className="relative h-6 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
          key={isDm ? "dm" : "player"}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percentage, 2)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent opacity-60 animate-[shimmer-sweep_2.5s_ease-in-out_infinite]" />
        </motion.div>

        {/* XP text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums">
            {isMaxRank
              ? `${currentXp.toLocaleString()} XP — MAX`
              : `${currentXp.toLocaleString()} / ${nextRankXp.toLocaleString()} XP`}
          </span>
        </div>
      </div>
    </div>
  );
}
