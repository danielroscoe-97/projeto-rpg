"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, UserPlus, FileText, Swords, UserCircle, ChevronDown, Network } from "lucide-react";
import { PlayerCharacterManager } from "@/components/dashboard/PlayerCharacterManager";
import { MembersList } from "@/components/campaign/MembersList";
import { CampaignNotes } from "@/components/campaign/CampaignNotes";
import { EncounterHistory } from "@/components/campaign/EncounterHistory";
import { NpcList } from "@/components/campaign/NpcList";
import { CampaignMindMap } from "@/components/campaign/CampaignMindMap";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

interface Props {
  campaignId: string;
  campaignName: string;
  initialCharacters: PlayerCharacter[];
  isOwner: boolean;
  initialMembers?: CampaignMemberWithUser[];
}

function Section({
  icon: Icon,
  title,
  defaultOpen,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 min-h-[44px] bg-card hover:bg-card/80 transition-colors text-left"
      >
        <Icon className="h-4 w-4 text-amber-400 flex-shrink-0" />
        <span className="text-amber-400 font-semibold text-sm flex-1">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="px-4 py-4 border-t border-border">{children}</div>}
    </div>
  );
}

export function CampaignSections({
  campaignId,
  campaignName,
  initialCharacters,
  isOwner,
  initialMembers,
}: Props) {
  const t = useTranslations("campaign");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main column — content-heavy sections */}
      <div className="lg:col-span-2 space-y-4">
        <Section icon={Users} title={t("section_players")} defaultOpen={true}>
          <PlayerCharacterManager
            initialCharacters={initialCharacters}
            campaignId={campaignId}
            campaignName={campaignName}
          />
        </Section>

        <Section icon={UserCircle} title={t("section_npcs")} defaultOpen={false}>
          <NpcList campaignId={campaignId} />
        </Section>

        <Section icon={FileText} title={t("section_notes")} defaultOpen={false}>
          <CampaignNotes campaignId={campaignId} />
        </Section>
      </div>

      {/* Sidebar — lighter sections */}
      <div className="space-y-4">
        <Section icon={UserPlus} title={t("section_members")} defaultOpen={false}>
          <MembersList
            campaignId={campaignId}
            isOwner={isOwner}
            initialMembers={initialMembers}
          />
        </Section>

        <Section icon={Swords} title={t("section_encounters")} defaultOpen={false}>
          <EncounterHistory campaignId={campaignId} />
        </Section>

        <Section icon={Network} title={t("section_mindmap")} defaultOpen={false}>
          <CampaignMindMap campaignId={campaignId} campaignName={campaignName} />
        </Section>
      </div>
    </div>
  );
}
