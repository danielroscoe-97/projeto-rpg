"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { HP_STATUS_STYLES, formatHpPct, type HpStatus } from "@/lib/utils/hp-status";
import { isFeatureFlagEnabled } from "@/lib/flags";

const STORAGE_KEY = "hp_legend_dismissed";

const TIER_ORDER: HpStatus[] = ["FULL", "LIGHT", "MODERATE", "HEAVY", "CRITICAL"];

interface HPLegendOverlayProps {
  /** If true, show DM-specific info (exact HP). If false, player-safe. */
  isDm?: boolean;
}

export function HPLegendOverlay({ isDm = false }: HPLegendOverlayProps) {
  const t = useTranslations("combat");
  const [visible, setVisible] = useState(false);
  const flagV2 = isFeatureFlagEnabled("ff_hp_thresholds_v2");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-lg px-4 py-3 relative"
          role="complementary"
          aria-label={t("hp_legend_title")}
          data-testid="hp-legend-overlay"
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("hp_legend_dismiss")}
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("hp_legend_title")}</p>
          <div className="grid grid-cols-2 gap-2">
            {TIER_ORDER.map((status) => {
              const style = HP_STATUS_STYLES[status];
              const legendKey = `hp_legend_${status.toLowerCase()}` as Parameters<typeof t>[0];
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-6 h-2 rounded-full ${style.barClass}`} />
                  <span className="text-xs text-foreground">
                    {t(legendKey)} ({formatHpPct(status, flagV2)})
                  </span>
                </div>
              );
            })}
          </div>
          {!isDm && (
            <p className="text-[10px] text-muted-foreground/60 mt-2">{t("hp_legend_player_note")}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
