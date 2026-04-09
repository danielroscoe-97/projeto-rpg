"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { RPG_ICON_COMPONENTS, pickRandom } from "@/components/loading/RpgLoadingIcons";

const LOADING_MESSAGE_KEYS = [
  "msg_rolling_initiative",
  "msg_opening_grimoire",
  "msg_lighting_torches",
  "msg_summoning_familiar",
  "msg_checking_sheets",
  "msg_entering_dungeon",
  "msg_consulting_oracle",
  "msg_polishing_armor",
] as const;

const ICONS_TO_SHOW = 3;
const ICON_DURATION_MS = 1000;
const MIN_DISPLAY_MS = ICONS_TO_SHOW * ICON_DURATION_MS; // 3s
const DASHBOARD_WELCOME_LOADER_SESSION_KEY = "dashboardWelcomeLoaderShown";

/**
 * RPG-themed loading screen shown once per browser session on first dashboard visit.
 * Auto-dismisses after ~3s. SVG icons cycle with flavor text to mask RSC/data loading.
 */
export function DashboardLoadingScreen() {
  const t = useTranslations("dashboard_loading");

  const [showLoader, setShowLoader] = useState(false);
  const [iconSlot, setIconSlot] = useState(0);
  const [pickedIcons, setPickedIcons] = useState([0, 1, 2]);
  const [pickedMessages, setPickedMessages] = useState([0, 1, 2]);

  useEffect(() => {
    // Show loader once per browser session (first dashboard visit)
    let hasShownInSession = false;
    try {
      hasShownInSession = sessionStorage.getItem(DASHBOARD_WELCOME_LOADER_SESSION_KEY) === "1";
    } catch {
      hasShownInSession = false;
    }

    const url = new URL(window.location.href);
    const forceWelcome = url.searchParams.has("welcome");

    // Clean ?welcome param from URL bar
    if (forceWelcome) {
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    if (hasShownInSession && !forceWelcome) {
      return;
    }

    try {
      sessionStorage.setItem(DASHBOARD_WELCOME_LOADER_SESSION_KEY, "1");
    } catch {
      // sessionStorage can fail in restricted contexts; loader still works for this visit
    }

    setShowLoader(true);
    setIconSlot(0);
    setPickedIcons(pickRandom(RPG_ICON_COMPONENTS.length, ICONS_TO_SHOW));
    setPickedMessages(pickRandom(LOADING_MESSAGE_KEYS.length, ICONS_TO_SHOW));

    const timer = setTimeout(() => {
      setShowLoader(false);
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Cycle through icons
  useEffect(() => {
    if (!showLoader) return;
    const interval = setInterval(() => {
      setIconSlot((i) => Math.min(i + 1, ICONS_TO_SHOW - 1));
    }, ICON_DURATION_MS);
    return () => clearInterval(interval);
  }, [showLoader]);

  if (!showLoader) return null;

  const CurrentIcon = RPG_ICON_COMPONENTS[pickedIcons[iconSlot]];

  return (
    <div
      className="fixed inset-0 z-[10010]"
      style={{ pointerEvents: showLoader ? "auto" : "none" }}
      aria-hidden={!showLoader}
    >
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="dashboard-loader"
            className="w-full h-full flex flex-col items-center justify-center bg-surface-primary"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Cycling RPG icon */}
            <AnimatePresence mode="wait">
              <motion.div
                key={iconSlot}
                className="text-gold w-16 h-16 mb-6"
                initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.7, rotate: 10 }}
                transition={{ duration: 0.2 }}
              >
                <CurrentIcon className="w-full h-full" />
              </motion.div>
            </AnimatePresence>

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
                key={iconSlot}
                className="text-sm text-muted-foreground/70 font-medium"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {t(LOADING_MESSAGE_KEYS[pickedMessages[iconSlot]])}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
