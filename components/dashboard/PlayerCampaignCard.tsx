"use client";

import Link from "next/link";
import { getHpBarColor } from "@/lib/utils/hp-status";
import type { UserMembership } from "@/lib/types/campaign-membership";

interface PlayerCampaignCardProps {
  membership: UserMembership;
  translations: {
    activeSession: string;
    noActiveSession: string;
    playerCount: string;
    dmLabel: string;
  };
}

export function PlayerCampaignCard({
  membership,
  translations: t,
}: PlayerCampaignCardProps) {
  const hasActiveSession = membership.active_sessions > 0;
  const hasCharacter = !!membership.character_name;

  const href = hasCharacter
    ? `/app/campaigns/${membership.campaign_id}/sheet`
    : `/app/campaigns/${membership.campaign_id}`;

  return (
    <Link
      href={href}
      className="block bg-card border border-border rounded-lg p-4 hover:border-white/20 transition-all duration-[250ms] group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-foreground font-medium truncate group-hover:text-gold transition-colors">
            {membership.campaign_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {t.dmLabel}: {membership.dm_name || membership.dm_email}
          </p>
        </div>
        {hasActiveSession && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.activeSession}
          </span>
        )}
      </div>

      {/* Character info */}
      {hasCharacter && (
        <div className="mt-3 space-y-1.5">
          <p className="text-sm text-foreground">{membership.character_name}</p>
          {membership.character_hp != null &&
            membership.character_max_hp != null &&
            membership.character_max_hp > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getHpBarColor(
                      membership.character_hp,
                      membership.character_max_hp
                    )}`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (membership.character_hp /
                            membership.character_max_hp) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {membership.character_hp}/{membership.character_max_hp}
                </span>
              </div>
            )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t.playerCount.replace("{count}", String(membership.player_count))}
        </span>
        {!hasActiveSession && (
          <span>{t.noActiveSession}</span>
        )}
      </div>
    </Link>
  );
}
