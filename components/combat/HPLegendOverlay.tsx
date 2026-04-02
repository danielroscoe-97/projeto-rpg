"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { HP_STATUS_STYLES, type HpStatus } from "@/lib/utils/hp-status";

const STORAGE_KEY = "hp_legend_dismissed";

const TIERS = (Object.entries(HP_STATUS_STYLES) as [HpStatus, (typeof HP_STATUS_STYLES)[HpStatus]][]).map(
  ([key, style]) => ({ key: key.toLowerCase(), color: style.barClass, pct: style.pct })
);

interface HPLegendOverlayProps {
  /** If true, show DM-specific info (exact HP). If false, player-safe. */
  isDm?: boolean;
}

export function HPLegendOverlay({ isDm = false }: HPLegendOverlayProps) {
  const t = useTranslations("combat");
  const [visible, setVisible] = useState(false);

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
            {TIERS.map((tier) => (
              <div key={tier.key} className="flex items-center gap-2">
                <div className={`w-6 h-2 rounded-full ${tier.color}`} />
                <span className="text-xs text-foreground">
                  {t(`hp_legend_${tier.key}` as Parameters<typeof t>[0])} ({tier.pct})
                </span>
              </div>
            ))}
          </div>
          {!isDm && (
            <p className="text-[10px] text-muted-foreground/60 mt-2">{t("hp_legend_player_note")}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
