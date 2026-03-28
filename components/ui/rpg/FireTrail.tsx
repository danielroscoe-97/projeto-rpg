import { FIRE_GRADIENT, getFireStepColor } from "@/lib/design/rpg-tokens";
import { cn } from "@/lib/utils";

interface FireTrailProps {
  className?: string;
}

/**
 * Full-width fire trail that spans edge-to-edge across the "Como Funciona" section.
 * A pixel fire sprite travels in a continuous loop along a wavy dashed path.
 * Trailing embers follow the sprite; static embers flicker along the trail.
 * Fades to transparent at both edges via SVG mask.
 */
export function FireTrail({ className }: FireTrailProps) {
  const width = 2000;
  const height = 80;
  const midY = height / 2;
  const waveAmp = 14;

  // Wavy path spanning full width with smooth cubic bezier curves
  const segments = 8;
  const points = Array.from({ length: segments + 1 }, (_, i) => ({
    x: (i / segments) * width,
    y: midY + (i % 2 === 0 ? -waveAmp : waveAmp),
  }));

  let curvePath = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpOffset = (p1.x - p0.x) * 0.4;
    curvePath += ` C${p0.x + cpOffset},${p0.y} ${p1.x - cpOffset},${p1.y} ${p1.x},${p1.y}`;
  }

  const loopDur = "8s";

  // Static embers scattered along the path (~28 particles)
  const staticEmbers = Array.from({ length: 28 }, (_, i) => {
    const t = (i + 0.5) / 28;
    const cx = t * width;
    // Approximate wave Y at this position
    const segFrac = t * segments;
    const segIdx = Math.floor(segFrac);
    const segT = segFrac - segIdx;
    const y0 = midY + (segIdx % 2 === 0 ? -waveAmp : waveAmp);
    const y1 = midY + ((segIdx + 1) % 2 === 0 ? -waveAmp : waveAmp);
    const baseY = y0 + (y1 - y0) * segT;
    // Deterministic pseudo-random offsets using index
    const offsetY = ((i * 7 + 3) % 11 - 5) * 1.2;
    const size = 1.5 + (i % 3) * 0.5;
    const opacity = 0.15 + (i % 5) * 0.04;
    const flickerDur = 1.5 + (i % 4) * 0.4;

    return { cx, cy: baseY + offsetY, size, opacity, flickerDur, t };
  });

  // Trailing embers behind the sprite (7 particles)
  const trailingEmbers = [
    { dx: -34, dy: -6, s: 2.5, c: "#7f1d1d", o: 0.3 },
    { dx: -26, dy: 5, s: 2, c: "#991b1b", o: 0.35 },
    { dx: -20, dy: -4, s: 2.5, c: "#991b1b", o: 0.4 },
    { dx: -15, dy: 6, s: 2, c: "#c2410c", o: 0.45 },
    { dx: -10, dy: -5, s: 2.5, c: "#ea580c", o: 0.5 },
    { dx: -6, dy: 4, s: 2, c: "#f59e0b", o: 0.55 },
    { dx: -3, dy: -3, s: 2.5, c: "#f59e0b", o: 0.5 },
  ];

  return (
    <div
      className={cn(
        "absolute inset-x-0 pointer-events-none overflow-hidden hidden md:block",
        className,
      )}
      style={{ height }}
    >
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {/* Fire gradient for the dashed trail line */}
          <linearGradient id="ft-fire-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0" />
            <stop offset="12%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0.4" />
            <stop offset="30%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.5" />
            <stop offset="50%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.6" />
            <stop offset="70%" stopColor={FIRE_GRADIENT.ember} stopOpacity="0.5" />
            <stop offset="88%" stopColor={FIRE_GRADIENT.gold} stopOpacity="0.4" />
            <stop offset="100%" stopColor={FIRE_GRADIENT.gold} stopOpacity="0" />
          </linearGradient>

          {/* Edge fade mask — transparent at edges, visible in center */}
          <linearGradient id="ft-edge-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="8%" stopColor="white" stopOpacity="1" />
            <stop offset="92%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="ft-fade-mask">
            <rect width={width} height={height} fill="url(#ft-edge-fade)" />
          </mask>

          {/* Firebolt glow radial */}
          <radialGradient id="ft-bolt-glow">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="30%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.6" />
            <stop offset="60%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.2" />
            <stop offset="100%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0" />
          </radialGradient>
          <filter id="ft-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Everything masked — fades at edges */}
        <g mask="url(#ft-fade-mask)">
          {/* Faint background trail */}
          <path d={curvePath} stroke="rgba(212,168,83,0.06)" strokeWidth="1.5" fill="none" />

          {/* Dashed fire trail with flow animation */}
          <path
            d={curvePath}
            stroke="url(#ft-fire-grad)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="10 12"
            className="animate-flow-dash motion-reduce:animate-none"
          />

          {/* === Static embers along the path === */}
          {staticEmbers.map((e, i) => (
            <rect
              key={`se-${i}`}
              x={e.cx - e.size / 2}
              y={e.cy - e.size / 2}
              width={e.size}
              height={e.size}
              fill={getFireStepColor(Math.floor(e.t * 4) + 1, 4)}
              opacity={e.opacity}
              shapeRendering="crispEdges"
            >
              <animate
                attributeName="opacity"
                values={`${e.opacity};${e.opacity * 0.2};${e.opacity}`}
                dur={`${e.flickerDur}s`}
                repeatCount="indefinite"
              />
            </rect>
          ))}

          {/* === Pixel Firebolt — continuous loop === */}
          <g className="motion-reduce:hidden" shapeRendering="crispEdges">
            {/* Ambient glow behind sprite */}
            <circle r="18" fill="url(#ft-bolt-glow)" filter="url(#ft-blur)" opacity="0.5">
              <animateMotion dur={loopDur} repeatCount="indefinite" path={curvePath} rotate="auto" />
            </circle>

            {/* Trailing embers */}
            {trailingEmbers.map((e, i) => (
              <rect key={`te-${i}`} width={e.s} height={e.s} fill={e.c} opacity={e.o} x={e.dx} y={e.dy}>
                <animateMotion
                  dur={loopDur}
                  repeatCount="indefinite"
                  path={curvePath}
                  rotate="auto"
                  begin={`${i * 0.06}s`}
                />
                <animate
                  attributeName="opacity"
                  values={`${e.o};${e.o * 0.15};${e.o}`}
                  dur="0.4s"
                  repeatCount="indefinite"
                />
              </rect>
            ))}

            {/* Pixel fire sprite — 2 frame animation at ~4fps */}
            <g>
              <animateMotion dur={loopDur} repeatCount="indefinite" path={curvePath} rotate="auto" />

              {/* Frame 1 */}
              <g>
                <animate attributeName="opacity" values="1;1;0;0;1" dur="0.25s" repeatCount="indefinite" />
                <rect x="-1.5" y="-14" width="3.5" height="3.5" fill="#fef08a" />
                <rect x="-4.5" y="-11" width="3.5" height="3.5" fill="#fbbf24" />
                <rect x="-1.5" y="-11" width="3.5" height="3.5" fill="#fde047" />
                <rect x="1.5" y="-11" width="3.5" height="3.5" fill="#fbbf24" />
                <rect x="-6" y="-8" width="3.5" height="3.5" fill="#f59e0b" />
                <rect x="-3" y="-8" width="3.5" height="3.5" fill="#fbbf24" />
                <rect x="0" y="-8" width="3.5" height="3.5" fill="#f59e0b" />
                <rect x="3" y="-8" width="3.5" height="3.5" fill="#ea580c" />
                <rect x="-4.5" y="-5" width="3.5" height="3.5" fill="#ea580c" />
                <rect x="-1.5" y="-5" width="3.5" height="3.5" fill="#f59e0b" />
                <rect x="1.5" y="-5" width="3.5" height="3.5" fill="#ea580c" />
                <rect x="-3" y="-2" width="3.5" height="3.5" fill="#c2410c" />
                <rect x="0" y="-2" width="3.5" height="3.5" fill="#dc2626" />
              </g>

              {/* Frame 2 */}
              <g>
                <animate attributeName="opacity" values="0;0;1;1;0" dur="0.25s" repeatCount="indefinite" />
                <rect x="0" y="-15" width="3.5" height="3.5" fill="#fef9c3" />
                <rect x="-3" y="-12" width="3.5" height="3.5" fill="#fde047" />
                <rect x="0" y="-12" width="3.5" height="3.5" fill="#fbbf24" />
                <rect x="3" y="-12" width="3.5" height="3.5" fill="#fde047" />
                <rect x="-4.5" y="-9" width="3.5" height="3.5" fill="#fbbf24" />
                <rect x="-1.5" y="-9" width="3.5" height="3.5" fill="#f59e0b" />
                <rect x="1.5" y="-9" width="3.5" height="3.5" fill="#fbbf24" />
                <rect x="4.5" y="-9" width="3.5" height="3.5" fill="#ea580c" />
                <rect x="-3" y="-6" width="3.5" height="3.5" fill="#ea580c" />
                <rect x="0" y="-6" width="3.5" height="3.5" fill="#f59e0b" />
                <rect x="3" y="-6" width="3.5" height="3.5" fill="#dc2626" />
                <rect x="-1.5" y="-3" width="3.5" height="3.5" fill="#c2410c" />
                <rect x="1.5" y="-3" width="3.5" height="3.5" fill="#991b1b" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
