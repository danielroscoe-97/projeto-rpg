"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface TurnNotificationOverlayProps {
  visible: boolean;
  playerName: string;
}

export function TurnNotificationOverlay({ visible, playerName }: TurnNotificationOverlayProps) {
  const t = useTranslations("player");

  // Haptic feedback on turn start
  useEffect(() => {
    if (visible) {
      navigator.vibrate?.([200]);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: [1, 1.02, 1] }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.2 },
          }}
          className="bg-amber-500/20 border border-amber-400 rounded-lg px-4 py-4 text-center"
          aria-live="assertive"
          data-testid="turn-now-overlay"
        >
          <span className="text-amber-300 font-bold text-base">
            {t("turn_now", { playerName })}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
