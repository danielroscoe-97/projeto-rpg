"use client";

import { useEffect, useRef, useState } from "react";
import { FIRE_GRADIENT, getFireStepColor } from "@/lib/design/rpg-tokens";
import { cn } from "@/lib/utils";

interface QuestPathProps {
  steps: number;
  currentStep?: number;
  className?: string;
}

export function QuestPath({ steps, currentStep, className }: QuestPathProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const width = 1000;
  const height = 90;
  const pad = 125;
  const usable = width - pad * 2;
  const midY = height / 2;

  const positions = Array.from({ length: steps }, (_, i) =>
    pad + (steps <= 1 ? 0 : (i * usable) / (steps - 1)),
  );

  // Wave pattern — up/down between steps
  const waveAmp = 12;
  const stepPoints = positions.map((x, i) => ({
    x,
    y: midY + (i % 2 === 0 ? -waveAmp : waveAmp),
  }));

  // Cubic bezier curve through all step points
  let curvePath = `M${stepPoints[0].x},${stepPoints[0].y}`;
  for (let i = 0; i < stepPoints.length - 1; i++) {
    const p0 = stepPoints[i];
    const p1 = stepPoints[i + 1];
    const cpOffset = (p1.x - p0.x) * 0.4;
    curvePath += ` C${p0.x + cpOffset},${p0.y} ${p1.x - cpOffset},${p1.y} ${p1.x},${p1.y}`;
  }

  const travelDur = "6s"; // slow single journey
  const lastPt = stepPoints[stepPoints.length - 1];

  // Static embers scattered along the curve — more particles left behind
  const staticEmbers = Array.from({ length: 28 }, (_, i) => {
    const t = (i + 1) / 18;
    const cx = pad + t * usable;
    const wave = Math.sin(t * Math.PI * (steps - 1)) * waveAmp;
    return {
      cx,
      cy: midY - wave + (Math.random() - 0.5) * 8,
      r: 1 + Math.random() * 1,
      o: 0.15 + Math.random() * 0.15,
      delay: i * 0.3,
    };
  });

  return (
    <svg
      ref={svgRef}
      className={cn("w-full pointer-events-none", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      style={{ height: 90 }}
    >
      <defs>
        <linearGradient id="fire-path-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0.5" />
          <stop offset="25%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.6" />
          <stop offset="50%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.7" />
          <stop offset="75%" stopColor={FIRE_GRADIENT.ember} stopOpacity="0.6" />
          <stop offset="100%" stopColor={FIRE_GRADIENT.gold} stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="firebolt-glow">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
          <stop offset="30%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.7" />
          <stop offset="60%" stopColor={FIRE_GRADIENT.mid} stopOpacity="0.3" />
          <stop offset="100%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bonfire-glow">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
          <stop offset="40%" stopColor={FIRE_GRADIENT.warm} stopOpacity="0.4" />
          <stop offset="100%" stopColor={FIRE_GRADIENT.dark} stopOpacity="0" />
        </radialGradient>
        <filter id="fb-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="bonfire-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Faint background curve */}
      <path d={curvePath} stroke="rgba(212,168,83,0.08)" strokeWidth="2" fill="none" />

      {/* Fire gradient curve (dashed, flowing) */}
      <path
        d={curvePath}
        stroke="url(#fire-path-grad)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="14 14"
        className="animate-flow-dash motion-reduce:animate-none"
      />

      {/* Static embers — appear as the firebolt passes (delayed fade-in) */}
      {staticEmbers.map((e, i) => (
        <rect
          key={`se-${i}`}
          x={e.cx - e.r}
          y={e.cy - e.r}
          width={e.r * 2}
          height={e.r * 2}
          fill={getFireStepColor(Math.floor(((e.cx - pad) / usable) * steps) + 1, steps)}
          opacity="0"
          shapeRendering="crispEdges"
        >
          {/* Fade in after firebolt passes this point */}
          <animate attributeName="opacity" from="0" to={String(e.o)} dur="0.5s" begin={`${e.delay}s`} fill="freeze" />
          {/* Then flicker */}
          <animate attributeName="opacity" values={`${e.o};${e.o * 0.2};${e.o}`} dur={`${1.5 + (i % 4) * 0.3}s`} begin={`${e.delay + 0.5}s`} repeatCount="indefinite" />
        </rect>
      ))}

      {/* === Traveling Pixel Firebolt (ONE trip, triggered on scroll) === */}
      {isVisible && (<><g className="motion-reduce:hidden" shapeRendering="crispEdges">
        {/* Ambient glow */}
        <circle r="20" fill="url(#firebolt-glow)" filter="url(#fb-blur)" opacity="0">
          <animate attributeName="opacity" from="0" to="0.6" dur="0.3s" fill="freeze" />
          <animateMotion dur={travelDur} repeatCount="1" fill="freeze" path={curvePath} rotate="auto" />
          {/* Fade out when arriving */}
          <animate attributeName="opacity" from="0.6" to="0" dur="0.5s" begin={travelDur} fill="freeze" />
        </circle>

        {/* Trailing embers — more particles */}
        {[
          { dx: -35, dy: -7, s: 3, c: "#7f1d1d", o: 0.3 },
          { dx: -28, dy: 6, s: 2.5, c: "#991b1b", o: 0.35 },
          { dx: -22, dy: -5, s: 3, c: "#991b1b", o: 0.4 },
          { dx: -17, dy: 7, s: 2.5, c: "#c2410c", o: 0.45 },
          { dx: -13, dy: -6, s: 3, c: "#c2410c", o: 0.5 },
          { dx: -9, dy: 4, s: 2.5, c: "#ea580c", o: 0.55 },
          { dx: -5, dy: -3, s: 3, c: "#f59e0b", o: 0.6 },
          { dx: -2, dy: 5, s: 2.5, c: "#f59e0b", o: 0.55 },
        ].map((e, i) => (
          <rect key={`te-${i}`} width={e.s} height={e.s} fill={e.c} opacity="0" x={e.dx} y={e.dy}>
            <animate attributeName="opacity" from="0" to={String(e.o)} dur="0.3s" fill="freeze" />
            <animateMotion dur={travelDur} repeatCount="1" fill="freeze" path={curvePath} rotate="auto" begin={`${i * 0.05}s`} />
            <animate attributeName="opacity" values={`${e.o};${e.o * 0.15};${e.o}`} dur="0.35s" repeatCount="indefinite" />
            {/* Fade out at end */}
            <animate attributeName="opacity" from={String(e.o)} to="0" dur="0.3s" begin={travelDur} fill="freeze" />
          </rect>
        ))}

        {/* Pixel fire sprite — travels once */}
        <g opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" />
          <animateMotion dur={travelDur} repeatCount="1" fill="freeze" path={curvePath} rotate="auto" />
          {/* Fade out when arriving at step 4 */}
          <animate attributeName="opacity" from="1" to="0" dur="0.4s" begin={travelDur} fill="freeze" />

          {/* Frame 1 */}
          <g>
            <animate attributeName="opacity" values="1;1;0;0;1" dur="0.25s" repeatCount="indefinite" />
            <rect x="-1.5" y="-16" width="4" height="4" fill="#fef08a" />
            <rect x="-4.5" y="-13" width="4" height="4" fill="#fbbf24" />
            <rect x="-1.5" y="-13" width="4" height="4" fill="#fde047" />
            <rect x="1.5" y="-13" width="4" height="4" fill="#fbbf24" />
            <rect x="-6" y="-10" width="4" height="4" fill="#f59e0b" />
            <rect x="-3" y="-10" width="4" height="4" fill="#fbbf24" />
            <rect x="0" y="-10" width="4" height="4" fill="#f59e0b" />
            <rect x="3" y="-10" width="4" height="4" fill="#ea580c" />
            <rect x="-4.5" y="-7" width="4" height="4" fill="#ea580c" />
            <rect x="-1.5" y="-7" width="4" height="4" fill="#f59e0b" />
            <rect x="1.5" y="-7" width="4" height="4" fill="#ea580c" />
            <rect x="-3" y="-4" width="4" height="4" fill="#c2410c" />
            <rect x="0" y="-4" width="4" height="4" fill="#dc2626" />
          </g>
          {/* Frame 2 */}
          <g>
            <animate attributeName="opacity" values="0;0;1;1;0" dur="0.25s" repeatCount="indefinite" />
            <rect x="0" y="-17" width="4" height="4" fill="#fef9c3" />
            <rect x="-3" y="-14" width="4" height="4" fill="#fde047" />
            <rect x="0" y="-14" width="4" height="4" fill="#fbbf24" />
            <rect x="3" y="-14" width="4" height="4" fill="#fde047" />
            <rect x="-4.5" y="-11" width="4" height="4" fill="#fbbf24" />
            <rect x="-1.5" y="-11" width="4" height="4" fill="#f59e0b" />
            <rect x="1.5" y="-11" width="4" height="4" fill="#fbbf24" />
            <rect x="4.5" y="-11" width="4" height="4" fill="#ea580c" />
            <rect x="-3" y="-8" width="4" height="4" fill="#ea580c" />
            <rect x="0" y="-8" width="4" height="4" fill="#f59e0b" />
            <rect x="3" y="-8" width="4" height="4" fill="#dc2626" />
            <rect x="-1.5" y="-5" width="4" height="4" fill="#c2410c" />
            <rect x="1.5" y="-5" width="4" height="4" fill="#991b1b" />
          </g>
        </g>
      </g>
      </>) }

      {/* === BONFIRE at step 04 — behind the circle, smaller to not leak above === */}
      {isVisible && (<g className="motion-reduce:hidden" shapeRendering="crispEdges">
        {/* Large warm glow centered on step 04 */}
        <circle cx={lastPt.x} cy={lastPt.y - 5} r="30" fill="url(#bonfire-glow)" filter="url(#bonfire-blur)" opacity="0">
          <animate attributeName="opacity" from="0" to="0.7" dur="1s" begin={travelDur} fill="freeze" />
          <animate attributeName="r" values="30;33;30" dur="2s" begin={travelDur} repeatCount="indefinite" />
        </circle>

        {/* Bonfire pixel sprite — at step 04 position, grows BIG (scale 2.5) */}
        <g transform={`translate(${lastPt.x}, ${lastPt.y})`} opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.6s" begin={travelDur} fill="freeze" />
          <animateTransform
            attributeName="transform"
            type="scale"
            from="0.3"
            to="1.3"
            dur="1s"
            begin={travelDur}
            fill="freeze"
            additive="sum"
          />

          {/* Frame 1 — bigger fire */}
          <g>
            <animate attributeName="opacity" values="1;1;0;0;1" dur="0.3s" repeatCount="indefinite" />
            {/* Tip */}
            <rect x="-1.5" y="-22" width="4" height="4" fill="#fef9c3" />
            <rect x="1.5" y="-24" width="4" height="4" fill="#fef08a" />
            {/* Upper */}
            <rect x="-4.5" y="-19" width="4" height="4" fill="#fde047" />
            <rect x="-1.5" y="-19" width="4" height="4" fill="#fbbf24" />
            <rect x="1.5" y="-19" width="4" height="4" fill="#fde047" />
            <rect x="4.5" y="-19" width="4" height="4" fill="#fbbf24" />
            {/* Mid */}
            <rect x="-7.5" y="-16" width="4" height="4" fill="#f59e0b" />
            <rect x="-4.5" y="-16" width="4" height="4" fill="#fbbf24" />
            <rect x="-1.5" y="-16" width="4" height="4" fill="#fde047" />
            <rect x="1.5" y="-16" width="4" height="4" fill="#fbbf24" />
            <rect x="4.5" y="-16" width="4" height="4" fill="#f59e0b" />
            {/* Lower */}
            <rect x="-6" y="-13" width="4" height="4" fill="#ea580c" />
            <rect x="-3" y="-13" width="4" height="4" fill="#f59e0b" />
            <rect x="0" y="-13" width="4" height="4" fill="#fbbf24" />
            <rect x="3" y="-13" width="4" height="4" fill="#ea580c" />
            {/* Base */}
            <rect x="-4.5" y="-10" width="4" height="4" fill="#c2410c" />
            <rect x="-1.5" y="-10" width="4" height="4" fill="#dc2626" />
            <rect x="1.5" y="-10" width="4" height="4" fill="#c2410c" />
          </g>

          {/* Frame 2 */}
          <g>
            <animate attributeName="opacity" values="0;0;1;1;0" dur="0.3s" repeatCount="indefinite" />
            <rect x="0" y="-23" width="4" height="4" fill="#fef9c3" />
            <rect x="-3" y="-21" width="4" height="4" fill="#fef08a" />
            {/* Upper */}
            <rect x="-6" y="-18" width="4" height="4" fill="#fbbf24" />
            <rect x="-3" y="-18" width="4" height="4" fill="#fde047" />
            <rect x="0" y="-18" width="4" height="4" fill="#fbbf24" />
            <rect x="3" y="-18" width="4" height="4" fill="#fde047" />
            {/* Mid */}
            <rect x="-7.5" y="-15" width="4" height="4" fill="#fbbf24" />
            <rect x="-4.5" y="-15" width="4" height="4" fill="#f59e0b" />
            <rect x="-1.5" y="-15" width="4" height="4" fill="#fbbf24" />
            <rect x="1.5" y="-15" width="4" height="4" fill="#f59e0b" />
            <rect x="4.5" y="-15" width="4" height="4" fill="#fbbf24" />
            {/* Lower */}
            <rect x="-6" y="-12" width="4" height="4" fill="#ea580c" />
            <rect x="-3" y="-12" width="4" height="4" fill="#f59e0b" />
            <rect x="0" y="-12" width="4" height="4" fill="#ea580c" />
            <rect x="3" y="-12" width="4" height="4" fill="#dc2626" />
            {/* Base */}
            <rect x="-4.5" y="-9" width="4" height="4" fill="#991b1b" />
            <rect x="-1.5" y="-9" width="4" height="4" fill="#c2410c" />
            <rect x="1.5" y="-9" width="4" height="4" fill="#991b1b" />
          </g>
        </g>
      </g>)}

      {/* Step dots on the curve */}
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
