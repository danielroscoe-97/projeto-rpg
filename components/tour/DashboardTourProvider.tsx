"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDashboardTourStore } from "@/lib/stores/dashboard-tour-store";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
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

  const effectiveSteps = useMemo(
    () => DASHBOARD_TOUR_STEPS.map(resolveStep),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mounted]
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

    const fromWizard = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("from") === "wizard";
    const effectiveDelay = fromWizard ? 800 : delayMs;

    // Use the quick-actions element as a proxy for "page content is ready".
    // It lives inside DashboardOverview (the actual page), not the layout shell.
    const CONTENT_READY_SELECTOR = '[data-tour-id="dash-quick-actions"]';
    const MAX_EXTRA_WAIT_MS = 8000;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const tryStart = () => {
      const { isCompleted: done, isActive: active } = useDashboardTourStore.getState();
      if (done || active) return true;
      if (document.querySelector(CONTENT_READY_SELECTOR)) {
        startTour();
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
            // Timeout fallback: start tour even if content selector never appeared
            const { isCompleted: done, isActive: active } = useDashboardTourStore.getState();
            if (!done && !active) startTour();
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
    } catch {
      // best-effort
    }
    // Quick Combat path: redirect to session/new only on tour completion (not skip)
    if (shouldRedirect && typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      if (next === "session") {
        router.push("/app/session/new");
      }
    }
  }

  // Update target rect when step changes
  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= effectiveSteps.length) return;
    const step = effectiveSteps[currentStep];

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
      setTargetRect(null);
    }
  }, [isActive, currentStep, effectiveSteps]);

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
    if (next >= effectiveSteps.length) {
      handleComplete();
    } else {
      goToStep(next);
    }
  }, [currentStep, effectiveSteps.length, goToStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

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

  if (!mounted || !isActive || currentStep >= effectiveSteps.length) return null;

  const step = effectiveSteps[currentStep];
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
        totalSteps={effectiveSteps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        onComplete={handleComplete}
        translationNamespace="dashboard_tour"
      />
    </>
  );
}
