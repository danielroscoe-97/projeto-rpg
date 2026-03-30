"use client";

import Link from "next/link";
import { Users } from "lucide-react";

export interface CampaignCardData {
  id: string;
  name: string;
  created_at: string;
  player_count: number;
  last_combat?: string | null;
}

interface CampaignCardProps {
  campaign: CampaignCardData;
  translations: {
    players: string;
    manage: string;
  };
}

export function CampaignCard({ campaign, translations: t }: CampaignCardProps) {
  return (
    <Link
      href={`/app/campaigns/${campaign.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-amber-400/30 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-foreground font-medium truncate group-hover:text-amber-400 transition-colors">
          {campaign.name}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          {campaign.player_count} {t.players}
        </span>
      </div>

      {campaign.last_combat && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">
          {campaign.last_combat}
        </p>
      )}
    </Link>
  );
}
