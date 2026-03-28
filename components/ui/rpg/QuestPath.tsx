import { getFireStepColor } from "@/lib/design/rpg-tokens";
import { cn } from "@/lib/utils";

interface QuestPathProps {
  steps: number;
  currentStep?: number;
  className?: string;
}

/**
 * Step dots for the "Como Funciona" section.
 * The visual trail (dashed path, embers, firebolt) is handled by FireTrail.
 */
export function QuestPath({ steps, currentStep, className }: QuestPathProps) {
  const width = 1000;
  const height = 90;
  const pad = 125;
  const usable = width - pad * 2;
  const midY = height / 2;
  const waveAmp = 12;

  const stepPoints = Array.from({ length: steps }, (_, i) => ({
    x: pad + (steps <= 1 ? 0 : (i * usable) / (steps - 1)),
    y: midY + (i % 2 === 0 ? -waveAmp : waveAmp),
  }));

  return (
    <svg
      className={cn("w-full pointer-events-none", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      style={{ height: 90 }}
    >
      {stepPoints.map((pt, i) => {
        const color = getFireStepColor(i + 1, steps);
        const isActive = currentStep !== undefined && i + 1 <= currentStep;
        return (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={isActive ? 5 : 3.5}
            fill={color}
            opacity={isActive ? 0.9 : 0.5}
          />
        );
      })}
    </svg>
  );
}
