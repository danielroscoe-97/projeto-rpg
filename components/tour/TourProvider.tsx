"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTourStore } from "@/lib/stores/tour-store";
import { useGuestCombatStore, type GuestCombatPhase } from "@/lib/stores/guest-combat-store";
import type { Combatant } from "@/lib/types/combat";
import { TourOverlay } from "./TourOverlay";
import { TourTooltip } from "./TourTooltip";
import { TourHelpButton } from "./TourHelpButton";
import { TOUR_STEPS } from "./tour-steps";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/**
 * Returns the effective steps list, filtering out mobile-hidden and
 * merging mobile-merged steps.
 */
function getEffectiveSteps() {
  const mobile = isMobileViewport();
  if (!mobile) return TOUR_STEPS;

  return TOUR_STEPS.filter((step) => {
    if (step.hideOnMobile) return false;
    if (step.mergeOnMobile) return false;
    return true;
  });
}

/**
 * Maps an effective step index back to the canonical TOUR_STEPS index.
 */
function toCanonicalIndex(effectiveIndex: number): number {
  const effective = getEffectiveSteps();
  if (effectiveIndex >= effective.length) return TOUR_STEPS.length;
  const step = effective[effectiveIndex];
  return TOUR_STEPS.findIndex((s) => s.id === step.id);
}

/**
 * Determines if a step should be skipped because the user already completed
 * its condition before the tour reached it.
 * NOTE: roll-initiative is never skipped — we always show it as info.
 */
function shouldSkipStep(stepId: string): boolean {
  const state = useGuestCombatStore.getState();
  switch (stepId) {
    case "monster-result":
      return state.combatants.length > 0;
    case "start-combat":
      return state.phase === "combat";
    case "combat-controls":
    case "hp-adjust":
    case "next-turn":
    case "keyboard-tip":
    case "tour-complete":
    case "roll-initiative":
      return false;
    default:
      return false;
  }
}

function findNextValidStep(fromStep: number, steps: typeof TOUR_STEPS): number {
  let step = fromStep;
  while (step < steps.length && shouldSkipStep(steps[step].id)) {
    step++;
  }
  return step;
}

