"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Flame, Play, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NextSessionCard } from "@/components/campaign/NextSessionCard";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";
import { SessionPlanner } from "@/components/campaign/SessionPlanner";
import { startSession } from "@/lib/supabase/campaign-sessions";
import type { ActiveEncounterInfo } from "@/lib/types/campaign-briefing";
import type { PlannedSession } from "@/lib/types/campaign-hub";

interface BriefingTodayProps {
  campaignId: string;
  campaignName: string;
  userId: string;
  playerEmails: string[];
  activeSessionId: string | null;
  activeSessionName: string | null;
  activeEncounter: ActiveEncounterInfo | null;
  nextPlannedSession: PlannedSession | null;
}

/**
 * "Hoje na sua mesa" — single actionable card for the current campaign
 * state (SPEC-campaign-dashboard-briefing §3.2). Four branches:
 *
 *  1. activeSessionId && activeEncounter → halo-strong combat card
 *  2. activeSessionId (no encounter)     → halo-sutil session card
 *  3. nextPlannedSession                 → reuses NextSessionCard
 *  4. default                            → narrative empty state + plan CTA
 */
export function BriefingToday({
  campaignId,
  campaignName,
  userId,
  playerEmails,
  activeSessionId,
  activeSessionName,
  activeEncounter,
  nextPlannedSession,
}: BriefingTodayProps) {
  const t = useTranslations("briefing");
  const tCampaign = useTranslations("campaign");
  const router = useRouter();
  const [combatOpen, setCombatOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const state = useMemo<
    "active_combat" | "active_session" | "planned_next" | "empty"
  >(() => {
    if (activeSessionId && activeEncounter) return "active_combat";
    if (activeSessionId) return "active_session";
    if (nextPlannedSession) return "planned_next";
    return "empty";
  }, [activeSessionId, activeEncounter, nextPlannedSession]);

  return (
    <section className="space-y-3" aria-labelledby="briefing-today-title">
      <h2
        id="briefing-today-title"
        className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
      >
        {t("today_title")}
      </h2>

      {state === "active_combat" && (
        <button
          type="button"
          onClick={() => setCombatOpen(true)}
          className="w-full text-left flex items-center gap-4 rounded-xl border border-amber-500/60 bg-amber-500/10 p-4 sm:p-5 transition-colors hover:bg-amber-500/15 focus-visible:bg-amber-500/15 min-h-[44px]"
          style={{ boxShadow: "var(--halo-active, 0 0 24px rgba(200, 160, 80, 0.35))" }}
          aria-label={t("today_combat_active_aria", {
            name: activeSessionName ?? "",
            round: activeEncounter?.round_number ?? 0,
          })}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-400/20 flex-shrink-0">
            <Flame className="w-6 h-6 text-amber-300" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-amber-400/90 font-semibold">
              {t("today_combat_active")}
            </p>
            <p className="text-base text-foreground font-semibold truncate">
              {activeSessionName ?? t("today_session_unnamed")}
              {activeEncounter?.round_number != null && (
                <span className="ml-2 text-sm font-normal text-amber-300">
                  {t("today_round", { round: activeEncounter.round_number })}
                </span>
              )}
            </p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              {t("today_combat_cta")}
            </p>
          </div>
          <Play className="w-5 h-5 text-amber-300 flex-shrink-0" aria-hidden="true" />
        </button>
      )}

      {state === "active_session" && (
        <button
          type="button"
          onClick={() => setCombatOpen(true)}
          className="w-full text-left flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 transition-colors hover:bg-amber-500/10 focus-visible:bg-amber-500/10 min-h-[44px]"
          style={{ boxShadow: "var(--halo-available, 0 0 8px rgba(200, 160, 80, 0.1))" }}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-400/15 flex-shrink-0">
            <Play className="w-6 h-6 text-amber-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold">
              {t("today_session_active")}
            </p>
            <p className="text-base text-foreground font-semibold truncate">
              {activeSessionName ?? t("today_session_unnamed")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("today_session_cta")}
            </p>
          </div>
        </button>
      )}

      {state === "planned_next" && nextPlannedSession && (
        <div className="space-y-2">
          <NextSessionCard
            session={nextPlannedSession}
            onStart={async () => {
              const ok = await startSession(nextPlannedSession.id);
              if (!ok) {
                toast.error(tCampaign("session_start_error"));
                return;
              }
              router.push(`/app/combat/${nextPlannedSession.id}`);
            }}
          />
          {nextPlannedSession.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 px-1">
              {nextPlannedSession.description}
            </p>
          )}
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-xl border border-slate-500/20 bg-card p-5 sm:p-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.04] flex-shrink-0">
              <Sparkles className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">
                {t("today_empty_title")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("today_empty_copy")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-foreground gap-1.5"
              onClick={() => setPlannerOpen(true)}
            >
              <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
              {t("today_plan_cta")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] border-border text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => setCombatOpen(true)}
            >
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              {tCampaign("new_combat_button")}
            </Button>
          </div>
        </div>
      )}

      {/* Shared dialogs */}
      <CombatLaunchSheet
        campaignId={campaignId}
        campaignName={campaignName}
        playerEmails={playerEmails}
        activeSessionId={activeSessionId}
        plannedSessionName={nextPlannedSession?.name ?? null}
        plannedSessionId={nextPlannedSession?.id ?? null}
        open={combatOpen}
        onOpenChange={setCombatOpen}
      />
      <SessionPlanner
        campaignId={campaignId}
        userId={userId}
        open={plannerOpen}
        onOpenChange={setPlannerOpen}
        onSessionCreated={() => router.refresh()}
      />
    </section>
  );
}
