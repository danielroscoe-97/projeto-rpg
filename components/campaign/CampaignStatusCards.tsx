"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Swords, ScrollText, Users } from "lucide-react";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";

interface CampaignStatusCardsProps {
  campaignId: string;
  campaignName: string;
  playerEmails: string[];
  playerCount: number;
  sessionCount: number;
  questCount: number;
  finishedEncounterCount: number;
  activeSessionId: string | null;
  activeSessionName: string | null;
  /** Controlled externally — avoids duplicate CombatLaunchSheet instances */
  onOpenCombat?: () => void;
}

const cardBase =
  "bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-4 cursor-pointer hover:border-amber-500/30 hover:bg-white/[0.06] transition-all";

const cardActive =
  "bg-amber-500/10 backdrop-blur-sm border border-amber-500/50 rounded-xl p-4 cursor-pointer hover:border-amber-500/60 hover:bg-amber-500/15 transition-all";

export function CampaignStatusCards({
  campaignId,
  campaignName,
  playerEmails,
  playerCount,
  sessionCount,
  questCount,
  finishedEncounterCount,
  activeSessionId,
  activeSessionName,
  onOpenCombat,
}: CampaignStatusCardsProps) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  // Internal fallback if parent doesn't control combat sheet
  const [combatOpenInternal, setCombatOpenInternal] = useState(false);

  const openCombat = onOpenCombat ?? (() => setCombatOpenInternal(true));

  // Onboarding: show CTAs when steps are incomplete
  const isOnboarding = playerCount === 0 || sessionCount === 0 || questCount === 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Session (active) / Players (onboarding Step 1) */}
        {isOnboarding && playerCount === 0 ? (
          <div
            className={cardBase}
            onClick={() => setInviteOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setInviteOpen(true);
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("hub_card_players")}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">0</p>
              <span className="text-xs font-medium text-amber-400 hover:text-amber-300">
                {t("hub_onboard_invite_cta")}
              </span>
              <p className="text-[10px] text-muted-foreground">
                {t("hub_onboard_step", { current: 1, total: 3 })}
              </p>
            </div>
          </div>
        ) : activeSessionId ? (
          <div
            className={cardActive}
            onClick={openCombat}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openCombat();
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-amber-400">
                  {t("hub_kpi_session_active")}
                </span>
              </div>
              {activeSessionName && (
                <p className="text-sm text-foreground font-medium truncate">
                  {activeSessionName}
                </p>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300">
                <Swords className="w-3 h-3" />
                {t("hub_kpi_session_enter")}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={cardBase}
            onClick={openCombat}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openCombat();
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("hub_kpi_session_active")}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{sessionCount}</p>
            </div>
          </div>
        )}

        {/* Card 2: Encounters / Onboarding Step 2 */}
        {isOnboarding && sessionCount === 0 && playerCount > 0 ? (
          <div
            className={cardBase}
            onClick={openCombat}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openCombat();
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("hub_kpi_encounters")}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">0</p>
              <span className="text-xs font-medium text-amber-400 hover:text-amber-300">
                {t("hub_onboard_encounter_cta")}
              </span>
              <p className="text-[10px] text-muted-foreground">
                {t("hub_onboard_step", { current: 2, total: 3 })}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cardBase}
            onClick={() => router.push("?section=encounters", { scroll: false })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                router.push("?section=encounters", { scroll: false });
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("hub_kpi_encounters")}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">
                {finishedEncounterCount}
              </p>
            </div>
          </div>
        )}

        {/* Card 3: Quests / Onboarding Step 3 */}
        {isOnboarding && questCount === 0 && playerCount > 0 && sessionCount > 0 ? (
          <div
            className={cardBase}
            onClick={() => router.push("?section=quests", { scroll: false })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                router.push("?section=quests", { scroll: false });
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("hub_kpi_quests")}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">0</p>
              <span className="text-xs font-medium text-amber-400 hover:text-amber-300">
                {t("hub_onboard_quest_cta")}
              </span>
              <p className="text-[10px] text-muted-foreground">
                {t("hub_onboard_step", { current: 3, total: 3 })}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cardBase}
            onClick={() => router.push("?section=quests", { scroll: false })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                router.push("?section=quests", { scroll: false });
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("hub_kpi_quests")}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{questCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controlled dialogs */}
      <InvitePlayerDialog
        campaignId={campaignId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      {/* Only render internal CombatLaunchSheet if parent doesn't control it */}
      {!onOpenCombat && (
        <CombatLaunchSheet
          campaignId={campaignId}
          campaignName={campaignName}
          playerEmails={playerEmails}
          activeSessionId={activeSessionId}
          open={combatOpenInternal}
          onOpenChange={setCombatOpenInternal}
        />
      )}
    </>
  );
}