export function TourProvider() {
  const { currentStep, isActive, isCompleted, startTour, goToStep, skipTour, completeTour } =
    useTourStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const prevCombatantsLengthRef = useRef<number>(0);
  const phaseTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancingRef = useRef(false);

  // Memoize effective steps — only recompute when mounted changes (avoids infinite re-render)
  const effectiveSteps = useMemo(() => getEffectiveSteps(), [mounted]);

  // Track initial combatants count for interactive step detection
  useEffect(() => {
    prevCombatantsLengthRef.current = useGuestCombatStore.getState().combatants.length;
  }, [currentStep]);

  // Auto-start tour on first visit
  useEffect(() => {
    setMounted(true);
    if (!isCompleted && !isActive) {
      const timer = setTimeout(() => {
        startTour();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide guest banner while tour is active
  useEffect(() => {
    if (!mounted) return;
    const banner = document.querySelector<HTMLElement>('[data-testid="guest-banner"]');
    if (!banner) return;

    if (isActive) {
      banner.style.display = "none";
    } else {
      banner.style.removeProperty("display");
    }

    return () => {
      banner.style.removeProperty("display");
    };
  }, [isActive, mounted]);

  // Smart advance: skip steps whose conditions are already met
  const smartAdvance = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const next = findNextValidStep(currentStep + 1, effectiveSteps);
    if (next >= effectiveSteps.length) {
      completeTour();
    } else {
      goToStep(next);
    }

    setTimeout(() => {
      advancingRef.current = false;
    }, 100);
  }, [currentStep, effectiveSteps, goToStep, completeTour]);

  // On step change, check if current step should be skipped
  useEffect(() => {
    if (!isActive || currentStep >= effectiveSteps.length) return;
    if (shouldSkipStep(effectiveSteps[currentStep].id)) {
      const timer = setTimeout(() => smartAdvance(), 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep, effectiveSteps, smartAdvance]);

  // Elevate target element above overlay for interactive steps
  const prevTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Restore previous target's styles
    if (prevTargetRef.current) {
      prevTargetRef.current.style.removeProperty("position");
      prevTargetRef.current.style.removeProperty("z-index");
      prevTargetRef.current = null;
    }

    if (!isActive || currentStep >= effectiveSteps.length) return;

    const step = effectiveSteps[currentStep];
    if (step.type !== "interactive") return;

    const target = document.querySelector<HTMLElement>(step.targetSelector);
    if (!target) return;

    // Only set position if not already positioned
    const computed = getComputedStyle(target);
    if (computed.position === "static") {
      target.style.position = "relative";
    }
    target.style.zIndex = "10001";
    prevTargetRef.current = target;

    return () => {
      if (prevTargetRef.current) {
        prevTargetRef.current.style.removeProperty("position");
        prevTargetRef.current.style.removeProperty("z-index");
        prevTargetRef.current = null;
      }
    };
  }, [isActive, currentStep, effectiveSteps]);

  // Calculate target position
  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= effectiveSteps.length) return;

    const step = effectiveSteps[currentStep];

    // Modal steps don't need precise target positioning
    if (step.modal) {
      // Still need a rect for the overlay spotlight — use the target if available
      const target = document.querySelector(step.targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      } else {
        // Provide a dummy rect for modals
        setTargetRect(new DOMRect(0, 0, 0, 0));
      }
      return;
    }

    const target = document.querySelector(step.targetSelector);

    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!isInViewport) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          setTargetRect(target.getBoundingClientRect());
        }, 400);
      }
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep, effectiveSteps]);

  // Update rect on step change, resize, scroll
  useEffect(() => {
    if (!isActive) return;

    updateTargetRect();

    const handleUpdate = () => updateTargetRect();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    const pollInterval = setInterval(handleUpdate, 500);
    const pollTimeout = setTimeout(() => clearInterval(pollInterval), 5000);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      clearInterval(pollInterval);
      clearTimeout(pollTimeout);
    };
  }, [isActive, currentStep, updateTargetRect]);

  // Watch guest-combat-store for interactive step conditions
  useEffect(() => {
    if (!isActive || currentStep >= effectiveSteps.length) return;

    const step = effectiveSteps[currentStep];
    if (step.type !== "interactive") return;

    const unsub = useGuestCombatStore.subscribe((state: { combatants: Combatant[]; phase: GuestCombatPhase }, prevState: { combatants: Combatant[]; phase: GuestCombatPhase }) => {
      switch (step.id) {
        case "monster-search": {
          break;
        }
        case "monster-result": {
          if (state.combatants.length > prevCombatantsLengthRef.current) {
            smartAdvance();
            unsub();
          }
          break;
        }
        case "roll-initiative": {
          if (
            state.combatants.length > 0 &&
            state.combatants.every((c) => c.initiative !== null)
          ) {
            setTimeout(() => smartAdvance(), 500);
            unsub();
          }
          break;
        }
        case "start-combat": {
          if (state.phase === "combat" && prevState.phase !== "combat") {
            if (phaseTransitionTimer.current) clearTimeout(phaseTransitionTimer.current);
            phaseTransitionTimer.current = setTimeout(() => smartAdvance(), 800);
            unsub();
          }
          break;
        }
      }
    });

    // For monster-search step, poll the DOM input value
    let inputPollInterval: ReturnType<typeof setInterval> | undefined;
    if (step.id === "monster-search") {
      inputPollInterval = setInterval(() => {
        const searchInput = document.querySelector(
          '[data-tour-id="monster-search"] input'
        ) as HTMLInputElement;
        if (searchInput && searchInput.value.length >= 3) {
          clearInterval(inputPollInterval);
          setTimeout(() => smartAdvance(), 600);
          unsub();
        }
      }, 300);
    }

    return () => {
      unsub();
      if (inputPollInterval) clearInterval(inputPollInterval);
      if (phaseTransitionTimer.current) clearTimeout(phaseTransitionTimer.current);
    };
  }, [isActive, currentStep, effectiveSteps, smartAdvance]);

  const handleNext = useCallback(() => {
    smartAdvance();
  }, [smartAdvance]);

  // Clean up phase transition timer on unmount
  useEffect(() => {
    return () => {
      if (phaseTransitionTimer.current) clearTimeout(phaseTransitionTimer.current);
    };
  }, []);

  if (!mounted) return null;

  // Always render help button; conditionally render tour UI
  if (!isActive || currentStep >= effectiveSteps.length) {
    return <TourHelpButton />;
  }

  const step = effectiveSteps[currentStep];
  const isInteractive = step.type === "interactive";
  const isModal = step.modal === true;

  return (
    <>
      <TourOverlay
        isActive={isActive}
        targetRect={isModal ? null : targetRect}
        allowInteraction={isInteractive}
        dimOnly={isModal}
      />
      <TourTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={effectiveSteps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onSkip={skipTour}
        onComplete={completeTour}
      />
    </>
  );
}
