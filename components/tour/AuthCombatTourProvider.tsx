"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuthCombatTourStore } from "@/lib/stores/auth-combat-tour-store";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { TOUR_STEPS } from "./tour-steps";
import type { TourStepConfig } from "./tour-steps";

interface AuthCombatTourProviderProps {
  /** Whether the tour should auto-start on mount */
  shouldAutoStart: boolean;
  /** Delay before auto-starting (ms). Default: 1500 */
  delayMs?: number;
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/**
 * Returns the effective steps list, filtering out mobile-hidden and
 * merging mobile-merged steps (same logic as guest TourProvider).
 */
function getEffectiveSteps(): TourStepConfig[] {
  const mobile = isMobileViewport();
  if (!mobile) return TOUR_STEPS;

  return TOUR_STEPS.filter((step) => {
    if (step.hideOnMobile) return false;
    if (step.mergeOnMobile) return false;
    return true;
  });
}

/**
 * Authenticated combat tour provider.
 *
 * Similar to DashboardTourProvider but reuses the combat TOUR_STEPS.
 * Unlike the guest TourProvider, this does NOT interact with any combat store
 * (no auto-adding monsters, no auto-starting combat). It purely walks through
 * the UI elements informatively, since the DM is already in a real session.
 *
 * Persistence: writes `combat_tour_completed = true` to Supabase `user_onboarding`.
 */
export function AuthCombatTourProvider({
  shouldAutoStart,
  delayMs = 1500,
}: AuthCombatTourProviderProps) {
  const {
    currentStep,
    isActive,
    startTour,
    goToStep,
    skipTour,
    completeTour,
  } = useAuthCombatTourStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Memoize effective steps
  const effectiveSteps = useMemo(() => getEffectiveSteps(), [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start tour after delay, polling for content readiness
  useEffect(() => {
    setMounted(true);
    if (!shouldAutoStart) return;

    // DB says tour is pending — reset localStorage if it got out of sync
    const { isCompleted } = useAuthCombatTourStore.getState();
    if (isCompleted) {
      useAuthCombatTourStore.getState().resetTour();
    }

    // Use a combat-specific element as proxy for "page content is ready"
    const CONTENT_READY_SELECTOR = '[data-tour-id="monster-search"], [data-tour-id="combatant-list"]';
    const MAX_EXTRA_WAIT_MS = 8000;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const tryStart = () => {
      const { isCompleted: done, isActive: active } = useAuthCombatTourStore.getState();
      if (done || active) return true;
      if (document.querySelector(CONTENT_READY_SELECTOR)) {
        startTour();
        return true;
      }
      return false;
    };

    const timer = setTimeout(() => {
      if (!tryStart()) {
        const pollStart = Date.now();
        pollInterval = setInterval(() => {
          if (tryStart()) {
            clearInterval(pollInterval!);
            pollInterval = null;
          } else if (Date.now() - pollStart >= MAX_EXTRA_WAIT_MS) {
            clearInterval(pollInterval!);
            pollInterval = null;
            const { isCompleted: done, isActive: active } = useAuthCombatTourStore.getState();
            if (!done && !active) startTour();
          }
        }, 200);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist tour completion to Supabase
  async function persistTourCompleted() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_onboarding")
        .update({ combat_tour_completed: true })
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
      // Auto-skip steps whose DOM target doesn't exist — find next valid step
      let nextValid = currentStep + 1;
      while (nextValid < effectiveSteps.length) {
        const nextStep = effectiveSteps[nextValid];
        if (nextStep.modal || document.querySelector(nextStep.targetSelector)) break;
        nextValid++;
      }
      if (nextValid < effectiveSteps.length) {
        goToStep(nextValid);
      } else {
        setTargetRect(null);
      }
    }
  }, [isActive, currentStep, effectiveSteps, goToStep]);

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
    trackEvent("onboarding:combat_tour_skipped", {
      skipped_at_step: currentStep,
    });
  }, [skipTour, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = useCallback(() => {
    completeTour();
    persistTourCompleted();
    trackEvent("onboarding:combat_tour_completed", {
      steps_viewed: currentStep + 1,
    });
  }, [completeTour, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

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
        translationNamespace="tour"
        secondaryCTA={false}
      />
    </>
  );
}
