"use client";

import { cn } from "@/lib/utils";
import { ClassIcon, ALL_CLASSES, CLASS_DISPLAY_NAMES } from "./ClassIcon";

interface ClassIconGridProps {
  /** Currently selected class key (e.g. "wizard") */
  selected: string | null;
  /** Callback when a class is selected */
  onSelect: (classKey: string) => void;
  /** Translation map for class names. Falls back to English display name. */
  classNames?: Record<string, string>;
  /** Extra CSS classes for the grid container */
  className?: string;
}

/**
 * Visual grid of 12 D&D class icons for selection.
 * Shows 3 columns on mobile (4 rows), 4 columns on desktop (3 rows).
 * Selected class gets a gold border + glow.
 */
export function ClassIconGrid({ selected, onSelect, classNames, className }: ClassIconGridProps) {
  return (
    <div className={cn("grid grid-cols-3 sm:grid-cols-4 gap-2", className)}>
      {ALL_CLASSES.map((classKey) => {
        const isSelected = selected === classKey;
        const displayName = classNames?.[classKey] ?? CLASS_DISPLAY_NAMES[classKey];

        return (
          <button
            key={classKey}
            type="button"
            onClick={() => onSelect(classKey)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200",
              "hover:bg-amber-400/5 hover:border-amber-400/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
              "min-h-[80px] justify-center",
              isSelected
                ? "border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                : "border-border bg-card"
            )}
          >
            <span className={cn(
              "transition-colors duration-200",
              isSelected ? "text-amber-400" : "text-muted-foreground"
            )}>
              <ClassIcon characterClass={classKey} size={36} />
            </span>
            <span className={cn(
              "text-[11px] font-medium leading-tight text-center transition-colors duration-200",
              isSelected ? "text-amber-400" : "text-muted-foreground"
            )}>
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
