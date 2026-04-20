"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboardTourStore } from "@/lib/stores/dashboard-tour-store";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import { requestXpGrant } from "@/lib/xp/request-xp";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { DASHBOARD_TOUR_STEPS } from "./dashboard-tour-steps";
import type { TourStepConfig } from "./tour-steps";

interface DashboardTourProviderProps {
  /** Whether the tour should auto-start on mount */
  shouldAutoStart: boolean;
  /** Delay before auto-starting (ms). Default: 1200 */
  delayMs?: number;
  /** Source of the user (affects last-step CTA copy) */
  source?: string;
  /** Whether the user has DM access — filters DM-only tour steps */
  hasDmAccess?: boolean;
  /** Whether this is the player's first campaign tour (JO-12) */
  isPlayerFirstCampaign?: boolean;
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

/**
 * Resolves the effective step by adapting selectors/positions for mobile.
 */
function resolveStep(step: (typeof DASHBOARD_TOUR_STEPS)[0]): TourStepConfig {
  const mobile = isMobileViewport();
  if (mobile && step.mobileSelector) {
    return {
      ...step,
      targetSelector: step.mobileSelector,
      position: step.mobilePosition ?? "top",
    };
  }
  return step;
}

export function DashboardTourProvider({
  shouldAutoStart,
  delayMs = 1200,
  source,
  hasDmAccess = false,
  isPlayerFirstCampaign = false,
}: DashboardTourProviderProps) {
  const router = useRouter();
  const {
    currentStep,
    isActive,
    startTour,
    goToStep,
    skipTour,
    completeTour,
  } = useDashboardTourStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  // Steps resolved once at tour start — filtered by DOM existence for accurate progress
  const [resolvedSteps, setResolvedSteps] = useState<TourStepConfig[]>([]);

  const effectiveSteps = useMemo(() => {
    let steps = DASHBOARD_TOUR_STEPS;
    if (isPlayerFirstCampaign) {
      // Player first-campaign tour: only show "player" audience steps
      steps = steps.filter((step) => step.audience === "player");
    } else {
      // DM / general tour: show "all" + "dm" (if hasDmAccess)
      steps = steps.filter((step) => step.audience === "all" || (step.audience === "dm" && hasDmAccess));
    }
    return steps.map(resolveStep);
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasDmAccess, isPlayerFirstCampaign]
  );

  // Auto-start tour — wait for both the delay AND the page content to be in the DOM.
  // The layout mounts before the page (children) finishes loading, so a fixed delay
  // can fire while the skeleton is still showing. We poll for a content element
  // that only exists once the real page has rendered.
  useEffect(() => {
    setMounted(true);
    if (!shouldAutoStart) return;

    // DB says tour is pending — reset localStorage if it got out of sync
    const { isCompleted } = useDashboardTourStore.getState();
    if (isCompleted) {
      useDashboardTourStore.getState().resetTour();
    }

    // G-22: After wizard, give user time to breathe before starting tour
    const fromWizard = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("from") === "wizard";
    const effectiveDelay = fromWizard ? 3500 : delayMs;

    // Use a page-content element as a proxy for "page content is ready".
    // Player tour uses the dashboard header (always present) instead of
    // dash-player-campaigns which doesn't exist for new players with 0 campaigns.
    const CONTENT_READY_SELECTOR = isPlayerFirstCampaign
      ? '[data-testid="dashboard-overview"]'
      : '[data-tour-id="dash-quick-actions"]';
    const MAX_EXTRA_WAIT_MS = 8000;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    /** Resolve visible steps: keep modal steps + steps whose DOM target exists */
    const resolveAndStart = () => {
      const visible = effectiveSteps.filter(
        (s) => s.modal === true || document.querySelector(s.targetSelector) !== null
      );
      setResolvedSteps(visible.length > 0 ? visible : effectiveSteps);
      startTour();
    };

    const tryStart = () => {
      const { isCompleted: done, isActive: active } = useDashboardTourStore.getState();
      if (done || active) return true;
      if (document.querySelector(CONTENT_READY_SELECTOR)) {
        resolveAndStart();
        return true;
      }
      return false;
    };

    const timer = setTimeout(() => {
      if (!tryStart()) {
        // Content not ready yet — poll every 200 ms until it appears or times out
        const pollStart = Date.now();
        pollInterval = setInterval(() => {
          if (tryStart()) {
            clearInterval(pollInterval!);
            pollInterval = null;
          } else if (Date.now() - pollStart >= MAX_EXTRA_WAIT_MS) {
            clearInterval(pollInterval!);
            pollInterval = null;
            // Timeout fallback: resolve steps and start even without content selector
            const { isCompleted: done, isActive: active } = useDashboardTourStore.getState();
            if (!done && !active) resolveAndStart();
          }
        }, 200);
      }
    }, effectiveDelay);

    return () => {
      clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark tour completed in DB when done or skipped, then optionally redirect
  async function persistTourCompleted(shouldRedirect = false) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_onboarding")
        .update({ dashboard_tour_completed: true })
        .eq("user_id", user.id);

      // XP: Tour completed (use actual role)
      requestXpGrant("tour_completed", hasDmAccess ? "dm" : "player");
    } catch {
      // best-effort
    }
    // Redirect to quick combat on tour completion (not skip)
    if (shouldRedirect) {
      router.push("/app/combat/new");
    }
  }

  // The steps used for navigation/rendering — resolvedSteps once available, otherwise effectiveSteps
  const activeSteps = resolvedSteps.length > 0 ? resolvedSteps : effectiveSteps;

  // Update target rect when step changes
  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= activeSteps.length) return;
    const step = activeSteps[currentStep];

    if (step.modal) {
      const target = document.querySelector(step.targetSelector);
      setTargetRect(target ? target.getBoundingClientRect() : new DOMRect(0, 0, 0, 0));
      return;
    }

    const target = document.querySelector(step.targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      const inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inViewport) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setTargetRect(target.getBoundingClientRect()), 400);
      }
    } else {
      // Fallback: skip to next valid step if target disappeared after resolve
      let nextValid = currentStep + 1;
      while (nextValid < activeSteps.length) {
        const nextStep = activeSteps[nextValid];
        if (nextStep.modal || document.querySelector(nextStep.targetSelector)) break;
        nextValid++;
      }
      if (nextValid < activeSteps.length) {
        goToStep(nextValid);
      } else {
        setTargetRect(null);
      }
    }
  }, [isActive, currentStep, activeSteps, goToStep]);

  useEffect(() => {
    if (!isActive) return;
    updateTargetRect();
    const handleUpdate = () => updateTargetRect();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    const poll = setInterval(handleUpdate, 500);
    const pollTimeout = setTimeout(() => clearInterval(poll), 5000);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      clearInterval(poll);
      clearTimeout(pollTimeout);
    };
  }, [isActive, currentStep, updateTargetRect]);

  // ESC to skip is handled by TourTooltip — no duplicate listener here

  const handleNext = useCallback(() => {
    const next = currentStep + 1;
    if (next >= activeSteps.length) {
      handleComplete();
    } else {
      goToStep(next);
    }
  }, [currentStep, activeSteps.length, goToStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (currentStep <= 0) return;
    // Find previous step with a valid DOM target (skip missing ones)
    let prev = currentStep - 1;
    while (prev >= 0) {
      const step = activeSteps[prev];
      if (step.modal || document.querySelector(step.targetSelector)) break;
      prev--;
    }
    if (prev >= 0) goToStep(prev);
  }, [currentStep, activeSteps, goToStep]);

  const handleSkip = useCallback(() => {
    skipTour();
    persistTourCompleted();
    trackEvent("onboarding:tour_skipped", {
      source: source ?? "unknown",
      skipped_at_step: currentStep,
    });
  }, [skipTour, source, currentStep]);

  const handleComplete = useCallback(() => {
    completeTour();
    persistTourCompleted(true);
    trackEvent("onboarding:tour_completed", {
      source: source ?? "unknown",
      steps_viewed: currentStep + 1,
    });
  }, [completeTour, source, currentStep]);

  const handleDismiss = useCallback(() => {
    completeTour();
    persistTourCompleted(false);
    trackEvent("onboarding:tour_dismissed", {
      source: source ?? "unknown",
      steps_viewed: currentStep + 1,
    });
  }, [completeTour, source, currentStep]);

  if (!mounted || !isActive || currentStep >= activeSteps.length) return null;

  const step = activeSteps[currentStep];
  const isModal = step.modal === true;

  return (
    <>
      <TourOverlay
        isActive={isActive}
        targetRect={isModal ? null : targetRect}
        allowInteraction={false}
        dimOnly={isModal}
        onOverlayClick={() => {}}
      />
      <TourTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={activeSteps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        onComplete={handleComplete}
        onDismiss={handleDismiss}
        translationNamespace="dashboard_tour"
        secondaryCTA={{ labelKey: "dashboard_tour.create_campaign", href: "/app/dashboard/campaigns" }}
      />
    </>
  );
}
