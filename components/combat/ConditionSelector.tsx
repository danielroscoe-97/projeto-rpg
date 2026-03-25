"use client";

import { useTranslations } from "next-intl";

const ALL_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const;

interface ConditionSelectorProps {
  activeConditions: string[];
  onToggle: (condition: string) => void;
  onClose: () => void;
}

export function ConditionSelector({
  activeConditions,
  onToggle,
  onClose,
}: ConditionSelectorProps) {
  const t = useTranslations("conditions");
  const tc = useTranslations("common");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="mt-2 p-2 bg-white/[0.04] rounded-md"
      data-testid="condition-selector"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-wrap gap-1">
        {ALL_CONDITIONS.map((condition) => {
          const isActive = activeConditions.includes(condition);
          return (
            <button
              key={condition}
              type="button"
              onClick={() => {
                onToggle(condition);
                // Close after a short delay to give visual feedback but satisfy the auto-close request
                setTimeout(onClose, 300);
              }}
              className={`px-2 py-1 text-xs rounded-full font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isActive
                  ? "bg-gold text-surface-primary"
                  : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-pressed={isActive}
              data-testid={`condition-toggle-${condition.toLowerCase()}`}
            >
              {t(condition.toLowerCase())}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-2 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[32px]"
        aria-label="Close condition selector"
        data-testid="condition-close-btn"
      >
        {tc("done")}
      </button>
    </div>
  );
}
