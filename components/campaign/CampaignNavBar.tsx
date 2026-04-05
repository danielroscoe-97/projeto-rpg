"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SectionId } from "@/lib/types/campaign-hub";

// ── Nav item definitions ────────────────────────────────────────────────────

const NAV_ITEMS: { id: SectionId; icon: LucideIcon; labelKey: string; dmOnly?: boolean }[] = [
  { id: "encounters", icon: Swords, labelKey: "hub_card_encounters" },
  { id: "quests", icon: ScrollText, labelKey: "hub_card_quests" },
  { id: "players", icon: Users, labelKey: "hub_card_players" },
  { id: "npcs", icon: UserCircle, labelKey: "hub_card_npcs" },
  { id: "locations", icon: MapPin, labelKey: "hub_card_locations" },
  { id: "factions", icon: Flag, labelKey: "hub_card_factions" },
  { id: "notes", icon: FileText, labelKey: "hub_card_notes" },
  { id: "inventory", icon: Package, labelKey: "hub_card_inventory", dmOnly: true },
  { id: "mindmap", icon: Network, labelKey: "hub_card_mindmap" },
];

// ── Pill styles ─────────────────────────────────────────────────────────────

const PILL_BASE =
  "text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap inline-flex items-center gap-1.5 min-h-[44px]";
const PILL_ACTIVE = "border-amber-500 text-amber-400 bg-amber-500/10";
const PILL_INACTIVE = "border-border text-muted-foreground hover:text-foreground";

// ── Component ───────────────────────────────────────────────────────────────

interface CampaignNavBarProps {
  activeSection: SectionId;
  isOwner: boolean;
}

export function CampaignNavBar({ activeSection, isOwner }: CampaignNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("campaign");

  const visibleItems = isOwner ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.dmOnly);

  function navigateToOverview() {
    router.push(pathname, { scroll: false });
  }

  function navigateToSection(id: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/60 py-2 px-4">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {/* Overview pill — always first, never active in Focus View */}
        <button
          type="button"
          onClick={navigateToOverview}
          className={`${PILL_BASE} ${PILL_INACTIVE}`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {t("hub_nav_overview")}
        </button>

        {/* Section pills */}
        {visibleItems.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateToSection(id)}
              className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
