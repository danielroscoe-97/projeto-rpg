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

      {/* === Pixel Fire Sprite traveling along the path === */}
      <g className="motion-reduce:hidden" shapeRendering="crispEdges">
        {/* Soft glow behind the fire */}
        <circle r="20" fill="url(#firebolt-glow)" filter="url(#firebolt-blur)" opacity="0.6">
          <animateMotion dur="3.5s" repeatCount="indefinite" path={`M${pathStart},${cy} L${pathEnd},${cy}`} />
        </circle>

        {/* Trailing ember sparks */}
        {[
          { dx: -30, dy: -3, s: 2.5, c: "#7f1d1d", o: 0.4, d: 0 },
          { dx: -24, dy: 4, s: 2, c: "#991b1b", o: 0.5, d: 0.08 },
          { dx: -18, dy: -5, s: 2.5, c: "#c2410c", o: 0.5, d: 0.04 },
          { dx: -13, dy: 3, s: 2, c: "#ea580c", o: 0.6, d: 0.12 },
        ].map((e, i) => (
          <rect key={`t-${i}`} width={e.s} height={e.s} fill={e.c} opacity={e.o}>
            <animateMotion dur="3.5s" repeatCount="indefinite" path={`M${pathStart + e.dx},${cy + e.dy} L${pathEnd + e.dx},${cy + e.dy}`} begin={`${e.d}s`} />
            <animate attributeName="opacity" values={`${e.o};${e.o * 0.2};${e.o}`} dur="0.5s" repeatCount="indefinite" />
          </rect>
        ))}

        {/* Pixel fire sprite — built from pixel grid (each rect = 1 pixel)
            Simulates a 16-bit flame shape:
                 ██              (tip — bright yellow)
                ████             (upper — yellow/amber)
               ██████            (mid — orange)
                ████             (base — dark orange/red)
                 ██              (root — dark red)
        */}
        <g>
          <animateMotion dur="3.5s" repeatCount="indefinite" path={`M${pathStart},${cy} L${pathEnd},${cy}`} />

          {/* Frame 1 — shown 0-50% of flicker cycle */}
          <g>
            <animate attributeName="opacity" values="1;1;0;0;1" dur="0.3s" repeatCount="indefinite" />
            {/* Tip */}
            <rect x="-1.5" y="-16" width="3" height="3" fill="#fef08a" />
            {/* Upper flame */}
            <rect x="-4.5" y="-13" width="3" height="3" fill="#fbbf24" />
            <rect x="-1.5" y="-13" width="3" height="3" fill="#fde047" />
            <rect x="1.5" y="-13" width="3" height="3" fill="#fbbf24" />
            {/* Mid flame */}
            <rect x="-6" y="-10" width="3" height="3" fill="#f59e0b" />
            <rect x="-3" y="-10" width="3" height="3" fill="#fbbf24" />
            <rect x="0" y="-10" width="3" height="3" fill="#f59e0b" />
            <rect x="3" y="-10" width="3" height="3" fill="#ea580c" />
            {/* Lower flame */}
            <rect x="-4.5" y="-7" width="3" height="3" fill="#ea580c" />
            <rect x="-1.5" y="-7" width="3" height="3" fill="#f59e0b" />
            <rect x="1.5" y="-7" width="3" height="3" fill="#ea580c" />
            {/* Base */}
            <rect x="-3" y="-4" width="3" height="3" fill="#c2410c" />
            <rect x="0" y="-4" width="3" height="3" fill="#dc2626" />
          </g>

          {/* Frame 2 — shown 50-100% of flicker cycle (slightly different shape) */}
          <g>
            <animate attributeName="opacity" values="0;0;1;1;0" dur="0.3s" repeatCount="indefinite" />
            {/* Tip (offset) */}
            <rect x="0" y="-17" width="3" height="3" fill="#fef9c3" />
            {/* Upper flame */}
            <rect x="-3" y="-14" width="3" height="3" fill="#fde047" />
            <rect x="0" y="-14" width="3" height="3" fill="#fbbf24" />
            <rect x="3" y="-14" width="3" height="3" fill="#fde047" />
            {/* Mid flame */}
            <rect x="-4.5" y="-11" width="3" height="3" fill="#fbbf24" />
            <rect x="-1.5" y="-11" width="3" height="3" fill="#f59e0b" />
            <rect x="1.5" y="-11" width="3" height="3" fill="#fbbf24" />
            <rect x="4.5" y="-11" width="3" height="3" fill="#ea580c" />
            {/* Lower flame */}
            <rect x="-3" y="-8" width="3" height="3" fill="#ea580c" />
            <rect x="0" y="-8" width="3" height="3" fill="#f59e0b" />
            <rect x="3" y="-8" width="3" height="3" fill="#dc2626" />
            {/* Base */}
            <rect x="-1.5" y="-5" width="3" height="3" fill="#c2410c" />
            <rect x="1.5" y="-5" width="3" height="3" fill="#991b1b" />
          </g>
        </g>
      </g>

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
