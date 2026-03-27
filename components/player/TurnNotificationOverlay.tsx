"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

const AUTO_DISMISS_MS = 3000;

interface TurnNotificationOverlayProps {
  visible: boolean;
  playerName: string;
  /** Called when the overlay should be hidden (tap or auto-dismiss) */
  onDismiss?: () => void;
}

export function TurnNotificationOverlay({ visible, playerName, onDismiss }: TurnNotificationOverlayProps) {
  const t = useTranslations("player");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  // Haptic feedback + sound on turn start
  useEffect(() => {
    if (!visible) return;

    // Vibration pattern: short-pause-short for urgency
    navigator.vibrate?.([200, 100, 200]);

    // Play notification sound if available and user has interacted with the page
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/turn-notification.mp3");
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay — ignore silently
      });
    } catch {
      // Audio not available — ignore
    }

    // Auto-dismiss after 3 seconds
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            opacity: { duration: 0.2 },
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={dismiss}
          role="alertdialog"
          aria-live="assertive"
          aria-label={t("turn_now", { playerName })}
          data-testid="turn-now-overlay"
        >
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-center"
            >
              <p className="text-amber-300 font-bold text-3xl sm:text-5xl drop-shadow-lg">
                {t("turn_now", { playerName })}
              </p>
            </motion.div>
            <p className="text-white/50 text-sm">
              {t("turn_tap_dismiss")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
