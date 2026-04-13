"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Users, Swords, ScrollText, Sparkles } from "lucide-react";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";
import { requestXpGrant } from "@/lib/xp/request-xp";
import { createClient } from "@/lib/supabase/client";

interface CampaignOnboardingChecklistProps {
  campaignId: string;
  campaignName: string;
  playerEmails: string[];
  activeSessionId: string | null;
  playerCount: number;
  encounterCount: number;
  sessionCount: number;
}

interface Step {
  key: string;
  done: boolean;
  titleKey: string;
  descKey: string;
  ctaKey?: string;
  icon: typeof Users;
}

export function CampaignOnboardingChecklist({
  campaignId,
  campaignName,
  playerEmails,
  activeSessionId,
  playerCount,
  encounterCount,
  sessionCount,
}: CampaignOnboardingChecklistProps) {
  const t = useTranslations("campaignOnboarding");
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [combatOpen, setCombatOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const steps: Step[] = [
    {
      key: "created",
      done: true,
      titleKey: "step1_title",
      descKey: "step1_desc",
      icon: Sparkles,
    },
    {
      key: "invite",
      done: playerCount > 0,
      titleKey: "step2_title",
      descKey: "step2_desc",
      ctaKey: "step2_cta",
      icon: Users,
    },
    {
      key: "session",
      done: sessionCount > 0,
      titleKey: "step3_title",
      descKey: "step3_desc",
      ctaKey: "step3_cta",
      icon: Swords,
    },
    {
      key: "encounter",
      done: encounterCount > 0,
      titleKey: "step4_title",
      descKey: "step4_desc",
      ctaKey: "step4_cta",
      icon: ScrollText,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const currentStepIndex = steps.findIndex((s) => !s.done);

  const persistOnboardingCompleted = useCallback(async () => {
    const supabase = createClient();
    await supabase
      .from("campaign_settings")
      .update({ onboarding_completed: true })
      .eq("campaign_id", campaignId);
  }, [campaignId]);

  const handleComplete = useCallback(() => {
    requestXpGrant("dm:campaign_setup_complete", "dm", { campaignId });
    persistOnboardingCompleted();
    setDismissed(true);
    // Refresh server data after animation
    setTimeout(() => router.refresh(), 400);
  }, [campaignId, router, persistOnboardingCompleted]);

  const handleSkip = () => {
    persistOnboardingCompleted();
    setDismissed(true);
    setTimeout(() => router.refresh(), 400);
  };

  const handleStepAction = (stepKey: string) => {
    switch (stepKey) {
      case "invite":
        setInviteOpen(true);
        break;
      case "encounter":
        router.push(`?section=encounters`, { scroll: false });
        break;
      case "session":
        setCombatOpen(true);
        break;
    }
  };

  // If all done, auto-trigger complete with delay
  useEffect(() => {
    if (allDone && !dismissed) {
      const timer = setTimeout(() => handleComplete(), 800);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed, handleComplete]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-white/[0.04] rounded-xl p-4 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {allDone ? t("complete_title") : t("title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone
                  ? t("complete_desc")
                  : t("step_label", {
                      current: completedCount + 1,
                      total: steps.length,
                    })}
              </p>
            </div>
            {!allDone && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2 flex items-center"
              >
                {t("skip")}
              </button>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isCurrent = index === currentStepIndex;
              const isFuture = !step.done && index > currentStepIndex;

              return (
                <motion.div
                  key={step.key}
                  initial={false}
                  animate={{
                    opacity: isFuture ? 0.5 : 1,
                  }}
                  className={`relative flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    step.done
                      ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                      : isCurrent
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-white/[0.04] bg-card"
                  }`}
                >
                  {/* Pulsing glow for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border border-amber-500/40 pointer-events-none"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(245, 158, 11, 0)",
                          "0 0 12px rgba(245, 158, 11, 0.15)",
                          "0 0 0px rgba(245, 158, 11, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}

                  {/* Check/Circle icon */}
                  <div className="shrink-0">
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle
                        className={`w-5 h-5 ${isCurrent ? "text-amber-400" : "text-muted-foreground"}`}
                      />
                    )}
                  </div>

                  {/* Step icon */}
                  <step.icon
                    className={`w-4 h-4 shrink-0 ${
                      step.done
                        ? "text-emerald-400/60"
                        : isCurrent
                          ? "text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  />

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        step.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {t(step.titleKey)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t(step.descKey)}
                    </p>
                  </div>

                  {/* CTA button */}
                  {step.ctaKey && !step.done && (
                    <button
                      type="button"
                      onClick={() => handleStepAction(step.key)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[44px] ${
                        isCurrent
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                          : "bg-white/[0.04] text-muted-foreground hover:text-foreground border border-white/[0.04]"
                      }`}
                    >
                      {t(step.ctaKey)}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Dialog instances — outside AnimatePresence to avoid unmount issues */}
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
