"use client";

import "@/styles/stat-card-5e.css";

export interface ConditionCardProps {
  condition: { id: string; name: string; description: string };
  variant?: "inline" | "card";
  onClose?: () => void;
  onPin?: () => void;
  onMinimize?: () => void;
}

export function ConditionCard({
  condition,
  variant = "inline",
  onClose,
  onPin,
  onMinimize,
}: ConditionCardProps) {
  const isCard = variant === "card";

  return (
    <div
      className={`stat-card-5e card-type-condition${isCard ? " card-floating card-transition" : ""}`}
      data-testid="condition-card"
    >
      {isCard && (
        <div className="card-toolbar">
          {onPin && (
            <button type="button" onClick={onPin} aria-label="Pin condition card" data-testid="condition-pin-btn">
              📌
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label="Minimize condition card" data-testid="condition-minimize-btn">
              −
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close condition card" data-testid="condition-close-btn">
              ×
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
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
