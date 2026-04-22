"use client";

/**
 * DmTourProvider — Epic 04 Story 04-F (Player-as-DM Upsell, Área 3).
 *
 * Auto-starts the DM-onboarding tour on `/app/dashboard` when:
 *   - user_onboarding.dm_tour_completed === false (DB authoritative, per-account)
 *   - AND Zustand's local `isCompleted` is false (per-device)
 *
 * Completion writes back to both localStorage (via the store's persist
 * middleware) AND user_onboarding.dm_tour_completed. The DB write is the
 * cross-device source of truth; the localStorage write is the fast path
 * for the same device.
 *
 * Shape mirrors PlayerHqTourProvider — same TourOverlay + TourTooltip
 * widgets, same auto-skip-missing-target behaviour, same mobile
 * position override. Diverges only in: (a) store (useDmTourStore) and
 * (b) the persisted column name (dm_tour_completed).
 *
 * D9 / Test 10 — this provider does not touch session_token_id or
 * heartbeat state at any point. Role flip broadcast is handled by the
 * wizard; the tour is strictly presentational.
 */

import { useEffect, useState, useCallback } from "react";
import { useDmTourStore } from "@/lib/stores/dm-tour-store";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics/track";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { DM_TOUR_STEPS } from "./dm-tour-steps";

interface DmTourProviderProps {
  /** Whether the DB row says the tour hasn't been completed. The provider
   *  gates auto-start on this AND the persisted store's isCompleted. */
  shouldAutoStart: boolean;
}

export function DmTourProvider({ shouldAutoStart }: DmTourProviderProps) {
  const { currentStep, isActive, startTour, goToStep, skipTour, completeTour } =
    useDmTourStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const steps = DM_TOUR_STEPS;

  useEffect(() => {
    setMounted(true);
    if (!shouldAutoStart) return;

    const { isCompleted } = useDmTourStore.getState();
    if (isCompleted) {
      // DB says "not done" but local says "done" — user hit a new device
      // or cleared storage. Reset local so the tour runs.
      useDmTourStore.getState().resetTour();
    }

    const timer = setTimeout(() => {
      const { isCompleted: done, isActive: active } =
        useDmTourStore.getState();
      if (!done && !active) startTour();
    }, 800);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function persistTourCompleted() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_onboarding")
        .update({ dm_tour_completed: true })
        .eq("user_id", user.id);
    } catch {
      /* best-effort — local store still remembers completion */
    }
  }

  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= steps.length) return;
    const step = steps[currentStep];
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
      // Auto-skip missing targets — identical behaviour to PlayerHqTourProvider.
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
    trackEvent("dm_upsell:tour_skipped", { skipped_at_step: currentStep });
  }, [skipTour, currentStep]);

  const handleComplete = useCallback(() => {
    completeTour();
    persistTourCompleted();
    trackEvent("dm_upsell:tour_completed", { steps_viewed: currentStep + 1 });
  }, [completeTour, currentStep]);

  if (!mounted || !isActive || currentStep >= steps.length) return null;

  const step = steps[currentStep];

  // Mobile: override position to "bottom" for consistent tooltip placement.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const effectiveStep = isMobile
    ? { ...step, position: "bottom" as const }
    : step;

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
        translationNamespace="dmUpsell"
      />
    </>
  );
}
