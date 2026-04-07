"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

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

/** Pick N random unique indices from an array of length `total`. */
function pickRandom(total: number, count: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function D20Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,2 58,18 58,46 32,62 6,46 6,18" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <polygon points="32,2 58,18 32,34 6,18" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
      <line x1="32" y1="34" x2="32" y2="62" stroke="currentColor" strokeWidth="1.5" />
      <line x1="32" y1="34" x2="58" y2="46" stroke="currentColor" strokeWidth="1.5" />
      <line x1="32" y1="34" x2="6" y2="46" stroke="currentColor" strokeWidth="1.5" />
      <text x="32" y="28" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor" fontFamily="system-ui">20</text>
    </svg>
  );
}

function WizardHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L18 48h28L32 4z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
      <ellipse cx="32" cy="52" rx="24" ry="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="28" cy="24" r="2" fill="currentColor" fillOpacity="0.4" />
      <circle cx="34" cy="32" r="1.5" fill="currentColor" fillOpacity="0.4" />
      <circle cx="30" cy="40" r="2.5" fill="currentColor" fillOpacity="0.4" />
      <path d="M36 8l4-4m-2 6l5 1m-8 2l3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function SwordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="32" y1="4" x2="32" y2="42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <polygon points="28,4 32,0 36,4 36,12 28,12" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <rect x="22" y="42" width="20" height="5" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
      <rect x="29" y="47" width="6" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
      <circle cx="32" cy="61" r="2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function SpellBookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="6" width="40" height="52" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M18 6v52" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="8" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
      <rect x="14" y="52" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
      <circle cx="36" cy="28" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M36 20v16M28 28h16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <path d="M30.34 22.34l11.32 11.32M42.34 22.34L30.34 33.66" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="24" y1="42" x2="48" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="24" y1="46" x2="42" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function PotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
      <path d="M26 14l-8 24c-2 6 2 18 14 18s16-12 14-18L38 14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
      <path d="M20 38c4-3 10-3 14 0s10 3 12 0" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="28" cy="44" r="2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="36" cy="48" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="32" cy="42" r="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L8 16v18c0 14 10 22 24 26 14-4 24-12 24-26V16L32 4z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M32 12L14 20v14c0 10 8 17 18 20" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M32 28l-6-4v-4l6-4 6 4v4l-6 4z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function ScrollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 12c0-4 4-8 8-8h24c4 0 4 8 0 8" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="16" y="12" width="32" height="36" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M16 48c0 4 4 8 8 8h24c4 0 4-8 0-8" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="24" y1="22" x2="40" y2="22" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="34" x2="36" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="40" x2="38" y2="40" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

function DragonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 40c-4 4-8 10-6 14 1 2 4 2 6 0l4-6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M24 28c-6 2-12 6-12 12s4 6 8 4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <ellipse cx="34" cy="34" rx="14" ry="10" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
      <path d="M46 28c4-6 8-14 10-18-4 2-10 6-12 10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M22 30l-8-12 6 4-2-8 6 6 2-6 2 8 4-4-2 8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <circle cx="28" cy="32" r="2" fill="currentColor" fillOpacity="0.5" />
      <path d="M48 34c2 0 6-1 8-2-2 3-6 5-8 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

const ICON_COMPONENTS = [D20Icon, WizardHatIcon, SwordIcon, SpellBookIcon, PotionIcon, ShieldIcon, ScrollIcon, DragonIcon];

/**
 * RPG-themed loading screen shown after login.
 * Triggered by ?welcome=1 URL param, auto-dismisses after ~2.4s.
 * SVG icons cycle with flavor text to mask RSC/data loading.
 */
export function DashboardLoadingScreen() {
  const t = useTranslations("dashboard_loading");

  const [showLoader, setShowLoader] = useState(false);
  const [iconSlot, setIconSlot] = useState(0);
  const [pickedIcons, setPickedIcons] = useState([0, 1, 2, 3]);
  const [pickedMessages, setPickedMessages] = useState([0, 1, 2, 3]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const shouldShowWelcomeLoader = url.searchParams.get("welcome") === "1";

    if (!shouldShowWelcomeLoader) {
      return;
    }

    let hasShownInSession = false;
    try {
      hasShownInSession = sessionStorage.getItem(DASHBOARD_WELCOME_LOADER_SESSION_KEY) === "1";
    } catch {
      hasShownInSession = false;
    }

    if (hasShownInSession) {
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
      return;
    }

    try {
      sessionStorage.setItem(DASHBOARD_WELCOME_LOADER_SESSION_KEY, "1");
    } catch {
      // sessionStorage can fail in restricted contexts; loader still works for this visit
    }

    setShowLoader(true);
    setIconSlot(0);
    setPickedIcons(pickRandom(ICON_COMPONENTS.length, ICONS_TO_SHOW));
    setPickedMessages(pickRandom(LOADING_MESSAGE_KEYS.length, ICONS_TO_SHOW));

    const timer = setTimeout(() => {
      setShowLoader(false);
      if (url.searchParams.has("welcome")) {
        url.searchParams.delete("welcome");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
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

  const CurrentIcon = ICON_COMPONENTS[pickedIcons[iconSlot]];

  return (
    <div
      className="fixed inset-0 z-[9999]"
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
