"use client";

import { cn } from "@/lib/utils";
import { ClassIcon, normalizeClassName } from "./ClassIcon";

interface ClassBadgeProps {
  /** Class name (English or Portuguese) */
  characterClass?: string | null;
  /** Badge size: "sm" (16px), "md" (20px), "lg" (24px) */
  size?: "sm" | "md" | "lg";
  /** Extra Tailwind classes for the outer container */
  className?: string;
}

const SIZES = {
  sm: { outer: "w-4 h-4", icon: 10 },
  md: { outer: "w-5 h-5", icon: 12 },
  lg: { outer: "w-6 h-6", icon: 14 },
} as const;

/**
 * Small circular badge with the class icon inside.
 * Designed to sit at the bottom-right of an avatar or inline with text.
 *
 * Usage:
 * ```tsx
 * <div className="relative">
 *   <Avatar />
 *   <ClassBadge characterClass="wizard" size="sm" className="absolute -bottom-0.5 -right-0.5" />
 * </div>
 * ```
 */
export function ClassBadge({ characterClass, size = "sm", className }: ClassBadgeProps) {
  const normalized = normalizeClassName(characterClass);
  if (!normalized) return null;

  const s = SIZES[size];

  return (
    <span
      className={cn(
        s.outer,
        "inline-flex items-center justify-center rounded-full",
        "bg-background border border-amber-400/40 text-amber-400",
        "shadow-sm shadow-amber-400/10",
        className
      )}
      title={characterClass ?? undefined}
    >
      <ClassIcon characterClass={characterClass} size={s.icon} />
    </span>
  );
}
