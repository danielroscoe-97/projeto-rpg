"use client";

import Link from "next/link";
import { Swords, UserPlus, Plus } from "lucide-react";

interface QuickActionsTranslations {
  quick_actions: string;
  new_combat: string;
  create_npc: string;
  invite_player: string;
}

interface QuickActionsProps {
  translations: QuickActionsTranslations;
  /** If provided, the invite link goes to the campaign management page */
  campaignId?: string;
}

const ACTIONS = [
  {
    key: "new_combat" as const,
    href: "/app/session/new",
    icon: Swords,
    color: "text-amber-400",
    bgHover: "hover:border-amber-400/30",
  },
  {
    key: "create_npc" as const,
    href: "/app/presets",
    icon: Plus,
    color: "text-blue-400",
    bgHover: "hover:border-blue-400/30",
  },
  {
    key: "invite_player" as const,
    href: "/app/dashboard/campaigns",
    icon: UserPlus,
    color: "text-emerald-400",
    bgHover: "hover:border-emerald-400/30",
  },
] as const;

export function QuickActions({ translations: t, campaignId }: QuickActionsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {t.quick_actions}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const href =
            action.key === "invite_player" && campaignId
              ? `/app/campaigns/${campaignId}`
              : action.href;

          return (
            <Link
              key={action.key}
              href={href}
              className={`flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 transition-all duration-200 group ${action.bgHover}`}
            >
              <Icon
                className={`w-5 h-5 ${action.color} shrink-0`}
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
                {t[action.key]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
