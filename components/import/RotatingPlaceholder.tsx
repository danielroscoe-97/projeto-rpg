"use client";

import { useState, useEffect, useRef } from "react";

interface RotatingPlaceholderProps {
  placeholders: string[];
  interval?: number;
  fadeMs?: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RotatingPlaceholder({
  placeholders,
  interval = 3000,
  fadeMs = 300,
  value,
  onChange,
  className = "",
}: RotatingPlaceholderProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const orderRef = useRef<number[]>([]);

  // Shuffle order once per mount
  useEffect(() => {
    const indices = placeholders.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    orderRef.current = indices;
  }, [placeholders]);

  useEffect(() => {
    if (focused || value) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % placeholders.length);
        setVisible(true);
      }, fadeMs);
    }, interval);
    return () => clearInterval(timer);
  }, [focused, value, placeholders.length, interval, fadeMs]);

  const currentPlaceholder =
    placeholders[orderRef.current[index] ?? index] ?? placeholders[0];

  return (
    <div className="relative">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full bg-card border border-border rounded px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold/60 focus:border-gold/60 transition-colors ${className}`}
        placeholder=" "
      />
      {!value && !focused && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/50 pointer-events-none transition-opacity"
          style={{
            opacity: visible ? 1 : 0,
            transitionDuration: `${fadeMs}ms`,
          }}
        >
          {currentPlaceholder}
        </span>
      )}
    </div>
  );
}
