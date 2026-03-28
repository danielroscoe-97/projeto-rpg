import { FIRE_GRADIENT, getFireStepColor } from "@/lib/design/rpg-tokens";
import { cn } from "@/lib/utils";

interface QuestPathProps {
  steps: number;
  currentStep?: number;
  className?: string;
}

export function QuestPath({ steps, currentStep, className }: QuestPathProps) {
  const width = 1000;
  const height = 56;
  const pad = 125; // padding from edges (matches existing SVG)
  const usable = width - pad * 2;

  const positions = Array.from({ length: steps }, (_, i) =>
    pad + (steps <= 1 ? 0 : (i * usable) / (steps - 1)),
  );

  return (
    <svg
      className={cn("w-full h-14 pointer-events-none", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fire-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0.6" />
          <stop offset="25%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.7" />
          <stop offset="50%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.8" />
          <stop offset="75%" stopColor={FIRE_GRADIENT.ember} stopOpacity="0.7" />
          <stop offset="100%" stopColor={FIRE_GRADIENT.gold} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Static faint background line */}
      <line
        x1={positions[0]}
        y1={height / 2}
        x2={positions[positions.length - 1]}
        y2={height / 2}
        stroke="rgba(212,168,83,0.12)"
        strokeWidth="2"
      />

      {/* Fire gradient line */}
      <line
        x1={positions[0]}
        y1={height / 2}
        x2={positions[positions.length - 1]}
        y2={height / 2}
        stroke="url(#fire-path-grad)"
        strokeWidth="2"
        strokeDasharray="14 14"
        className="animate-flow-dash"
      />

      {/* Step dots */}
      {positions.map((x, i) => {
        const color = getFireStepColor(i + 1, steps);
        const isActive = currentStep !== undefined && i + 1 <= currentStep;
        return (
          <circle
            key={i}
            cx={x}
            cy={height / 2}
            r={isActive ? 5 : 3.5}
            fill={color}
            opacity={isActive ? 0.9 : 0.5}
          />
        );
      })}
    </svg>
  );
}
