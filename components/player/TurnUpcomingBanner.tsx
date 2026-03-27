"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface TurnUpcomingBannerProps {
  visible: boolean;
}

export function TurnUpcomingBanner({ visible }: TurnUpcomingBannerProps) {
  const t = useTranslations("player");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-amber-500/15 border border-amber-400/50 rounded-lg px-4 py-3 text-center"
          role="status"
          aria-live="polite"
          data-testid="turn-upcoming-banner"
        >
          <span className="text-amber-300 font-semibold text-sm">
            {t("turn_upcoming")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
