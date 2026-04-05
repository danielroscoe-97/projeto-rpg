"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Swords, ScrollText, Check } from "lucide-react";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";

interface CampaignOnboardingProps {
  campaignId: string;
  campaignName: string;
  playerEmails: string[];
  activeSessionId: string | null;
  steps: { players: boolean; session: boolean; quest: boolean };
}

export function CampaignOnboarding({
  campaignId,
  campaignName,
  playerEmails,
  activeSessionId,
  steps,
}: CampaignOnboardingProps) {
  const t = useTranslations("campaign");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [combatOpen, setCombatOpen] = useState(false);

  const items = [
    {
      key: "invite",
      done: steps.players,
      icon: Users,
      label: t("onboarding_step_invite"),
      onClick: () => setInviteOpen(true),
    },
    {
      key: "session",
      done: steps.session,
      icon: Swords,
      label: t("onboarding_step_session"),
      onClick: () => setCombatOpen(true),
    },
    {
      key: "quest",
      done: steps.quest,
      icon: ScrollText,
      label: t("onboarding_step_quest"),
      onClick: () =>
        document
          .getElementById("section_quests")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
  ];

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("onboarding_title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              disabled={item.done}
              className={`group relative flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                item.done
                  ? "border-amber-500/30 bg-amber-500/5 cursor-default"
                  : "border-border bg-background/50 hover:border-amber-500/50 hover:bg-background"
              }`}
            >
              {/* Step number / check */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  item.done
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item.done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <item.icon
                  className={`h-4 w-4 shrink-0 ${
                    item.done ? "text-amber-400" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm font-medium truncate ${
                    item.done
                      ? "text-amber-400/80 line-through"
                      : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <InvitePlayerDialog
        campaignId={campaignId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <CombatLaunchSheet
        campaignId={campaignId}
        campaignName={campaignName}
        playerEmails={playerEmails}
        activeSessionId={activeSessionId}
        open={combatOpen}
        onOpenChange={setCombatOpen}
      />
    </>
  );
}
