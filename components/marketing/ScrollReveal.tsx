"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Animation variant */
  variant?: "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale-up" | "blur-in";
  /** Stagger delay in ms (for items in a list) */
  delay?: number;
  /** Duration in ms */
  duration?: number;
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
  /** Once revealed, stay visible */
  once?: boolean;
  /** HTML tag to render */
  as?: React.ElementType;
}

const variantStyles: Record<string, { hidden: React.CSSProperties; visible: React.CSSProperties }> = {
  "fade-up": {
    hidden: { opacity: 0, transform: "translateY(40px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "fade-left": {
    hidden: { opacity: 0, transform: "translateX(-40px)" },
    visible: { opacity: 1, transform: "translateX(0)" },
  },
  "fade-right": {
    hidden: { opacity: 0, transform: "translateX(40px)" },
    visible: { opacity: 1, transform: "translateX(0)" },
  },
  "scale-up": {
    hidden: { opacity: 0, transform: "scale(0.9)" },
    visible: { opacity: 1, transform: "scale(1)" },
  },
  "blur-in": {
    hidden: { opacity: 0, filter: "blur(8px)", transform: "translateY(12px)" },
    visible: { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
  },
};

export function ScrollReveal({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.15,
  once = true,
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const styles = variantStyles[variant] ?? variantStyles["fade-up"];
  const currentStyle = isVisible ? styles.visible : styles.hidden;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={className}
      style={{
        ...currentStyle,
        transition: `all ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </Tag>
  );
}
