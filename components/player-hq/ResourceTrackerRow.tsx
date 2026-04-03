"use client";

import { ResourceDots } from "./ResourceDots";
import { RotateCcw, Sun, Moon, RefreshCw } from "lucide-react";

const RESET_ICONS: Record<string, typeof Moon> = {
  short_rest: RotateCcw,
  long_rest: Moon,
  dawn: Sun,
  manual: RefreshCw,
};

const RESET_COLORS: Record<string, string> = {
  short_rest: "text-amber-400",
  long_rest: "text-blue-400",
  dawn: "text-orange-400",
  manual: "text-muted-foreground",
};

const DOT_COLORS: Record<string, string> = {
  short_rest: "bg-amber-400 border-amber-400",
  long_rest: "bg-blue-400 border-blue-400",
  dawn: "bg-orange-400 border-orange-400",
  manual: "bg-purple-400 border-purple-400",
};

interface ResourceTrackerRowProps {
  name: string;
  currentUses: number;
  maxUses: number;
  resetType: string;
  readOnly?: boolean;
  onToggle?: (index: number) => void;
  onReset?: () => void;
  onEdit?: () => void;
}

export function ResourceTrackerRow({
  name,
  currentUses,
  maxUses,
  resetType,
  readOnly = false,
  onToggle,
  onReset,
  onEdit,
}: ResourceTrackerRowProps) {
  const ResetIcon = RESET_ICONS[resetType] ?? RefreshCw;
  const resetColor = RESET_COLORS[resetType] ?? "text-muted-foreground";
  const dotColor = DOT_COLORS[resetType] ?? "bg-purple-400 border-purple-400";

  return (
    <div className="flex items-center gap-3 py-2 group">
      {/* Name + reset icon */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <ResetIcon className={`w-3.5 h-3.5 ${resetColor} shrink-0`} aria-hidden="true" />
        <button
          type="button"
          onClick={onEdit}
          disabled={readOnly || !onEdit}
          className="text-sm text-foreground font-medium truncate max-w-[120px] hover:text-gold transition-colors disabled:hover:text-foreground disabled:cursor-default"
          title={name}
        >
          {name}
        </button>
      </div>

      {/* Dots */}
      <div className="flex-1 flex justify-end">
        <ResourceDots
          usedCount={currentUses}
          max={maxUses}
          color={dotColor}
          size="md"
          readOnly={readOnly}
          onToggle={onToggle}
          label={name}
        />
      </div>

      {/* Individual reset button — I-01 fix: visible on mobile */}
      {!readOnly && onReset && currentUses > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={`Reset ${name}`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
