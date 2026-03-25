"use client";

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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="mt-2 p-2 bg-white/5 rounded-md"
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
              onClick={() => onToggle(condition)}
              className={`px-2 py-1 text-xs rounded-full font-medium min-h-[32px] transition-colors ${
                isActive
                  ? "bg-[#e94560] text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
              aria-pressed={isActive}
              data-testid={`condition-toggle-${condition.toLowerCase()}`}
            >
              {condition}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-2 py-1 text-white/40 hover:text-white/70 text-xs min-h-[32px]"
        aria-label="Close condition selector"
        data-testid="condition-close-btn"
      >
        Done
      </button>
    </div>
  );
}
