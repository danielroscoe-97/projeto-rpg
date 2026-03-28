"use client";

import { TOUR_STEPS } from "./tour-steps";

interface TourProgressProps {
  currentStep: number;
}

export function TourProgress({ currentStep }: TourProgressProps) {
  const total = TOUR_STEPS.length;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep + 1} of ${total}`}>
      {TOUR_STEPS.map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
            i === currentStep
              ? "bg-gold"
              : i < currentStep
                ? "bg-gold/40"
                : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}
