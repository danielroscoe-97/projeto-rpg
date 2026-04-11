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

const MESSAGES_TO_SHOW = 3;
const MESSAGE_DURATION_MS = 1000;
const MIN_DISPLAY_MS = MESSAGES_TO_SHOW * MESSAGE_DURATION_MS;
const FALLBACK_TIMEOUT_MS = 15000;

/** Pick N random unique indices from an array of length `total`. */
function pickRandom(total: number, count: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}

/**
 * Full-screen animated loading screen that initializes SRD data.
 * Only shows on first visit (no IndexedDB cache). Once SRD is loaded
 * and min display time passes, fades out and reveals children.
 */
export function SrdLoadingScreen({ children }: { children: React.ReactNode }) {
  const { is_loading, monsters, error } = useSrdStore();
  const t = useTranslations("srd_loading");
  const [showLoader, setShowLoader] = useState(true);
  const [messageSlot, setMessageSlot] = useState(0);
  // Initialize with a stable default for SSR, randomize after mount to avoid hydration mismatch
  const [pickedIndices, setPickedIndices] = useState([0, 1, 2]);
  useEffect(() => {
    setPickedIndices(pickRandom(LOADING_MESSAGE_KEYS.length, MESSAGES_TO_SHOW));
  }, []);
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

  // Cycle through the 3 randomly picked messages
  useEffect(() => {
    if (!showLoader) return;
    const interval = setInterval(() => {
      setMessageSlot((i) => Math.min(i + 1, MESSAGES_TO_SHOW - 1));
    }, MESSAGE_DURATION_MS);
    return () => clearInterval(interval);
  }, [showLoader]);

  return (
    <>
      {/* Sentinel for E2E tests — updates immediately, not gated by framer-motion exit animation */}
      <span data-testid="srd-status" data-ready={String(!showLoader)} style={{ display: "none" }} />
      {/* Wrapper disables pointer-events immediately when loading ends,
          before framer-motion's exit animation completes */}
      <div
        data-testid="srd-loading"
        className="fixed inset-0 z-[10010]"
        style={{ pointerEvents: showLoader ? "auto" : "none" }}
        aria-hidden={!showLoader}
      >
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="srd-loader"
            className="w-full h-full flex flex-col items-center justify-center bg-surface-primary"
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
                key={messageSlot}
                className="text-sm text-muted-foreground font-medium"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {t(LOADING_MESSAGE_KEYS[pickedIndices[messageSlot]])}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      {/* Prevent keyboard interaction with children while loader is visible */}
      <div inert={showLoader || undefined} aria-hidden={showLoader || undefined}>
        {children}
      </div>
    </>
  );
}
