"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTourStore } from "@/lib/stores/tour-store";
import { useGuestCombatStore } from "@/lib/stores/guest-combat-store";
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

export function TourProvider() {
  const { currentStep, isActive, isCompleted, startTour, goToStep, skipTour, completeTour } =
    useTourStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pulseTarget, setPulseTarget] = useState(false);
  const advancingRef = useRef(false);

  // Memoize effective steps — only recompute when mounted changes (avoids infinite re-render)
  const effectiveSteps = useMemo(() => getEffectiveSteps(), [mounted]);

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

  // Smart advance: go to next step, handling phase transitions
  const smartAdvance = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const next = currentStep + 1;
    if (next >= effectiveSteps.length) {
      completeTour();
      advancingRef.current = false;
      return;
    }

    const currentStepConfig = effectiveSteps[currentStep];
    const nextStepConfig = effectiveSteps[next];

    // Phase transition: setup → combat — auto-start combat so DOM updates
    if (currentStepConfig?.phase === "setup" && nextStepConfig?.phase === "combat") {
      const { startCombat, combatants } = useGuestCombatStore.getState();
      if (combatants.length === 0) {
        // Can't enter combat with no combatants — stay on current step
        advancingRef.current = false;
        return;
      }
      try {
        startCombat();
      } catch {
        advancingRef.current = false;
        return;
      }
      // Wait for DOM to re-render with combat view elements
      setTimeout(() => {
        goToStep(next);
        advancingRef.current = false;
      }, 600);
      return;
    }

    goToStep(next);
    advancingRef.current = false;
  }, [currentStep, effectiveSteps, goToStep, completeTour]);

  // Smart go back: go to previous step, handling phase transitions
  const smartGoBack = useCallback(() => {
    if (advancingRef.current) return;
    if (currentStep <= 0) return;
    advancingRef.current = true;

    const prev = currentStep - 1;
    const currentStepConfig = effectiveSteps[currentStep];
    const prevStepConfig = effectiveSteps[prev];

    // Phase transition: combat → setup — revert to setup view
    if (currentStepConfig?.phase === "combat" && prevStepConfig?.phase === "setup") {
      try {
        useGuestCombatStore.getState().resetCombat();
      } catch {
        advancingRef.current = false;
        return;
      }
      setTimeout(() => {
        goToStep(prev);
        advancingRef.current = false;
      }, 600);
      return;
    }

    goToStep(prev);
    advancingRef.current = false;
  }, [currentStep, effectiveSteps, goToStep]);

  // Calculate target position
  const updateTargetRect = useCallback(() => {
    if (!isActive || currentStep >= effectiveSteps.length) return;

    const step = effectiveSteps[currentStep];

    // Modal steps don't need precise target positioning
    if (step.modal) {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      } else {
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

  // Tour step actions — trigger side effects when entering specific steps
  useEffect(() => {
    if (!isActive || currentStep >= effectiveSteps.length) return;

    const step = effectiveSteps[currentStep];

    // Auto-search "goblin" when entering the monster-search step
    if (step.id === "monster-search") {
      const timer = setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          '[data-tour-id="monster-search"] input[type="text"]'
        );
        if (input) {
          // Use native setter to trigger React's onChange
          const nativeSetter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype, "value"
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(input, "goblin");
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }, 400);
      return () => clearTimeout(timer);
    }

    // Auto-add Goblin when entering the import-hint step (after "Add Monster" step)
    // This ensures combatants exist for roll-initiative and start-combat steps
    if (step.id === "import-hint") {
      const { combatants, addCombatant } = useGuestCombatStore.getState();
      if (combatants.length === 0) {
        addCombatant({
          name: "Goblin",
          current_hp: 7,
          max_hp: 7,
          temp_hp: 0,
          ac: 15,
          spell_save_dc: null,
          initiative: null,
          initiative_order: null,
          conditions: [],
          ruleset_version: "2014",
          is_defeated: false,
          is_hidden: false,
          is_player: false,
          monster_id: "goblin-mm",
          token_url: "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/tokens/MM/Goblin.webp",
        });
      }
    }
  }, [isActive, currentStep, effectiveSteps]);

  // Update rect on step change, resize, scroll
  useEffect(() => {
    if (!isActive) return;

    // Reset pulse on step change
    setPulseTarget(false);

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

  // Handle overlay click: pulse the target to draw attention
  const handleOverlayClick = useCallback(() => {
    setPulseTarget(true);
    // Also scroll target into view
    if (currentStep < effectiveSteps.length) {
      const step = effectiveSteps[currentStep];
      const target = document.querySelector<HTMLElement>(step.targetSelector);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    // Remove pulse after animation
    setTimeout(() => setPulseTarget(false), 1000);
  }, [currentStep, effectiveSteps]);

  const handleNext = useCallback(() => {
    smartAdvance();
  }, [smartAdvance]);

  const handleBack = useCallback(() => {
    smartGoBack();
  }, [smartGoBack]);

  // Skip tour and reset combat state only if combat is active
  const handleSkip = useCallback(() => {
    skipTour();
    const { phase } = useGuestCombatStore.getState();
    if (phase === "combat") {
      useGuestCombatStore.getState().resetCombat();
    }
  }, [skipTour]);

  // Complete tour and reset combat state for a clean start
  const handleComplete = useCallback(() => {
    completeTour();
    useGuestCombatStore.getState().resetCombat();
  }, [completeTour]);

  if (!mounted) return null;

  // Always render help button; conditionally render tour UI
  if (!isActive || currentStep >= effectiveSteps.length) {
    return <TourHelpButton />;
  }

  const step = effectiveSteps[currentStep];
  const isModal = step.modal === true;

  return (
    <>
      <TourOverlay
        isActive={isActive}
        targetRect={isModal ? null : targetRect}
        allowInteraction={false}
        dimOnly={isModal}
        onOverlayClick={handleOverlayClick}
        pulseTarget={pulseTarget}
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
