"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlayerHqTourStore } from "@/lib/stores/player-hq-tour-store";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { PLAYER_HQ_TOUR_STEPS } from "./player-hq-tour-steps";

interface PlayerHqTourProviderProps {
  /** Whether to auto-start (player_hq_tour_completed === false) */
  shouldAutoStart: boolean;
}

export function PlayerHqTourProvider({ shouldAutoStart }: PlayerHqTourProviderProps) {
  const {
    currentStep,
    isActive,
    startTour,
    goToStep,
    skipTour,
    completeTour,
  } = usePlayerHqTourStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const steps = PLAYER_HQ_TOUR_STEPS;

  // Auto-start tour after a short delay
  useEffect(() => {
    setMounted(true);
    if (!shouldAutoStart) return;

    const { isCompleted } = usePlayerHqTourStore.getState();
    if (isCompleted) {
      usePlayerHqTourStore.getState().resetTour();
    }

    const timer = setTimeout(() => {
      const { isCompleted: done, isActive: active } = usePlayerHqTourStore.getState();
      if (!done && !active) startTour();
    }, 800);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist tour completion to DB
  async function persistTourCompleted() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_onboarding")
        .update({ player_hq_tour_completed: true })
        .eq("user_id", user.id);
    } catch {
      // best-effort
    }
  }

  // Update target rect on step change
  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;
    const step = steps[currentStep];

    // Mobile override: force bottom position
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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
      // Auto-skip missing targets — find next valid step in one pass
      let nextValid = currentStep + 1;
      while (nextValid < steps.length) {
        if (document.querySelector(steps[nextValid].targetSelector)) break;
        nextValid++;
      }
      if (nextValid < steps.length) {
        goToStep(nextValid);
      } else {
        setTargetRect(null);
      }
    }
  }, [isActive, currentStep, steps, goToStep]);

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
    if (next >= steps.length) {
      handleComplete();
    } else {
      goToStep(next);
    }
  }, [currentStep, steps.length, goToStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleSkip = useCallback(() => {
    skipTour();
    persistTourCompleted();
    trackEvent("onboarding:hq_tour_skipped", { skipped_at_step: currentStep });
  }, [skipTour, currentStep]);

  const handleComplete = useCallback(() => {
    completeTour();
    persistTourCompleted();
    trackEvent("onboarding:hq_tour_completed", { steps_viewed: currentStep + 1 });
  }, [completeTour, currentStep]);

  if (!mounted || !isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];

  // Mobile: override position to "bottom" for all steps
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const effectiveStep = isMobile ? { ...step, position: "bottom" as const } : step;

  return (
    <>
      <TourOverlay
        isActive={isActive}
        targetRect={targetRect}
        allowInteraction={false}
        onOverlayClick={() => {}}
      />
      <TourTooltip
        step={effectiveStep}
        stepIndex={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        onComplete={handleComplete}
        translationNamespace="player_hq_tour"
      />
    </>
  );
}
