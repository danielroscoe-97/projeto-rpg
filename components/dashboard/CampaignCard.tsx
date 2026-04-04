"use client";

import Link from "next/link";
import { Users, Clock } from "lucide-react";

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
    players_singular: string;
    players_plural: string;
    manage: string;
  };
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "<1m";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export function CampaignCard({ campaign, translations: t }: CampaignCardProps) {
  const lastActivity = campaign.last_combat ? formatRelativeTime(campaign.last_combat) : "";

  return (
    <Link
      href={`/app/campaigns/${campaign.id}`}
      data-testid={`campaign-card-${campaign.id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-foreground font-medium truncate group-hover:text-amber-400 transition-colors">
          {campaign.name}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          {campaign.player_count} {Number(campaign.player_count) === 1 ? t.players_singular : t.players_plural}
        </span>
        {lastActivity && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {lastActivity}
          </span>
        )}
      </div>
    </Link>
  );
}
