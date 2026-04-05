"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Swords, FileText } from "lucide-react";
import { CampaignPlayerAvatars } from "@/components/campaign/CampaignPlayerAvatars";
import { CampaignStatusCards } from "@/components/campaign/CampaignStatusCards";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";
import type { PlayerCharacter } from "@/lib/types/database";

interface CampaignHeroProps {
  campaignId: string;
  campaignName: string;
  characters: PlayerCharacter[];
  playerEmails: string[];
  playerCount: number;
  sessionCount: number;
  questCount: number;
  finishedEncounterCount: number;
  activeSessionId: string | null;
  activeSessionName: string | null;
}

export function CampaignHero({
  campaignId,
  campaignName,
  characters,
  playerEmails,
  playerCount,
  sessionCount,
  questCount,
  finishedEncounterCount,
  activeSessionId,
  activeSessionName,
}: CampaignHeroProps) {
  const t = useTranslations("campaign");
  const tDash = useTranslations("dashboard");
  const router = useRouter();
  const [combatOpen, setCombatOpen] = useState(false);

  const subtitle =
    sessionCount > 0
      ? t("hub_subtitle_session", { number: sessionCount })
      : t("hub_subtitle_new");

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Breadcrumb + Title */}
      <div>
        <Link
          href="/app/dashboard"
          className="text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          &larr; {tDash("back_to_dashboard")}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">
          {campaignName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {/* Player Avatars */}
      <CampaignPlayerAvatars
        characters={characters}
        campaignId={campaignId}
      />

      {/* Status KPI Cards — single CombatLaunchSheet controlled from here */}
      <CampaignStatusCards
        campaignId={campaignId}
        campaignName={campaignName}
        playerEmails={playerEmails}
        playerCount={playerCount}
        sessionCount={sessionCount}
        questCount={questCount}
        finishedEncounterCount={finishedEncounterCount}
        activeSessionId={activeSessionId}
        activeSessionName={activeSessionName}
        onOpenCombat={() => setCombatOpen(true)}
      />

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/50 hover:bg-background hover:border-amber-500/50 transition-colors min-h-[44px]"
          onClick={() => setCombatOpen(true)}
        >
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          {t("new_combat_button")}
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/50 hover:bg-background hover:border-amber-500/50 transition-colors min-h-[44px]"
          onClick={() =>
            router.push("?section=encounters", { scroll: false })
          }
        >
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          {t("quick_action_encounter")}
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/50 hover:bg-background hover:border-amber-500/50 transition-colors min-h-[44px]"
          onClick={() =>
            router.push("?section=notes", { scroll: false })
          }
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          {t("quick_action_note")}
        </button>
      </div>

      {/* Single CombatLaunchSheet instance for Hero + StatusCards */}
      <CombatLaunchSheet
        campaignId={campaignId}
        campaignName={campaignName}
        playerEmails={playerEmails}
        activeSessionId={activeSessionId}
        open={combatOpen}
        onOpenChange={setCombatOpen}
      />
    </div>
  );
}
