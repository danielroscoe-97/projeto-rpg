"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sparkles, HeartPulse, Crosshair, Flame } from "lucide-react";
import type { CombatReportNarrative, NarrativeType } from "@/lib/types/combat-report";

const NARRATIVE_CONFIG: Record<NarrativeType, { icon: typeof Sparkles; color: string }> = {
  clutch_save: { icon: Sparkles, color: "text-yellow-400" },
  near_death: { icon: HeartPulse, color: "text-red-400" },
  one_shot: { icon: Crosshair, color: "text-cyan-400" },
  epic_comeback: { icon: Flame, color: "text-orange-400" },
};

interface RecapNarrativesProps {
  narratives: CombatReportNarrative[];
}

export function RecapNarratives({ narratives }: RecapNarrativesProps) {
  const t = useTranslations("combat");

  if (narratives.length === 0) return null;

  return (
    <div className="space-y-2">
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
      >
        <Sparkles className="size-3 text-gold" />
        {t("recap_epic_moments")}
      </motion.h3>

      {narratives.map((n, i) => {
        const config = NARRATIVE_CONFIG[n.type];
        const Icon = config.icon;

        return (
          <motion.div
            key={`${n.type}-${n.actors.join(",")}-${n.round}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5"
          >
            <Icon className={`size-4 mt-0.5 flex-shrink-0 ${config.color}`} />
            <p className="text-sm text-foreground leading-snug">{n.text}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
