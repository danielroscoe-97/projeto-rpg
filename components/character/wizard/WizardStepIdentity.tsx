"use client";

import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { ClassIconGrid } from "@/components/character/ClassIconGrid";
import { SRD_RACES } from "@/lib/data/races";
import type { WizardCharacterData } from "./CharacterWizard";

/** Deduplicated race names (merge 2014/2024 duplicates) — module-level constant */
const UNIQUE_RACES = (() => {
  const seen = new Set<string>();
  return SRD_RACES.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
})();

interface WizardStepIdentityProps {
  data: WizardCharacterData;
  onChange: (updates: Partial<WizardCharacterData>) => void;
  nameError: boolean;
  onClearNameError: () => void;
}

export function WizardStepIdentity({
  data,
  onChange,
  nameError,
  onClearNameError,
}: WizardStepIdentityProps) {
  const t = useTranslations("character_wizard");
  const races = UNIQUE_RACES;

  return (
    <div className="space-y-6">
      {/* Hero illustration */}
      <div className="text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <Swords className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {t("step1_title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("step1_subtitle")}
        </p>
      </div>

      {/* Character name */}
      <div>
        <label htmlFor="wizard-name" className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1.5">
          {t("name_label")} *
        </label>
        <input
          id="wizard-name"
          type="text"
          value={data.name}
          onChange={(e) => {
            onChange({ name: e.target.value });
            if (nameError) onClearNameError();
          }}
          placeholder={t("name_placeholder")}
          maxLength={50}
          autoFocus
          className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground text-base placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 transition-all ${
            nameError
              ? "border-red-500 focus:ring-red-500/30"
              : "border-border focus:ring-amber-400/30 focus:border-amber-400/50"
          }`}
        />
        {nameError && (
          <p className="text-xs text-red-400 mt-1">{t("name_required")}</p>
        )}
      </div>

      {/* Class selection */}
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-2">
          {t("class_label")}
        </label>
        <ClassIconGrid
          selected={data.characterClass}
          onSelect={(cls) => onChange({ characterClass: cls })}
        />
      </div>

      {/* Race selection */}
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1.5">
          {t("race_label")}
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {races.map((race) => {
            const isSelected = data.race === race.name;
            return (
              <button
                key={race.id}
                type="button"
                onClick={() => onChange({ race: race.name })}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  isSelected
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-border bg-card text-muted-foreground hover:border-amber-400/30 hover:text-foreground"
                }`}
              >
                {race.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
