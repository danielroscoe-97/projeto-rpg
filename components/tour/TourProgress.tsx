"use client";

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function TourProgress({ currentStep, totalSteps }: TourProgressProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground/60 font-mono tabular-nums">
        {currentStep + 1}/{totalSteps}
      </span>
      <div className="flex items-center gap-1" aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-200 ${
              i === currentStep
                ? "w-3 bg-gold"
                : i < currentStep
                  ? "w-1.5 bg-gold/40"
                  : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
