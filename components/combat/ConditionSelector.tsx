"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Focus, Sparkles } from "lucide-react";
import { CONDITION_ICONS } from "@/components/oracle/ConditionBadge";
import { isConcentrating, getConcentrationSpell } from "@/lib/combat/concentration";
import {
  formatCustomCondition,
  CUSTOM_NAME_MAX_LENGTH,
  CUSTOM_DESC_MAX_LENGTH,
} from "@/lib/combat/custom-conditions";
import { isFeatureFlagEnabled } from "@/lib/flags";
import { trackEvent } from "@/lib/analytics/track";

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

export const BENEFICIAL_CONDITIONS = [
  "Blessed",
  "Flying",
  "Haste",
  "Heroism",
  "Inspired",
  "Raging",
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
  const tcombat = useTranslations("combat");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const concentrating = isConcentrating(activeConditions);
  const currentSpell = getConcentrationSpell(activeConditions) ?? "";
  const [showSpellInput, setShowSpellInput] = useState(false);
  const [spellName, setSpellName] = useState(currentSpell);

  // S4.2 — Custom conditions (feature-flagged)
  const customEnabled = isFeatureFlagEnabled("ff_custom_conditions_v1");
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const applyCustomCondition = () => {
    const trimmed = customName.trim();
    if (trimmed.length === 0) return;
    try {
      const str = formatCustomCondition(trimmed, customDesc);
      onToggle(str);
      // LGPD: log length only — never the raw name.
      trackEvent("combat:custom_condition_applied", {
        flag_on: true,
        name_length: trimmed.length,
      });
      setCustomName("");
      setCustomDesc("");
    } catch {
      /* defensive — formatCustomCondition throws only on empty, already guarded */
    }
  };

  const handleConcentrationToggle = () => {
    if (concentrating) {
      // Remove whichever concentration condition is present
      const existing = activeConditions.find(
        (c) => c === "concentrating" || c.startsWith("concentrating:"),
      );
      if (existing) onToggle(existing);
      setShowSpellInput(false);
      setSpellName("");
    } else {
      // Show spell name input before adding
      setShowSpellInput(true);
    }
  };

  const confirmConcentration = () => {
    const condition = spellName.trim()
      ? `concentrating:${spellName.trim()}`
      : "concentrating";
    onToggle(condition);
    setShowSpellInput(false);
  };

  return (
    <div
      className="mt-2 p-2 bg-white/[0.04] rounded-md"
      data-testid="condition-selector"
      onKeyDown={handleKeyDown}
    >
      {/* Concentration toggle — special condition with purple styling */}
      <div className="mb-2">
        <button
          type="button"
          onClick={handleConcentrationToggle}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            concentrating
              ? "bg-purple-600 text-white"
              : "bg-purple-900/30 text-purple-300 hover:bg-purple-900/50"
          }`}
          aria-pressed={concentrating}
          data-testid="condition-toggle-concentrating"
        >
          <Focus className="w-3 h-3 shrink-0" aria-hidden="true" />
          {concentrating && currentSpell
            ? tcombat("concentration_with_spell", { spell: currentSpell })
            : tcombat("concentration_label")}
        </button>
        {showSpellInput && !concentrating && (
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              value={spellName}
              onChange={(e) => setSpellName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmConcentration();
                if (e.key === "Escape") { setShowSpellInput(false); setSpellName(""); }
              }}
              placeholder={tcombat("concentration_spell_placeholder")}
              className="bg-transparent border border-purple-500/40 rounded px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 flex-1 min-w-0"
              autoFocus
              data-testid="concentration-spell-input"
            />
            <button
              type="button"
              onClick={confirmConcentration}
              className="px-2 py-0.5 text-xs rounded bg-purple-600 text-white hover:bg-purple-500 min-h-[28px]"
              data-testid="concentration-confirm-btn"
            >
              {tc("done")}
            </button>
          </div>
        )}
      </div>

      {/* Standard D&D conditions grid */}
      <div className="flex flex-wrap gap-1">
        {ALL_CONDITIONS.map((condition) => {
          const isActive = activeConditions.includes(condition);
          const IconComponent = CONDITION_ICONS[condition.toLowerCase()];
          return (
            <button
              key={condition}
              type="button"
              onClick={() => {
                onToggle(condition);
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isActive
                  ? "bg-gold text-surface-primary"
                  : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-pressed={isActive}
              aria-label={isActive ? tcombat("condition_remove_aria", { name: t(condition.toLowerCase()) }) : tcombat("condition_add_aria", { name: t(condition.toLowerCase()) })}
              data-testid={`condition-toggle-${condition.toLowerCase()}`}
            >
              {IconComponent && <IconComponent className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {t(condition.toLowerCase())}
            </button>
          );
        })}
      </div>

      {/* Beneficial conditions */}
      <div className="mt-2 pt-2 border-t border-white/[0.06]">
        <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wider mb-1">{tcombat("beneficial_conditions_label")}</p>
        <div className="flex flex-wrap gap-1">
          {BENEFICIAL_CONDITIONS.map((condition) => {
            const isActive = activeConditions.includes(condition);
            return (
              <button
                key={condition}
                type="button"
                onClick={() => onToggle(condition)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50"
                }`}
                aria-pressed={isActive}
                aria-label={isActive ? tcombat("condition_remove_aria", { name: condition }) : tcombat("condition_add_aria", { name: condition })}
                data-testid={`condition-toggle-${condition.toLowerCase()}`}
              >
                {condition}
              </button>
            );
          })}
        </div>
      </div>

      {/* S4.2 — Custom conditions (DM only; flag-gated) */}
      {customEnabled && (
        <div
          className="mt-2 pt-2 border-t border-white/[0.06]"
          data-testid="custom-condition-section"
        >
          <p className="text-[10px] text-gold/80 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            {tcombat("custom_condition_label")}
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustomCondition();
                if (e.key === "Escape") { setCustomName(""); setCustomDesc(""); }
              }}
              placeholder={tcombat("custom_condition_name_placeholder")}
              maxLength={CUSTOM_NAME_MAX_LENGTH}
              aria-describedby="custom-cond-limit-hint"
              className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 flex-1 min-w-[120px]"
              data-testid="custom-condition-name"
            />
            <input
              type="text"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustomCondition();
                if (e.key === "Escape") { setCustomName(""); setCustomDesc(""); }
              }}
              placeholder={tcombat("custom_condition_desc_placeholder")}
              maxLength={CUSTOM_DESC_MAX_LENGTH}
              className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 flex-1 min-w-[160px]"
              data-testid="custom-condition-desc"
            />
            <button
              type="button"
              disabled={!customName.trim()}
              onClick={applyCustomCondition}
              className="min-h-[44px] sm:min-h-[32px] px-3 text-xs rounded bg-gold text-surface-primary hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold/50"
              aria-label={tcombat("custom_condition_aria", { name: customName.trim() || tcombat("custom_condition_label") })}
              data-testid="custom-condition-apply"
            >
              {tcombat("custom_condition_apply")}
            </button>
            <span id="custom-cond-limit-hint" className="sr-only">
              {tcombat("custom_condition_limits_hint")}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-2 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[32px]"
        aria-label={tcombat("close_condition_selector")}
        data-testid="condition-close-btn"
      >
        {tc("done")}
      </button>
    </div>
  );
}
