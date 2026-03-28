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
  const pad = 125;
  const usable = width - pad * 2;
  const cy = height / 2;

  const positions = Array.from({ length: steps }, (_, i) =>
    pad + (steps <= 1 ? 0 : (i * usable) / (steps - 1)),
  );

  const pathStart = positions[0];
  const pathEnd = positions[positions.length - 1];

  return (
    <svg
      className={cn("w-full h-14 pointer-events-none", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        {/* Fire gradient for the path line */}
        <linearGradient id="fire-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0.6" />
          <stop offset="25%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.7" />
          <stop offset="50%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.8" />
          <stop offset="75%" stopColor={FIRE_GRADIENT.ember} stopOpacity="0.7" />
          <stop offset="100%" stopColor={FIRE_GRADIENT.gold} stopOpacity="0.6" />
        </linearGradient>

        {/* Firebolt particle glow */}
        <radialGradient id="firebolt-glow">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
          <stop offset="30%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.8" />
          <stop offset="60%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.4" />
          <stop offset="100%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0" />
        </radialGradient>

        {/* Firebolt trail gradient */}
        <linearGradient id="firebolt-trail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0" />
          <stop offset="40%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.3" />
          <stop offset="70%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
        </linearGradient>

        {/* Filter for extra glow on the firebolt */}
        <filter id="firebolt-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Static faint background line */}
      <line
        x1={pathStart}
        y1={cy}
        x2={pathEnd}
        y2={cy}
        stroke="rgba(212,168,83,0.10)"
        strokeWidth="2"
      />

      {/* Fire gradient line (dashed, flowing) */}
      <line
        x1={pathStart}
        y1={cy}
        x2={pathEnd}
        y2={cy}
        stroke="url(#fire-path-grad)"
        strokeWidth="2"
        strokeDasharray="14 14"
        className="animate-flow-dash motion-reduce:animate-none"
      />

      {/* === Firebolt particle traveling along the path === */}
      {/* Outer glow (large, blurred) */}
      <circle r="18" fill="url(#firebolt-glow)" filter="url(#firebolt-blur)" className="motion-reduce:hidden">
        <animateMotion
          dur="3.5s"
          repeatCount="indefinite"
          path={`M${pathStart},${cy} L${pathEnd},${cy}`}
        />
      </circle>

      {/* Fire trail behind the bolt */}
      <line
        x1="0" y1="0" x2="60" y2="0"
        stroke="url(#firebolt-trail)"
        strokeWidth="3"
        strokeLinecap="round"
        className="motion-reduce:hidden"
      >
        <animateMotion
          dur="3.5s"
          repeatCount="indefinite"
          path={`M${pathStart - 60},${cy} L${pathEnd - 60},${cy}`}
          rotate="auto"
        />
      </line>

      {/* Core bright particle */}
      <circle r="4" fill="#fbbf24" opacity="0.95" className="motion-reduce:hidden">
        <animateMotion
          dur="3.5s"
          repeatCount="indefinite"
          path={`M${pathStart},${cy} L${pathEnd},${cy}`}
        />
      </circle>

      {/* Inner white-hot core */}
      <circle r="2" fill="white" opacity="0.8" className="motion-reduce:hidden">
        <animateMotion
          dur="3.5s"
          repeatCount="indefinite"
          path={`M${pathStart},${cy} L${pathEnd},${cy}`}
        />
      </circle>

      {/* Step dots */}
      {positions.map((x, i) => {
        const color = getFireStepColor(i + 1, steps);
        const isActive = currentStep !== undefined && i + 1 <= currentStep;
        return (
          <circle
            key={i}
            cx={x}
            cy={cy}
            r={isActive ? 5 : 3.5}
            fill={color}
            opacity={isActive ? 0.9 : 0.5}
          />
        );
      })}
    </svg>
  );
}
