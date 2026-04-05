"use client";

import Link from "next/link";
import { Heart, Sparkles, Shield } from "lucide-react";
import { getHpBarColor, getHpStatus, HP_STATUS_STYLES } from "@/lib/utils/hp-status";
import type { UserMembership } from "@/lib/types/campaign-membership";

interface PlayerCampaignCardProps {
  membership: UserMembership;
  translations: {
    activeSession: string;
    noActiveSession: string;
    playersSingular: string;
    playersPlural: string;
    dmLabel: string;
    levelAbbrev?: string;
    sessionLive?: string;
    sessionJoin?: string;
  };
}

export function PlayerCampaignCard({
  membership,
  translations: t,
}: PlayerCampaignCardProps) {
  const hasActiveSession = membership.active_sessions > 0;
  const hasCharacter = !!membership.character_name;
  const hasHp =
    membership.character_hp != null &&
    membership.character_max_hp != null &&
    membership.character_max_hp > 0;

  const href = hasCharacter
    ? `/app/campaigns/${membership.campaign_id}/sheet`
    : `/app/campaigns/${membership.campaign_id}`;

  // HP status for chip color
  const hpStatus = hasHp
    ? getHpStatus(membership.character_hp!, membership.character_max_hp!)
    : null;
  const hpStyle = hpStatus ? HP_STATUS_STYLES[hpStatus] : null;

  return (
    <Link
      href={href}
      className="block relative bg-card border border-border rounded-xl overflow-hidden hover:border-white/20 transition-all duration-[250ms] group h-[200px] sm:h-[240px]"
    >
      {/* Hero image / gradient background */}
      <div className="absolute inset-0">
        {membership.cover_image_url ? (
          <img
            src={membership.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900/30 via-background to-purple-900/20" />
        )}
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-end p-4">
        {/* Active session badge (top right) */}
        {hasActiveSession && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.sessionLive ?? t.activeSession}
          </span>
        )}

        {/* Campaign name + DM */}
        <div className="mb-2">
          <p className="text-foreground font-semibold text-base truncate group-hover:text-gold transition-colors drop-shadow-sm">
            {membership.campaign_name}
          </p>
          <p className="text-xs text-white/60 truncate">
            {t.dmLabel}: {membership.dm_name || membership.dm_email}
          </p>
        </div>

        {/* Character info */}
        {hasCharacter && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-sm text-white/90 font-medium truncate">
                {membership.character_name}
              </p>
              {membership.character_race && (
                <span className="text-[10px] text-white/50">
                  {membership.character_race}
                  {membership.character_class ? ` ${membership.character_class}` : ""}
                </span>
              )}
            </div>

            {/* HP bar */}
            {hasHp && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getHpBarColor(
                      membership.character_hp!,
                      membership.character_max_hp!
                    )}`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (membership.character_hp! / membership.character_max_hp!) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-white/60 tabular-nums">
                  {membership.character_hp}/{membership.character_max_hp}
                </span>
              </div>
            )}

            {/* Status chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* HP chip */}
              {hpStyle && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${hpStyle.bgClass} ${hpStyle.colorClass}`}>
                  <Heart className="w-2.5 h-2.5" />
                  {hpStatus}
                </span>
              )}

              {/* Level chip */}
              {membership.character_level && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                  <Shield className="w-2.5 h-2.5" />
                  {t.levelAbbrev ?? "Lv"}{membership.character_level}
                </span>
              )}
            </div>
          </div>
        )}

        {/* JO-10: Join session CTA — shown when session is active */}
        {hasActiveSession && t.sessionJoin && (
          <span className="mt-2 block w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
            {t.sessionJoin}
          </span>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
          <span>
            {membership.player_count} {membership.player_count === 1 ? t.playersSingular : t.playersPlural}
          </span>
          {!hasActiveSession && <span>{t.noActiveSession}</span>}
        </div>
      </div>
    </Link>
  );
}
