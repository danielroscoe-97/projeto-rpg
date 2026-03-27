"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAudioStore } from "@/lib/stores/audio-store";

export function DmAudioControls() {
  const t = useTranslations("audio");
  const [isOpen, setIsOpen] = useState(false);
  const volume = useAudioStore((s) => s.volume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const lastSoundLabel = useAudioStore((s) => s.lastSoundLabel);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const volumeIcon = isMuted ? "🔇" : volume < 0.3 ? "🔈" : "🔊";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
        aria-label={t("dm_volume")}
        title={t("dm_volume")}
        data-testid="dm-audio-controls-btn"
      >
        <span className="text-base">{volumeIcon}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg p-4 shadow-xl z-50"
          data-testid="dm-audio-popover"
        >
          <h4 className="text-foreground text-sm font-medium mb-3">{t("dm_volume")}</h4>

          {/* Volume slider */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-muted-foreground">🔈</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="flex-1 h-2 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-gold"
              aria-label={t("dm_volume")}
              data-testid="dm-volume-slider"
            />
            <span className="text-sm text-muted-foreground w-8 text-right font-mono">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors min-h-[36px] ${
              isMuted
                ? "bg-red-900/20 text-red-400 hover:bg-red-900/40"
                : "bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
            }`}
            data-testid="dm-mute-toggle"
          >
            {isMuted ? `🔇 ${t("dm_muted")}` : `🔊 ${t("dm_unmuted")}`}
          </button>

          {/* Last sound indicator */}
          {lastSoundLabel && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-muted-foreground text-xs">
                {t("last_sound")}: <span className="text-foreground">{lastSoundLabel}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
