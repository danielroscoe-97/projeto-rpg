"use client";

import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { ClassIconGrid } from "@/components/character/ClassIconGrid";
import { RaceCombobox } from "@/components/character/RaceCombobox";
import type { WizardCharacterData } from "./CharacterWizard";

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
        <RaceCombobox
          value={data.race}
          onChange={(raceName) => onChange({ race: raceName })}
        />
      </div>
    </div>
  );
}
