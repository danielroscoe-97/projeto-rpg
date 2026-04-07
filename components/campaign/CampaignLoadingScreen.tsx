"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { RPG_ICON_COMPONENTS, pickRandom } from "@/components/loading/RpgLoadingIcons";

const LOADING_MESSAGE_KEYS = [
  "msg_gathering_party",
  "msg_unfurling_map",
  "msg_loading_quests",
  "msg_preparing_battlefield",
  "msg_summoning_allies",
  "msg_reading_chronicle",
  "msg_setting_camp",
  "msg_scouting_ahead",
] as const;

const ICONS_TO_SHOW = 3;
const ICON_DURATION_MS = 1000;
const MIN_DISPLAY_MS = ICONS_TO_SHOW * ICON_DURATION_MS; // 3s
const CAMPAIGN_LOADER_SESSION_PREFIX = "campaignLoaderShown_";

/**
 * RPG-themed loading screen shown once per browser session on first visit to each campaign.
 * Auto-dismisses after ~3s. SVG icons cycle with flavor text to mask RSC/data loading.
 */
export function CampaignLoadingScreen({ campaignId }: { campaignId: string }) {
  const t = useTranslations("campaign_loading");

  const [showLoader, setShowLoader] = useState(false);
  const [iconSlot, setIconSlot] = useState(0);
  const [pickedIcons, setPickedIcons] = useState([0, 1, 2]);
  const [pickedMessages, setPickedMessages] = useState([0, 1, 2]);

  useEffect(() => {
    const sessionKey = `${CAMPAIGN_LOADER_SESSION_PREFIX}${campaignId}`;

    let hasShownInSession = false;
    try {
      hasShownInSession = sessionStorage.getItem(sessionKey) === "1";
    } catch {
      hasShownInSession = false;
    }

    if (hasShownInSession) {
      return;
    }

    try {
      sessionStorage.setItem(sessionKey, "1");
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
  }, [campaignId]);

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
      className="fixed inset-0 z-[9999]"
      style={{ pointerEvents: showLoader ? "auto" : "none" }}
      aria-hidden={!showLoader}
    >
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="campaign-loader"
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
