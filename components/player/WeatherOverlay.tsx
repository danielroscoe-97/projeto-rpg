"use client";

import { useEffect, useRef, useMemo } from "react";

export type WeatherEffect = "none" | "rain" | "snow" | "fog" | "storm" | "ash";

interface WeatherOverlayProps {
  effect: WeatherEffect;
}

/** Pure-CSS weather overlay for the player view. pointer-events: none so it never blocks interaction.
 *  Respects prefers-reduced-motion — falls back to a subtle color tint. Max 60 DOM elements per effect. */
export function WeatherOverlay({ effect }: WeatherOverlayProps) {
  if (effect === "none") return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:animate-none"
      style={{ zIndex: 10 }}
      aria-hidden="true"
      data-testid="weather-overlay"
    >
      {/* Reduced-motion fallback: subtle color overlay only */}
      <ReducedMotionOverlay effect={effect} />

      {/* Full particle effects (hidden when prefers-reduced-motion) */}
      <div className="contents motion-reduce:hidden">
        {effect === "rain" && <RainEffect />}
        {effect === "snow" && <SnowEffect />}
        {effect === "fog" && <FogEffect />}
        {effect === "storm" && <StormEffect />}
        {effect === "ash" && <AshEffect />}
      </div>
    </div>
  );
}

/** Reduced-motion: shows only a subtle tinted overlay, no particles */
function ReducedMotionOverlay({ effect }: { effect: WeatherEffect }) {
  const colors: Record<WeatherEffect, string> = {
    none: "transparent",
    rain: "rgba(174,194,224,0.08)",
    snow: "rgba(255,255,255,0.06)",
    fog: "rgba(200,200,200,0.12)",
    storm: "rgba(174,194,224,0.10)",
    ash: "rgba(200,120,50,0.06)",
  };
  return (
    <div
      className="absolute inset-0 hidden motion-reduce:block"
      style={{ backgroundColor: colors[effect] }}
    />
  );
}

// ── Rain ──────────────────────────────────────────────────────────────────────

const rainKeyframes = `
@keyframes weather-rain-fall {
  0% { transform: translateY(-10px) translateX(0); opacity: 1; }
  100% { transform: translateY(calc(100vh + 10px)) translateX(-30px); opacity: 0.3; }
}`;

function RainEffect() {
  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        key: i,
        left: `${(i / 50) * 100 + (Math.random() * 2 - 1)}%`,
        animationDuration: `${0.8 + Math.random() * 0.7}s`,
        animationDelay: `${Math.random() * 1.5}s`,
        height: `${12 + Math.random() * 10}px`,
      })),
    []
  );

  return (
    <>
      <style>{rainKeyframes}</style>
      {particles.map((p) => (
        <span
          key={p.key}
          className="absolute top-0 w-[1px] rounded-full"
          style={{
            left: p.left,
            height: p.height,
            backgroundColor: "rgba(174,194,224,0.5)",
            animationName: "weather-rain-fall",
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            willChange: "transform",
          }}
        />
      ))}
    </>
  );
}

// ── Snow ──────────────────────────────────────────────────────────────────────

const snowKeyframes = `
@keyframes weather-snow-fall {
  0% { transform: translateY(-10px) translateX(0); opacity: 1; }
  50% { transform: translateY(50vh) translateX(20px); opacity: 0.8; }
  100% { transform: translateY(calc(100vh + 10px)) translateX(-10px); opacity: 0; }
}`;

function SnowEffect() {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        key: i,
        left: `${(i / 40) * 100 + (Math.random() * 2.5 - 1.25)}%`,
        size: `${2 + Math.random() * 4}px`,
        animationDuration: `${4 + Math.random() * 4}s`,
        animationDelay: `${Math.random() * 6}s`,
      })),
    []
  );

  return (
    <>
      <style>{snowKeyframes}</style>
      {particles.map((p) => (
        <span
          key={p.key}
          className="absolute top-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: "rgba(255,255,255,0.8)",
            animationName: "weather-snow-fall",
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            willChange: "transform",
          }}
        />
      ))}
    </>
  );
}

// ── Fog ───────────────────────────────────────────────────────────────────────

const fogKeyframes = `
@keyframes weather-fog-drift-1 {
  0% { transform: translateX(-20%); opacity: 0.3; }
  50% { transform: translateX(10%); opacity: 0.5; }
  100% { transform: translateX(-20%); opacity: 0.3; }
}
@keyframes weather-fog-drift-2 {
  0% { transform: translateX(10%); opacity: 0.25; }
  50% { transform: translateX(-15%); opacity: 0.45; }
  100% { transform: translateX(10%); opacity: 0.25; }
}
@keyframes weather-fog-drift-3 {
  0% { transform: translateX(-5%); opacity: 0.2; }
  50% { transform: translateX(20%); opacity: 0.4; }
  100% { transform: translateX(-5%); opacity: 0.2; }
}`;

function FogEffect() {
  return (
    <>
      <style>{fogKeyframes}</style>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 120% 60% at 20% 50%, rgba(200,200,200,0.3), transparent)",
          animationName: "weather-fog-drift-1",
          animationDuration: "18s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          willChange: "transform",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 100% 50% at 70% 40%, rgba(200,200,200,0.25), transparent)",
          animationName: "weather-fog-drift-2",
          animationDuration: "22s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          willChange: "transform",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 50% 60%, rgba(200,200,200,0.2), transparent)",
          animationName: "weather-fog-drift-3",
          animationDuration: "25s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          willChange: "transform",
        }}
      />
    </>
  );
}

// ── Storm (rain + lightning flash) ────────────────────────────────────────────

function StormEffect() {
  const flashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerFlash = () => {
      if (!mounted || !flashRef.current) return;
      // Flash on
      flashRef.current.style.opacity = "1";
      setTimeout(() => {
        if (!mounted || !flashRef.current) return;
        flashRef.current.style.opacity = "0";
      }, 200);
      // Schedule next flash: 8-15s
      timer = setTimeout(triggerFlash, 8000 + Math.random() * 7000);
    };

    // First flash after a random delay
    timer = setTimeout(triggerFlash, 3000 + Math.random() * 5000);

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <RainEffect />
      {/* Lightning flash overlay */}
      <div
        ref={flashRef}
        className="absolute inset-0 bg-white/20 transition-opacity duration-100"
        style={{ opacity: 0, willChange: "opacity" }}
      />
    </>
  );
}

// ── Ash ───────────────────────────────────────────────────────────────────────

const ashKeyframes = `
@keyframes weather-ash-rise {
  0% { transform: translateY(10px) translateX(0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.7; }
  90% { opacity: 0.5; }
  100% { transform: translateY(calc(-100vh - 10px)) translateX(15px) rotate(45deg); opacity: 0; }
}`;

function AshEffect() {
  const particles = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        key: i,
        left: `${(i / 25) * 100 + (Math.random() * 4 - 2)}%`,
        size: `${2 + Math.random() * 3}px`,
        animationDuration: `${5 + Math.random() * 5}s`,
        animationDelay: `${Math.random() * 6}s`,
        color: Math.random() > 0.5 ? "rgba(220,140,50,0.6)" : "rgba(160,160,160,0.5)",
      })),
    []
  );

  return (
    <>
      <style>{ashKeyframes}</style>
      {particles.map((p) => (
        <span
          key={p.key}
          className="absolute bottom-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationName: "weather-ash-rise",
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
            willChange: "transform",
          }}
        />
      ))}
    </>
  );
}
