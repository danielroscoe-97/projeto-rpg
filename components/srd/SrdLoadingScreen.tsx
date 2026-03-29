"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";

const LOADING_MESSAGE_KEYS = [
  "msg_cataloging_monsters",
  "msg_rolling_initiative",
  "msg_amplifying_powers",
  "msg_preparing_spells",
  "msg_sharpening_swords",
  "msg_consulting_oracle",
] as const;

const MIN_DISPLAY_MS = 2200;
const FALLBACK_TIMEOUT_MS = 15000;

/**
 * Full-screen animated loading screen that initializes SRD data.
 * Only shows on first visit (no IndexedDB cache). Once SRD is loaded
 * and min display time passes, fades out and reveals children.
 */
export function SrdLoadingScreen({ children }: { children: React.ReactNode }) {
  const { is_loading, monsters, error } = useSrdStore();
  const t = useTranslations("srd_loading");
  const [showLoader, setShowLoader] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const minTimeRef = useRef(false);
  const srdReadyRef = useRef(false);

  // Start SRD initialization
  useEffect(() => {
    useSrdStore.getState().initializeSrd();
  }, []);

  // Min display timer — also dismiss on error once min time elapses
  useEffect(() => {
    const timer = setTimeout(() => {
      minTimeRef.current = true;
      if (srdReadyRef.current || error) setShowLoader(false);
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [error]);

  // Track SRD readiness
  useEffect(() => {
    if (!is_loading && monsters.length > 0) {
      srdReadyRef.current = true;
      if (minTimeRef.current) setShowLoader(false);
    }
  }, [is_loading, monsters]);

  // Skip loader entirely if data is already cached (instant load)
  useEffect(() => {
    if (!is_loading && monsters.length > 0) {
      setShowLoader(false);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: dismiss loader after timeout even on error
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Handle error after min display time
  useEffect(() => {
    if (error && minTimeRef.current) {
      setShowLoader(false);
    }
  }, [error]);

  // Cycle messages
  useEffect(() => {
    if (!showLoader) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGE_KEYS.length);
    }, 700);
    return () => clearInterval(interval);
  }, [showLoader]);

  return (
    <>
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="srd-loader"
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface-primary"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Dice spinner */}
            <motion.div
              className="text-5xl mb-6"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              🎲
            </motion.div>

            {/* Progress bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gold rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: MIN_DISPLAY_MS / 1000, ease: "easeInOut" }}
              />
            </div>

            {/* Rotating message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                className="text-sm text-muted-foreground/70 font-medium"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {t(LOADING_MESSAGE_KEYS[messageIndex])}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Prevent keyboard interaction with children while loader is visible */}
      <div inert={showLoader || undefined} aria-hidden={showLoader || undefined}>
        {children}
      </div>
    </>
  );
}
