"use client";

import { useTranslations } from "next-intl";
import { Heart, Shield, Zap, Sparkles } from "lucide-react";
import { ClassIcon, CLASS_DISPLAY_NAMES, normalizeClassName } from "@/components/character/ClassIcon";
import type { WizardCharacterData } from "./CharacterWizard";

interface WizardStepPreviewProps {
  data: WizardCharacterData;
}

export function WizardStepPreview({ data }: WizardStepPreviewProps) {
  const t = useTranslations("character_wizard");
  const normalizedClass = normalizeClassName(data.characterClass);
  const classDisplay = normalizedClass ? CLASS_DISPLAY_NAMES[normalizedClass] : null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {t("step3_title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("step3_subtitle")}
        </p>
      </div>

      {/* Character preview card */}
      <div className="relative bg-card border border-amber-400/20 rounded-2xl p-5 shadow-[0_0_20px_rgba(251,191,36,0.06)]">
        {/* Top accent */}
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent rounded-full" />

        <div className="flex items-start gap-4">
          {/* Avatar / class icon as placeholder */}
          <div className="w-16 h-16 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
            <ClassIcon
              characterClass={data.characterClass}
              size={36}
              className="text-amber-400"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">
              {data.name || t("unnamed")}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[data.race, classDisplay].filter(Boolean).join(" · ") || t("no_details")}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Level */}
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            {t("level_badge", { level: data.level })}
          </span>

          {/* HP */}
          {data.maxHp != null && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <Heart className="w-3 h-3" />
              {data.maxHp} HP
            </span>
          )}

          {/* AC */}
          {data.ac != null && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield className="w-3 h-3" />
              AC {data.ac}
            </span>
          )}

          {/* Spell DC */}
          {data.spellSaveDc != null && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Zap className="w-3 h-3" />
              DC {data.spellSaveDc}
            </span>
          )}
        </div>
      </div>

      {/* Helper */}
      <p className="text-xs text-muted-foreground/60 text-center">
        {t("step3_helper")}
      </p>
    </div>
  );
}
