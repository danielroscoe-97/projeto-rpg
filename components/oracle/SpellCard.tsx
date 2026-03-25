"use client";

import type { SrdSpell } from "@/lib/srd/srd-loader";
import "@/styles/stat-card-5e.css";

export interface SpellCardProps {
  spell: SrdSpell;
  variant?: "inline" | "card";
  onClose?: () => void;
  onPin?: () => void;
  onMinimize?: () => void;
}

export function formatSpellLevel(level: number, school: string): string {
  if (level === 0) return `${school} Cantrip`;
  const suffix =
    level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}-level ${school}`;
}

export function SpellCard({
  spell,
  variant = "inline",
  onClose,
  onPin,
  onMinimize,
}: SpellCardProps) {
  const isCard = variant === "card";

  const durationDisplay = spell.concentration
    ? `Concentration, ${spell.duration}`
    : spell.duration;

  return (
    <div
      className={`stat-card-5e card-type-spell${isCard ? " card-floating card-transition" : ""}`}
      data-testid="spell-card"
    >
      {isCard && (
        <div className="card-toolbar">
          {onPin && (
            <button type="button" onClick={onPin} aria-label="Pin spell card" data-testid="spell-pin-btn">
              📌
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label="Minimize spell card" data-testid="spell-minimize-btn">
              −
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close spell card" data-testid="spell-close-btn">
              ×
            </button>
          )}
        </div>
      )}

      <div className="card-body">
        {/* Name */}
        <h3 className="card-name" data-testid="spell-name">{spell.name}</h3>

        {/* Level + School */}
        <p className="card-subtitle" data-testid="spell-level-school">
          {formatSpellLevel(spell.level, spell.school)}
        </p>

        <hr className="card-divider" />

        {/* Properties */}
        <div data-testid="spell-properties">
          <p className="prop-line">
            <span className="prop-label">Casting Time: </span>
            <span className="prop-value">{spell.casting_time}</span>
          </p>
          <p className="prop-line">
            <span className="prop-label">Range: </span>
            <span className="prop-value">{spell.range}</span>
          </p>
          <p className="prop-line">
            <span className="prop-label">Components: </span>
            <span className="prop-value">{spell.components}</span>
          </p>
          <p className="prop-line">
            <span className="prop-label">Duration: </span>
            <span className="prop-value">{durationDisplay}</span>
          </p>
        </div>

        <hr className="card-divider" />

        {/* Description */}
        <div className="trait-block" data-testid="spell-description">
          {spell.description.split("\n\n").map((paragraph, i) => (
            <p key={i} className="trait-desc" style={{ marginBottom: "0.5em" }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* At Higher Levels */}
        {spell.higher_levels && (
          <>
            <div className="trait-block" data-testid="spell-higher-levels">
              <span className="trait-name">At Higher Levels. </span>
              <span className="trait-desc">{spell.higher_levels}</span>
            </div>
          </>
        )}

        <hr className="card-divider" />

        {/* Classes */}
        <p className="prop-line" data-testid="spell-classes">
          <span className="prop-label">Classes: </span>
          <span className="prop-value">{spell.classes.join(", ")}</span>
        </p>

        {/* Badges */}
        {(spell.ritual || spell.concentration) && (
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }} data-testid="spell-badges">
            {spell.ritual && (
              <span className="prop-label" style={{ fontSize: "0.75em", border: "1px solid var(--5e-accent-blue)", borderRadius: "3px", padding: "1px 6px" }}>
                Ritual
              </span>
            )}
            {spell.concentration && (
              <span className="prop-label" style={{ fontSize: "0.75em", border: "1px solid var(--5e-accent-blue)", borderRadius: "3px", padding: "1px 6px" }}>
                Concentration
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
