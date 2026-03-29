"use client";

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function TourProgress({ currentStep, totalSteps }: TourProgressProps) {
  const compact = totalSteps > 8;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
        {currentStep + 1}/{totalSteps}
      </span>
      <div className={`flex items-center ${compact ? "gap-0.5" : "gap-1"}`} aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              compact ? "h-0.5" : "h-1"
            } ${
              i === currentStep
                ? `${compact ? "w-2" : "w-3"} bg-gold`
                : i < currentStep
                  ? `${compact ? "w-1" : "w-1.5"} bg-gold/40`
                  : `${compact ? "w-1" : "w-1.5"} bg-white/20`
            }`}
          />
        ))}
      </div>
    </div>
  );
}
