"use client";

import { useEffect, useRef } from "react";

/**
 * Floating magical particles for the hero section.
 * Uses a canvas element for performance.
 * Renders gold sparkle particles that float upward with gentle sway.
 */
export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 35;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      maxOpacity: number;
      phase: number;
      phaseSpeed: number;
    }

    function createParticle(): Particle {
      if (!canvas) return {} as Particle;
      return {
        x: Math.random() * canvas.offsetWidth,
        y: canvas.offsetHeight + Math.random() * 50,
        size: Math.random() * 3 + 1,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: 0,
        maxOpacity: Math.random() * 0.5 + 0.15,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.02 + 0.005,
      };
    }

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = createParticle();
      // Scatter initial positions
      p.y = Math.random() * (canvas.offsetHeight || 600);
      p.opacity = p.maxOpacity * Math.random();
      particles.push(p);
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      for (const p of particles) {
        p.y += p.speedY;
        p.x += Math.sin(p.phase) * 0.3 + p.speedX;
        p.phase += p.phaseSpeed;

        // Fade in near bottom, fade out near top
        const normalizedY = p.y / canvas.offsetHeight;
        if (normalizedY > 0.8) {
          p.opacity = Math.min(p.opacity + 0.005, p.maxOpacity);
        } else if (normalizedY < 0.2) {
          p.opacity = Math.max(p.opacity - 0.005, 0);
        } else {
          p.opacity = Math.min(p.opacity + 0.003, p.maxOpacity);
        }

        // Reset when off screen
        if (p.y < -10 || p.opacity <= 0) {
          Object.assign(p, createParticle());
        }

        // Draw sparkle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = "#D4A853";
        ctx.shadowBlur = p.size * 4;
        ctx.shadowColor = "rgba(212, 168, 83, 0.6)";
        ctx.beginPath();

        // 4-point star shape
        const s = p.size;
        ctx.moveTo(p.x, p.y - s * 1.5);
        ctx.quadraticCurveTo(p.x + s * 0.3, p.y - s * 0.3, p.x + s * 1.5, p.y);
        ctx.quadraticCurveTo(p.x + s * 0.3, p.y + s * 0.3, p.x, p.y + s * 1.5);
        ctx.quadraticCurveTo(p.x - s * 0.3, p.y + s * 0.3, p.x - s * 1.5, p.y);
        ctx.quadraticCurveTo(p.x - s * 0.3, p.y - s * 0.3, p.x, p.y - s * 1.5);
        ctx.fill();
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      style={{ opacity: 0.7 }}
    />
  );
}
