"use client";

import { useState, Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Users, FileText, Swords, UserCircle, ChevronDown, Network, ScrollText, MapPin, Flag, AlertTriangle } from "lucide-react";
import { PlayerCharacterManager } from "@/components/dashboard/PlayerCharacterManager";
import { CampaignNotes } from "@/components/campaign/CampaignNotes";
import { EncounterHistory } from "@/components/campaign/EncounterHistory";
import { NpcList } from "@/components/campaign/NpcList";
import { CampaignMindMap } from "@/components/campaign/CampaignMindMap";
import { QuestBoard } from "@/components/campaign/QuestBoard";
import { LocationList } from "@/components/campaign/LocationList";
import { FactionList } from "@/components/campaign/FactionList";
import { CampaignEncounterBuilder } from "@/components/campaign/CampaignEncounterBuilder";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

interface MonsterOption {
  name: string;
  cr: string;
  type?: string;
  slug?: string;
  token_url?: string | null;
  source?: string;
}

interface Props {
  campaignId: string;
  campaignName: string;
  initialCharacters: PlayerCharacter[];
  isOwner: boolean;
  initialMembers?: CampaignMemberWithUser[];
  srdMonsters?: MonsterOption[];
}

/** Inline error boundary to prevent one broken section from crashing the entire campaign page. */
class SectionErrorBoundary extends Component<
  { children: ReactNode; fallbackLabel: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CampaignSection] crashed:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 px-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Erro ao carregar {this.props.fallbackLabel}. Tente recarregar a página.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

function Section({
  id,
  icon: Icon,
  title,
  defaultOpen,
  children,
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div id={id} className="border border-border rounded-lg overflow-hidden scroll-mt-20">
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
      {open && (
        <div className="px-4 py-4 border-t border-border">
          <SectionErrorBoundary fallbackLabel={title}>{children}</SectionErrorBoundary>
        </div>
      )}
    </div>
  );
}

export function CampaignSections({
  campaignId,
  campaignName,
  initialCharacters,
  isOwner,
  initialMembers,
  srdMonsters,
}: Props) {
  const t = useTranslations("campaign");
  const tBuilder = useTranslations("encounter_builder");
  const [encounterTab, setEncounterTab] = useState<"builder" | "history">("builder");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main column — content-heavy sections */}
      <div className="lg:col-span-2 space-y-4">
        <Section id="section_players" icon={Users} title={t("section_players")} defaultOpen={true}>
          <PlayerCharacterManager
            initialCharacters={initialCharacters}
            campaignId={campaignId}
            campaignName={campaignName}
            initialMembers={initialMembers}
            isOwner={isOwner}
          />
        </Section>

        {/* Encounter Builder — DM only, full-width in main column */}
        {isOwner && (
          <Section id="section_encounters" icon={Swords} title={tBuilder("section_title")} defaultOpen={false}>
            {/* Sub-tabs */}
            <div className="flex gap-1 mb-4">
              {(["builder", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEncounterTab(tab)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    encounterTab === tab
                      ? "border-amber-500 text-amber-400 bg-amber-500/10"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tBuilder(`tab_${tab}`)}
                </button>
              ))}
            </div>
            {encounterTab === "builder" && srdMonsters && (
              <CampaignEncounterBuilder
                campaignId={campaignId}
                members={initialMembers ?? []}
                characters={initialCharacters}
                monsters={srdMonsters}
              />
            )}
            {encounterTab === "history" && (
              <EncounterHistory campaignId={campaignId} />
            )}
          </Section>
        )}

        <Section id="section_npcs" icon={UserCircle} title={t("section_npcs")} defaultOpen={false}>
          <NpcList campaignId={campaignId} />
        </Section>

        <Section id="section_notes" icon={FileText} title={t("section_notes")} defaultOpen={false}>
          <CampaignNotes campaignId={campaignId} />
        </Section>
      </div>

      {/* Sidebar — lighter sections */}
      <div className="space-y-4">
        {/* Encounter History for non-owners (players see history only) */}
        {!isOwner && (
          <Section id="section_encounters" icon={Swords} title={t("section_encounters")} defaultOpen={false}>
            <EncounterHistory campaignId={campaignId} />
          </Section>
        )}

        <Section id="section_quests" icon={ScrollText} title={t("section_quests")} defaultOpen={true}>
          <QuestBoard campaignId={campaignId} isEditable={isOwner} />
        </Section>

        <Section id="section_locations" icon={MapPin} title={t("section_locations")} defaultOpen={false}>
          <LocationList campaignId={campaignId} isEditable={isOwner} />
        </Section>

        <Section id="section_factions" icon={Flag} title={t("section_factions")} defaultOpen={false}>
          <FactionList campaignId={campaignId} isEditable={isOwner} />
        </Section>

        <Section id="section_mindmap" icon={Network} title={t("section_mindmap")} defaultOpen={false}>
          <CampaignMindMap campaignId={campaignId} campaignName={campaignName} />
        </Section>
      </div>
    </div>
  );
}
