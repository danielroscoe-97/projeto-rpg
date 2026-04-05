"use client";

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
} from "lucide-react";
import { CampaignGridCard } from "@/components/campaign/CampaignGridCard";

interface CampaignGridProps {
  isOwner: boolean;
  playerCount: number;
  npcCount: number;
  locationCount: number;
  factionCount: number;
  noteCount: number;
  questCount: number;
  finishedEncounterCount: number;
}

export function CampaignGrid({
  isOwner,
  playerCount,
  npcCount,
  locationCount,
  factionCount,
  noteCount,
  questCount,
  finishedEncounterCount,
}: CampaignGridProps) {
  const t = useTranslations("campaign");

  return (
    <div>
      {/* Group 1: Operational */}
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0 mb-2 flex items-center gap-2">
        <span>&#9889;</span> {t("hub_group_operational")}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <CampaignGridCard
          sectionId="encounters"
          icon={Swords}
          title={t("hub_card_encounters")}
          count={finishedEncounterCount}
          size="large"
        />
        <CampaignGridCard
          sectionId="quests"
          icon={ScrollText}
          title={t("hub_card_quests")}
          count={questCount}
          size="large"
        />
      </div>

      {/* Group 2: World */}
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-2 flex items-center gap-2">
        <span>&#127757;</span> {t("hub_group_world")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CampaignGridCard
          sectionId="players"
          icon={Users}
          title={t("hub_card_players")}
          count={playerCount}
          size="compact"
        />
        <CampaignGridCard
          sectionId="npcs"
          icon={UserCircle}
          title={t("hub_card_npcs")}
          count={npcCount}
          size="compact"
        />
        <CampaignGridCard
          sectionId="locations"
          icon={MapPin}
          title={t("hub_card_locations")}
          count={locationCount}
          size="compact"
        />
        <CampaignGridCard
          sectionId="factions"
          icon={Flag}
          title={t("hub_card_factions")}
          count={factionCount}
          size="compact"
        />
      </div>

      {/* Group 3: Journal */}
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-2 flex items-center gap-2">
        <span>&#128203;</span> {t("hub_group_journal")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <CampaignGridCard
          sectionId="notes"
          icon={FileText}
          title={t("hub_card_notes")}
          count={noteCount}
          size="compact"
        />
        {isOwner && (
          <CampaignGridCard
            sectionId="inventory"
            icon={Package}
            title={t("hub_card_inventory")}
            count={null}
            size="compact"
          />
        )}
        <CampaignGridCard
          sectionId="mindmap"
          icon={Network}
          title={t("hub_card_mindmap")}
          count={null}
          size="compact"
        />
      </div>
    </div>
  );
}
