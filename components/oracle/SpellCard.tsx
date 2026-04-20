"use client";

import type { SrdSpell } from "@/lib/srd/srd-loader";
import { LinkedText } from "@/components/oracle/LinkedText";
import { useSpellTranslation } from "@/lib/hooks/useSpellTranslation";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";
import { SPELL_LABELS, CLASS_PT, formatSpellLevelLocale } from "@/lib/i18n/spell-labels";
import "@/styles/stat-card-5e.css";

export interface SpellCardProps {
  spell: SrdSpell;
  variant?: "inline" | "card";
  locale?: "en" | "pt-BR";
  onClose?: () => void;
  /** @deprecated Use onFocus instead */
  onPin?: () => void;
  onFocus?: () => void;
  onLock?: () => void;
  isLocked?: boolean;
  onMinimize?: () => void;
}

/** @deprecated Use formatSpellLevelLocale from @/lib/i18n/spell-labels instead */
export function formatSpellLevel(level: number, school: string): string {
  if (level === 0) return `${school} Cantrip`;
  const lastTwo = level % 100;
  const lastOne = level % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : lastOne === 1
        ? "st"
        : lastOne === 2
          ? "nd"
          : lastOne === 3
            ? "rd"
            : "th";
  return `${level}${suffix}-level ${school}`;
}

export function SpellCard({
  spell,
  variant = "inline",
  locale,
  onClose,
  onPin,
  onFocus,
  onLock,
  isLocked = false,
  onMinimize,
}: SpellCardProps) {
  const isCard = variant === "card";
  const [defaultLocale] = useLocalePreference("pt-BR");
  const effectiveLocale = locale ?? defaultLocale;

  const { translated, globalPtBR, toggle, setGlobalPtBR, getName, getDescription, getHigherLevels } =
    useSpellTranslation(spell.id, effectiveLocale);

  const SL = SPELL_LABELS[translated ? "pt-BR" : "en"];

  const descriptionText = getDescription(spell.description);
  const higherLevelsText = getHigherLevels(spell.higher_levels);

  const durationDisplay = spell.concentration
    ? `${SL.concentration}, ${spell.duration}`
    : spell.duration;

  return (
    <div
      className={`stat-card-5e card-type-spell${isCard ? " card-floating card-transition" : " stat-card-5e-inline"}`}
      data-testid="spell-card"
    >
      {isCard && (
        <div className="card-toolbar">
          {onLock && (
            <button type="button" onClick={onLock} aria-label={isLocked ? "Unlock card position" : "Lock card position"} title={isLocked ? "Desbloquear posição" : "Travar posição"} data-testid="spell-lock-btn">
              {isLocked ? "🔒" : "🔓"}
            </button>
          )}
          {(onFocus ?? onPin) && (
            <button type="button" onClick={(onFocus ?? onPin)!} aria-label="Bring card to front" title="Trazer para frente" data-testid="spell-focus-btn">
              ⬆️
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label="Minimize spell card" data-testid="spell-minimize-btn">
              −
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close spell card"
              data-testid="spell-close-btn"
              className="toolbar-close"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="card-body">
        {/* Language toggle */}
        <div className="flex items-center gap-2 text-xs text-[var(--5e-text-muted)] mb-3">
          <span className="shrink-0">
            {translated ? (
              effectiveLocale === "pt-BR"
                ? <>Ficha em <span className="text-[var(--5e-accent-gold)]">PT-BR</span></>
                : <>Showing <span className="text-[var(--5e-accent-gold)]">PT-BR</span> translation</>
            ) : (
              effectiveLocale === "pt-BR"
                ? <>Ficha em ingl&ecirc;s (RAW)</>
                : <>Stat block in <span className="text-[var(--5e-accent-gold)]">English</span></>
            )}
          </span>
          <button
            onClick={toggle}
            className="shrink-0 px-2 py-0.5 rounded border border-[var(--5e-accent-gold)]/30 text-[var(--5e-accent-gold)] hover:bg-[var(--5e-accent-gold)]/10 transition-colors"
          >
            {translated
              ? (effectiveLocale === "pt-BR" ? "Ver em ingl\u00eas" : "View in English")
              : (effectiveLocale === "pt-BR" ? "Traduzir" : "View in PT-BR")
            }
          </button>
          {!translated && !globalPtBR && effectiveLocale === "pt-BR" && (
            <button
              onClick={setGlobalPtBR}
              className="shrink-0 text-[var(--5e-text-muted)] underline hover:text-[var(--5e-text)] transition-colors"
            >
              Sempre PT-BR
            </button>
          )}
        </div>

        {/* Name */}
        <h3 className="card-name" data-testid="spell-name">{getName(spell.name)}</h3>

        {/* Level + School */}
        <p className="card-subtitle" data-testid="spell-level-school">
          {formatSpellLevelLocale(spell.level, spell.school, translated ? "pt-BR" : "en")}
        </p>

        <hr className="card-divider" />

        {/* Properties */}
        <div data-testid="spell-properties">
          <p className="prop-line">
            <span className="prop-label">{SL.castingTime}: </span>
            <span className="prop-value">{spell.casting_time}</span>
          </p>
          <p className="prop-line">
            <span className="prop-label">{SL.range}: </span>
            <span className="prop-value">{spell.range}</span>
          </p>
          <p className="prop-line">
            <span className="prop-label">{SL.components}: </span>
            <span className="prop-value">{spell.components}</span>
          </p>
          <p className="prop-line">
            <span className="prop-label">{SL.duration}: </span>
            <span className="prop-value">{durationDisplay}</span>
          </p>
        </div>

        <hr className="card-divider" />

        {/* Description */}
        <div className="trait-block" data-testid="spell-description">
          {descriptionText.split("\n\n").map((paragraph, i) => (
            <p key={i} className="trait-desc" style={{ marginBottom: "0.5em" }}>
              <LinkedText text={paragraph} rulesetVersion={spell.ruleset_version} />
            </p>
          ))}
        </div>

        {/* At Higher Levels */}
        {higherLevelsText && (
          <>
            <div className="trait-block" data-testid="spell-higher-levels">
              <span className="trait-name">{SL.atHigherLevels} </span>
              <span className="trait-desc">
                <LinkedText text={higherLevelsText} rulesetVersion={spell.ruleset_version} />
              </span>
            </div>
          </>
        )}

        <hr className="card-divider" />

        {/* Classes */}
        <p className="prop-line" data-testid="spell-classes">
          <span className="prop-label">{SL.classes}: </span>
          <span className="prop-value">
            {spell.classes.map((cls) => translated ? (CLASS_PT[cls] ?? cls) : cls).join(", ")}
          </span>
        </p>

        {/* Badges */}
        {(spell.ritual || spell.concentration) && (
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }} data-testid="spell-badges">
            {spell.ritual && (
              <span className="prop-label" style={{ fontSize: "0.75em", border: "1px solid var(--5e-accent-blue)", borderRadius: "3px", padding: "1px 6px" }}>
                {translated ? "Ritual" : "Ritual"}
              </span>
            )}
            {spell.concentration && (
              <span className="prop-label" style={{ fontSize: "0.75em", border: "1px solid var(--5e-accent-blue)", borderRadius: "3px", padding: "1px 6px" }}>
                {translated ? "Concentra\u00e7\u00e3o" : "Concentration"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
