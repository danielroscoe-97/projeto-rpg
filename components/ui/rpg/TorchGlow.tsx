"use client";

import { cn } from "@/lib/utils";
import { TORCH_GLOW } from "@/lib/design/rpg-tokens";

interface TorchGlowProps {
  intensity?: "low" | "medium" | "high";
  hover?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function TorchGlow({
  intensity = "medium",
  hover = false,
  children,
  className,
}: TorchGlowProps) {
  const shadow = TORCH_GLOW[intensity];

  return (
    <div
      className={cn(
        "transition-shadow duration-300 motion-reduce:transition-none",
        className,
      )}
      style={hover ? undefined : { boxShadow: shadow }}
      onMouseEnter={hover ? (e) => { (e.currentTarget.style.boxShadow = shadow); } : undefined}
      onMouseLeave={hover ? (e) => { (e.currentTarget.style.boxShadow = "none"); } : undefined}
    >
      {children}
    </div>
  );
}
