"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Swords, ScrollText, Users } from "lucide-react";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";

interface CampaignStatusCardsProps {
  campaignId: string;
  playerCount: number;
  sessionCount: number;
  questCount: number;
  finishedEncounterCount: number;
  activeSessionId: string | null;
  activeSessionName: string | null;
  onOpenCombat: () => void;
  onInvite?: () => void;
}

const cardBase =
  "bg-card border border-border/30 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 hover:bg-white/[0.04] transition-all";

const cardActive =
  "bg-amber-500/10 backdrop-blur-sm border border-amber-500/50 rounded-xl p-4 cursor-pointer hover:border-amber-500/60 hover:bg-amber-500/15 transition-all";

export function CampaignStatusCards({
  campaignId,
  playerCount,
  sessionCount,
  questCount,
  finishedEncounterCount,
  activeSessionId,
  activeSessionName,
  onOpenCombat,
  onInvite,
}: CampaignStatusCardsProps) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const handleInvite = onInvite ?? (() => setInviteOpen(true));

  // Onboarding mode: at least one of players/encounters/quests is zero
  const isOnboarding = playerCount === 0 || finishedEncounterCount === 0 || questCount === 0;

  // (step numbers are fixed per card position, not dynamic)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Players / Invite */}
        {isOnboarding && playerCount === 0 ? (
          <KpiCard
            className={cardBase}
            onClick={handleInvite}
            icon={<Users className="w-4 h-4 text-muted-foreground" />}
            label={t("hub_card_players")}
            value={0}
            cta={t("hub_onboard_invite_cta")}
            step={t("hub_onboard_step", { current: 1, total: 3 })}
          />
        ) : activeSessionId ? (
          <div
            className={cardActive}
            onClick={onOpenCombat}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpenCombat();
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
          <KpiCard
            className={cardBase}
            onClick={onOpenCombat}
            icon={<Swords className="w-4 h-4 text-muted-foreground" />}
            label={t("hub_kpi_session_active")}
            value={sessionCount}
          />
        )}

        {/* Card 2: Encounters / Create */}
        {isOnboarding && finishedEncounterCount === 0 ? (
          <KpiCard
            className={cardBase}
            onClick={onOpenCombat}
            icon={<Swords className="w-4 h-4 text-muted-foreground" />}
            label={t("hub_kpi_encounters")}
            value={0}
            cta={t("hub_onboard_encounter_cta")}
            step={t("hub_onboard_step", { current: 2, total: 3 })}
          />
        ) : (
          <KpiCard
            className={cardBase}
            onClick={() => router.push("?section=encounters", { scroll: false })}
            icon={<Swords className="w-4 h-4 text-muted-foreground" />}
            label={t("hub_kpi_encounters")}
            value={finishedEncounterCount}
          />
        )}

        {/* Card 3: Quests / Add */}
        {isOnboarding && questCount === 0 ? (
          <KpiCard
            className={cardBase}
            onClick={() => router.push("?section=quests", { scroll: false })}
            icon={<ScrollText className="w-4 h-4 text-muted-foreground" />}
            label={t("hub_kpi_quests")}
            value={0}
            cta={t("hub_onboard_quest_cta")}
            step={t("hub_onboard_step", { current: 3, total: 3 })}
          />
        ) : (
          <KpiCard
            className={cardBase}
            onClick={() => router.push("?section=quests", { scroll: false })}
            icon={<ScrollText className="w-4 h-4 text-muted-foreground" />}
            label={t("hub_kpi_quests")}
            value={questCount}
          />
        )}
      </div>

      {!onInvite && (
        <InvitePlayerDialog
          campaignId={campaignId}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
        />
      )}
    </>
  );
}

// ── Reusable KPI card ──────────────────────────────────────────────────────

function KpiCard({
  className,
  onClick,
  icon,
  label,
  value,
  cta,
  step,
}: {
  className: string;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  value: number;
  cta?: string;
  step?: string;
}) {
  return (
    <div
      className={className}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className={cta ? "space-y-2" : "space-y-1"}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold text-amber-400">{value}</p>
        {cta && (
          <span className="text-xs font-medium text-amber-400 hover:text-amber-300">
            {cta}
          </span>
        )}
        {step && (
          <p className="text-[10px] text-muted-foreground">{step}</p>
        )}
      </div>
    </div>
  );
}
