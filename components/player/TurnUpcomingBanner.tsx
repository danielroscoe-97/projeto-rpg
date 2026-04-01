"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

const LS_NOTIF_DISABLED_KEY = "turn_notifications_disabled";

interface TurnUpcomingBannerProps {
  visible: boolean;
}

export function TurnUpcomingBanner({ visible }: TurnUpcomingBannerProps) {
  const t = useTranslations("player");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      // Reset guard so next upcoming event can play
      playedRef.current = false;
      return;
    }

    // Don't repeat if already played for this upcoming event
    if (playedRef.current) return;
    playedRef.current = true;

    // Respect user's notification toggle
    if (localStorage.getItem(LS_NOTIF_DISABLED_KEY) === "true") return;

    // Haptic — single short pulse (lighter than full turn)
    navigator.vibrate?.([100]);

    // Play subtle upcoming sound
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/sfx/notification.mp3");
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay — ignore
      });
    } catch {
      // Audio not available — ignore
    }
  }, [visible]);

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
