"use client";

import {
  useState,
  useEffect,
  Suspense,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { PlayerCharacterManager } from "@/components/dashboard/PlayerCharacterManager";
import { CampaignNotes } from "@/components/campaign/CampaignNotes";
import { EncounterHistory } from "@/components/campaign/EncounterHistory";
import { NpcList } from "@/components/campaign/NpcList";
import { CampaignMindMap } from "@/components/campaign/CampaignMindMap";
import { QuestBoard } from "@/components/campaign/QuestBoard";
import { LocationList } from "@/components/campaign/LocationList";
import { FactionList } from "@/components/campaign/FactionList";
import { BagOfHolding } from "@/components/player-hq/BagOfHolding";
import { CampaignEncounterBuilder } from "@/components/campaign/CampaignEncounterBuilder";
import type { SectionId, MonsterOption } from "@/lib/types/campaign-hub";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

// ── Props ───────────────────────────────────────────────────────────────────

interface CampaignFocusViewProps {
  section: SectionId;
  campaignId: string;
  campaignName: string;
  isOwner: boolean;
  userId: string;
  characters: PlayerCharacter[];
  initialMembers?: CampaignMemberWithUser[];
  srdMonsters?: MonsterOption[];
}

// ── Error Boundary ──────────────────────────────────────────────────────────

/** Inline error boundary to prevent one broken section from crashing the entire campaign page. */
class SectionErrorBoundary extends Component<
  { children: ReactNode; fallbackLabel: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CampaignSection] crashed:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 px-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Erro ao carregar {this.props.fallbackLabel}. Tente recarregar a
            página.
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function CampaignFocusView({
  section,
  campaignId,
  campaignName,
  isOwner,
  userId,
  characters,
  initialMembers,
  srdMonsters,
}: CampaignFocusViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tBuilder = useTranslations("encounter_builder");

  const [encounterTab, setEncounterTab] = useState<"builder" | "history">(
    "builder",
  );

  // Guard DM-only sections — redirect non-owners back to overview
  useEffect(() => {
    if (!isOwner && section === "inventory") {
      router.replace(pathname);
    }
  }, [isOwner, section, router, pathname]);

  if (!isOwner && section === "inventory") {
    return null;
  }

  // ── Section renderer ────────────────────────────────────────────────────

  function renderSection() {
    switch (section) {
      case "players":
        return (
          <PlayerCharacterManager
            initialCharacters={characters}
            campaignId={campaignId}
            campaignName={campaignName}
            initialMembers={initialMembers}
            isOwner={isOwner}
          />
        );

      case "encounters":
        return isOwner ? (
          <div>
            {/* Sub-tabs for builder/history */}
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
                characters={characters}
                monsters={srdMonsters}
              />
            )}
            {encounterTab === "history" && (
              <EncounterHistory campaignId={campaignId} />
            )}
          </div>
        ) : (
          <EncounterHistory campaignId={campaignId} />
        );

      case "quests":
        return <QuestBoard campaignId={campaignId} isEditable={isOwner} />;

      case "npcs":
        return <NpcList campaignId={campaignId} />;

      case "locations":
        return <LocationList campaignId={campaignId} isEditable={isOwner} />;

      case "factions":
        return <FactionList campaignId={campaignId} isEditable={isOwner} />;

      case "notes":
        return <CampaignNotes campaignId={campaignId} />;

      case "inventory":
        return <BagOfHolding campaignId={campaignId} userId={userId} isDm />;

      case "mindmap":
        return (
          <CampaignMindMap
            campaignId={campaignId}
            campaignName={campaignName}
          />
        );

      default:
        return null;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      }
    >
      <SectionErrorBoundary fallbackLabel={section}>
        {renderSection()}
      </SectionErrorBoundary>
    </Suspense>
  );
}
