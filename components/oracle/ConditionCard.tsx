"use client";

import "@/styles/stat-card-5e.css";
import { LinkedText } from "@/components/oracle/LinkedText";
import type { RulesetVersion } from "@/lib/types/database";

/** Maps condition names to left-border colors for the reference variant */
const REFERENCE_BORDER_COLORS: Record<string, string> = {
  blinded: "border-l-gray-500",
  charmed: "border-l-pink-500",
  deafened: "border-l-gray-400",
  exhaustion: "border-l-yellow-600",
  frightened: "border-l-purple-500",
  grappled: "border-l-orange-500",
  incapacitated: "border-l-red-600",
  invisible: "border-l-blue-300",
  paralyzed: "border-l-red-800",
  petrified: "border-l-stone-500",
  poisoned: "border-l-green-500",
  prone: "border-l-amber-700",
  restrained: "border-l-teal-500",
  stunned: "border-l-gold",
  unconscious: "border-l-gray-800",
};

export interface ConditionCardProps {
  condition: { id: string; name: string; description: string; source?: string; ruleset_version?: RulesetVersion };
  variant?: "inline" | "card" | "reference";
  onClose?: () => void;
  /** @deprecated Use onFocus instead */
  onPin?: () => void;
  onFocus?: () => void;
  onLock?: () => void;
  isLocked?: boolean;
  onMinimize?: () => void;
  /** Reference variant: whether expanded */
  expanded?: boolean;
  /** Reference variant: toggle expand callback */
  onToggle?: () => void;
  /** Reference variant: fallback border color */
  defaultBorder?: string;
}

export function ConditionCard({
  condition,
  variant = "inline",
  onClose,
  onPin,
  onFocus,
  onLock,
  isLocked = false,
  onMinimize,
  expanded,
  onToggle,
  defaultBorder = "border-l-gray-500",
}: ConditionCardProps) {
  // Reference variant — list-style expandable card with colored left border
  if (variant === "reference") {
    const borderColor = REFERENCE_BORDER_COLORS[condition.name.toLowerCase()] ?? defaultBorder;
    const preview = condition.description.split("\n")[0].slice(0, 100);

    return (
      <div
        className={`rounded-lg border border-white/[0.06] border-l-2 ${borderColor} hover:border-white/[0.12] transition-colors`}
      >
        <div className="flex items-start gap-1 px-4 py-3 min-h-[52px]">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 text-left min-w-0"
            aria-expanded={expanded}
            aria-label={`${condition.name} — ${expanded ? "collapse" : "expand"}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">{condition.name}</span>
              {condition.source && (
                <span className="text-[10px] text-muted-foreground/50 font-mono">{condition.source}</span>
              )}
            </div>
            {!expanded && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview}…</p>
            )}
          </button>
          {onPin && (
            <button
              type="button"
              onClick={onPin}
              className="px-2 py-0.5 text-[10px] rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[28px] shrink-0"
              aria-label={`Pin ${condition.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.5 1.5a.5.5 0 0 0-1 0v4.396L4.12 7.673a.5.5 0 0 0-.27.444v1.266a.5.5 0 0 0 .63.484L7.5 9.18V13l-1.354 1.354a.5.5 0 0 0 .354.854h3a.5.5 0 0 0 .354-.854L8.5 13V9.18l3.02.687a.5.5 0 0 0 .63-.484V8.117a.5.5 0 0 0-.27-.444L8.5 5.896V1.5z"/></svg>
            </button>
          )}
        </div>

        {expanded && (
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
              <LinkedText text={condition.description} rulesetVersion={condition.ruleset_version ?? "2014"} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline / Card variants — 5e stat card style
  const isCard = variant === "card";

  return (
    <div
      className={`stat-card-5e card-type-condition${isCard ? " card-floating card-transition" : ""}`}
      data-testid="condition-card"
    >
      {isCard && (
        <div className="card-toolbar">
          {onLock && (
            <button type="button" onClick={onLock} aria-label={isLocked ? "Unlock card position" : "Lock card position"} title={isLocked ? "Desbloquear posição" : "Travar posição"} data-testid="condition-lock-btn">
              {isLocked ? "🔒" : "🔓"}
            </button>
          )}
          {(onFocus ?? onPin) && (
            <button type="button" onClick={(onFocus ?? onPin)!} aria-label="Bring card to front" title="Trazer para frente" data-testid="condition-focus-btn">
              ⬆️
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label="Minimize condition card" data-testid="condition-minimize-btn">
              −
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close condition card"
              data-testid="condition-close-btn"
              className="toolbar-close"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="card-body">
        {/* Name */}
        <h3 className="card-name" data-testid="condition-name">{condition.name}</h3>

        {/* Subtitle */}
        <p className="card-subtitle">Condition</p>

        <hr className="card-divider" />

        {/* Rules text */}
        <div className="trait-block" data-testid="condition-description">
          {condition.description.split("\n\n").map((paragraph, i) => (
            <p key={i} className="trait-desc" style={{ marginBottom: "0.5em" }}>
              <LinkedText text={paragraph} rulesetVersion={condition.ruleset_version ?? "2014"} />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export { REFERENCE_BORDER_COLORS };
