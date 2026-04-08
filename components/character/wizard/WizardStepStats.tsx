"use client";

import { useTranslations } from "next-intl";
import { Heart, Shield, Zap } from "lucide-react";
import type { WizardCharacterData } from "./CharacterWizard";

interface WizardStepStatsProps {
  data: WizardCharacterData;
  onChange: (updates: Partial<WizardCharacterData>) => void;
  isCaster: boolean;
}

export function WizardStepStats({ data, onChange, isCaster }: WizardStepStatsProps) {
  const t = useTranslations("character_wizard");

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <Shield className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {t("step2_title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("step2_subtitle")}
        </p>
      </div>

      {/* Level */}
      <div>
        <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1.5">
          {t("level_label")}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={20}
            value={data.level}
            onChange={(e) => onChange({ level: Number(e.target.value) })}
            className="flex-1 accent-amber-400 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-md"
          />
          <span className="text-lg font-bold text-foreground tabular-nums w-8 text-center">
            {data.level}
          </span>
        </div>
      </div>

      {/* HP + AC row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="wizard-hp" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Heart className="w-3 h-3 text-red-400" />
            {t("hp_label")}
          </label>
          <input
            id="wizard-hp"
            type="number"
            value={data.maxHp ?? ""}
            onChange={(e) => onChange({ maxHp: e.target.value ? Number(e.target.value) : null })}
            placeholder={t("hp_placeholder")}
            min={1}
            max={999}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400/40 transition-all"
          />
        </div>
        <div>
          <label htmlFor="wizard-ac" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Shield className="w-3 h-3 text-blue-400" />
            {t("ac_label")}
          </label>
          <input
            id="wizard-ac"
            type="number"
            value={data.ac ?? ""}
            onChange={(e) => onChange({ ac: e.target.value ? Number(e.target.value) : null })}
            placeholder={t("ac_placeholder")}
            min={1}
            max={30}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400/40 transition-all"
          />
        </div>
      </div>

      {/* Spell Save DC — only for casters */}
      {isCaster && (
        <div>
          <label htmlFor="wizard-dc" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Zap className="w-3 h-3 text-purple-400" />
            {t("spell_dc_label")}
          </label>
          <input
            id="wizard-dc"
            type="number"
            value={data.spellSaveDc ?? ""}
            onChange={(e) => onChange({ spellSaveDc: e.target.value ? Number(e.target.value) : null })}
            placeholder={t("spell_dc_placeholder")}
            min={1}
            max={30}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400/40 transition-all"
          />
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground/60 text-center">
        {t("step2_helper")}
      </p>
    </div>
  );
}
