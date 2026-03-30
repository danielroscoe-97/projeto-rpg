"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

  // Auto-start tour — detect ?from=wizard for shorter delay
  useEffect(() => {
    setMounted(true);
    if (!shouldAutoStart) return;

    const fromWizard = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("from") === "wizard";
    const effectiveDelay = fromWizard ? 800 : delayMs;

    const timer = setTimeout(() => {
      const { isCompleted: done, isActive: active } = useDashboardTourStore.getState();
      if (!done && !active) {
        startTour();
      }
    }, effectiveDelay);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark tour completed in DB when done or skipped
  async function persistTourCompleted() {
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

  // ESC to skip
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

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
    persistTourCompleted();
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
      />
    </>
  );
}
