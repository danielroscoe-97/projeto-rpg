"use client";

import Link from "next/link";
import { Heart, Shield, UserCircle2 } from "lucide-react";
import { getHpBarColor, getHpStatus, HP_STATUS_STYLES } from "@/lib/utils/hp-status";
import { ClassBadge } from "@/components/character/ClassBadge";
import { ClassIcon } from "@/components/character/ClassIcon";
import type { UserMembership } from "@/lib/types/campaign-membership";

interface PlayerCampaignCardProps {
  membership: UserMembership;
  translations: {
    activeSession: string;
    noActiveSession: string;
    playersSingular: string;
    playersPlural: string;
    dmLabel: string;
    /** Epic 12 Story 12.7 — role chip label ("Jogador" / "Player") */
    roleLabel?: string;
    levelAbbrev?: string;
    sessionLive?: string;
    sessionJoin?: string;
    createCharacter?: string;
    hp_full?: string;
    hp_light?: string;
    hp_moderate?: string;
    hp_heavy?: string;
    hp_critical?: string;
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
      className="block relative bg-card border border-border rounded-xl overflow-hidden hover:border-white/20 transition-all duration-[250ms] group min-h-[200px] sm:min-h-[240px]"
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
          <div className="w-full h-full bg-gradient-to-br from-amber-900/20 via-background to-amber-800/10" />
        )}
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-end p-4">
        {/* Epic 12 Story 12.7 — role chip so DM/Player cards read at a glance. */}
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-emerald-400/40"
          data-testid="campaign-role-chip-player"
        >
          <UserCircle2 className="size-3" aria-hidden="true" />
          {t.roleLabel ?? "Player"}
        </span>

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
              {(membership.character_race || membership.character_class) && (
                <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
                  {membership.character_class && (
                    <ClassBadge characterClass={membership.character_class} size="sm" />
                  )}
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
                  {hpStyle.labelKey && (t as Record<string, string>)[hpStyle.labelKey] ? (t as Record<string, string>)[hpStyle.labelKey] : hpStatus}
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

        {/* S2.2: Create character CTA when no character */}
        {!hasCharacter && !hasActiveSession && (
          <span className="mt-2 block w-full text-center text-xs font-semibold py-2 px-3 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 group-hover:bg-amber-400/20 transition-all">
            {t.createCharacter ?? "Create Character"}
          </span>
        )}

        {/* JO-10: Join session CTA — shown when session is active */}
        {hasActiveSession && (
          <span className="mt-2 block w-full text-center text-xs font-bold py-2 px-3 rounded-lg bg-gold/20 text-gold border border-gold/30 group-hover:bg-gold/30 group-hover:shadow-gold-glow transition-all">
            {t.sessionJoin ?? t.activeSession}
          </span>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/60">
          <span>
            {membership.player_count} {membership.player_count === 1 ? t.playersSingular : t.playersPlural}
          </span>
          {!hasActiveSession && <span>{t.noActiveSession}</span>}
        </div>
      </div>
    </Link>
  );
}
