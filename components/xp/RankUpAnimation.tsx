"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface RankUpAnimationProps {
  /** New rank title to display */
  title: string | null;
  /** Icon emoji for the new rank */
  icon?: string;
  /** Callback when animation is dismissed */
  onDismiss?: () => void;
}

/**
 * Full-screen overlay celebration when user ranks up.
 * Auto-dismisses after 4 seconds, or on click.
 */
export function RankUpAnimation({ title, icon = "👑", onDismiss }: RankUpAnimationProps) {
  const t = useTranslations("xp");
  const [visible, setVisible] = useState(!!title);

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (!title) return;
    setVisible(true);
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [title, dismiss]);

  return (
    <AnimatePresence>
      {visible && title && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={dismiss}
          role="dialog"
          aria-label={t("rank_up_title")}
        >
          <motion.div
            className="flex flex-col items-center gap-4 px-8 py-10 max-w-sm"
            initial={{ scale: 0.5, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            {/* Icon with glow */}
            <motion.div
              className="text-6xl drop-shadow-[0_0_20px_rgba(212,168,83,0.6)]"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            >
              {icon}
            </motion.div>

            {/* Title text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-gold font-display text-xl font-bold tracking-wider uppercase">
                {t("rank_up_title")}
              </p>
              <p className="text-foreground text-lg mt-1">
                {t("rank_up_message", { title })}
              </p>
            </motion.div>

            {/* Dismiss hint */}
            <motion.p
              className="text-foreground/30 text-xs mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {t("rank_up_dismiss")}
            </motion.p>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-gold/60"
                  style={{
                    left: `${15 + Math.random() * 70}%`,
                    bottom: "30%",
                  }}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: -120 - Math.random() * 80,
                    x: (Math.random() - 0.5) * 60,
                  }}
                  transition={{
                    duration: 1.5 + Math.random(),
                    delay: 0.3 + Math.random() * 0.8,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
