"use client";

import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import { useAudioAutoplay } from "@/lib/hooks/useAudioAutoplay";

/**
 * Mobile autoplay unlock banner — Story 4.
 *
 * Shows a tappable banner when the browser's AudioContext is suspended
 * (common on iOS/Android). On tap, resumes the AudioContext and unlocks
 * HTMLAudioElement.play() for programmatic audio playback.
 *
 * Saves preference in localStorage so the banner doesn't reappear
 * after a successful unlock.
 */
export function AudioUnlockBanner() {
  const t = useTranslations("audio");
  const { needsUnlock, unlock } = useAudioAutoplay();

  if (!needsUnlock) return null;

  return (
    <button
      type="button"
      onClick={unlock}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold/10 border border-gold/20 rounded-lg text-sm text-gold hover:bg-gold/20 transition-colors min-h-[48px] animate-in fade-in duration-300"
      data-testid="audio-unlock-banner"
    >
      <Volume2 className="w-4 h-4 shrink-0" />
      <span>{t("tap_to_enable_sound")}</span>
    </button>
  );
}
