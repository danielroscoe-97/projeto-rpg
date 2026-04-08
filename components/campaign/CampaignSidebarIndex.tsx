"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Swords,
  ScrollText,
  Users,
  UserCircle,
  MapPin,
  Flag,
  FileText,
  Package,
  Network,
} from "lucide-react";

const SECTION_ICON_COLOR: Record<string, string> = {
  encounters: "text-red-400",
  quests: "text-amber-400",
  players: "text-emerald-400",
  npcs: "text-purple-400",
  locations: "text-green-400",
  factions: "text-rose-400",
  notes: "text-blue-400",
  inventory: "text-amber-400",
  mindmap: "text-indigo-400",
};

const SECTIONS = [
  {
    group: "hub_group_operational",
    items: [
      { id: "encounters", icon: Swords, labelKey: "hub_card_encounters" },
      { id: "quests", icon: ScrollText, labelKey: "hub_card_quests" },
    ],
  },
  {
    group: "hub_group_world",
    items: [
      { id: "players", icon: Users, labelKey: "hub_card_players" },
      { id: "npcs", icon: UserCircle, labelKey: "hub_card_npcs" },
      { id: "locations", icon: MapPin, labelKey: "hub_card_locations" },
      { id: "factions", icon: Flag, labelKey: "hub_card_factions" },
    ],
  },
  {
    group: "hub_group_journal",
    items: [
      { id: "notes", icon: FileText, labelKey: "hub_card_notes" },
      { id: "inventory", icon: Package, labelKey: "hub_card_inventory", dmOnly: true },
      { id: "mindmap", icon: Network, labelKey: "hub_card_mindmap" },
    ],
  },
];

interface CampaignSidebarIndexProps {
  isOwner: boolean;
}

export function CampaignSidebarIndex({ isOwner }: CampaignSidebarIndexProps) {
  const t = useTranslations("campaign");
  const router = useRouter();

  return (
    <nav
      className="hidden lg:block sticky top-24 w-44 shrink-0 self-start"
      aria-label="Campaign navigation"
    >
      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.group}>
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 px-2">
              {t(section.group)}
            </p>
            <ul className="space-y-0.5">
              {section.items
                .filter((item) => !("dmOnly" in item && item.dmOnly) || isOwner)
                .map((item) => {
                  const Icon = item.icon;
                  const iconColor = SECTION_ICON_COLOR[item.id] ?? "text-muted-foreground";
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`?section=${item.id}`, { scroll: false })
                        }
                        className="group flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
