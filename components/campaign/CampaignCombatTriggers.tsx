"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";

interface CampaignCombatTriggersProps {
  campaignId: string;
  campaignName: string;
  playerEmails: string[];
  activeSessionId: string | null;
  activeSessionName: string | null;
  playerCount: number;
  sessionCount: number;
  encounterCount: number;
}

export function CampaignCombatTriggers({
  campaignId,
  campaignName,
  playerEmails,
  activeSessionId,
  activeSessionName,
  playerCount,
  sessionCount,
  encounterCount,
}: CampaignCombatTriggersProps) {
  const t = useTranslations("campaign");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Stats + Novo Combate button row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg">
          <span className="text-amber-400 text-sm font-semibold">{playerCount}</span>
          <span className="text-muted-foreground text-xs">{t("summary_players", { count: playerCount })}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg">
          <span className="text-amber-400 text-sm font-semibold">{sessionCount}</span>
          <span className="text-muted-foreground text-xs">{t("summary_sessions", { count: sessionCount })}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg">
          <span className="text-amber-400 text-sm font-semibold">{encounterCount}</span>
          <span className="text-muted-foreground text-xs">{t("summary_encounters", { count: encounterCount })}</span>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gold text-surface-primary hover:brightness-110 transition-all min-h-[44px]"
        >
          <Swords className="w-4 h-4" />
          {t("new_combat_button")}
        </button>
      </div>

      {/* Active Session Banner */}
      {activeSessionId && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {t("active_session_banner")}: &quot;{activeSessionName ?? t("session_fallback")}&quot; · {t("session_start_combat")}
        </button>
      )}

      {/* Single controlled CombatLaunchSheet — no duplicate instances */}
      <CombatLaunchSheet
        campaignId={campaignId}
        campaignName={campaignName}
        playerEmails={playerEmails}
        activeSessionId={activeSessionId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
