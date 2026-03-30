"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Focus } from "lucide-react";
import { CONDITION_ICONS } from "@/components/oracle/ConditionBadge";
import { isConcentrating, getConcentrationSpell } from "@/lib/combat/concentration";

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
  const tcombat = useTranslations("combat");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const concentrating = isConcentrating(activeConditions);
  const currentSpell = getConcentrationSpell(activeConditions) ?? "";
  const [showSpellInput, setShowSpellInput] = useState(false);
  const [spellName, setSpellName] = useState(currentSpell);

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
