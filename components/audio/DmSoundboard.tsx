"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Volume2, Square } from "lucide-react";
import { useAudioStore } from "@/lib/stores/audio-store";
import { getAmbientPresets, getMusicPresets, getSfxPresets } from "@/lib/utils/audio-presets";

const SFX_COOLDOWN_MS = 1500;

interface DmSoundboardProps {
  /** Callback to broadcast events to players (combat mode). If omitted, sounds play locally only (dashboard). */
  onBroadcast?: (event: string, payload: Record<string, unknown>) => void;
  /** When true, only show ambient sounds (dashboard mode) */
  ambientOnly?: boolean;
}

export function DmSoundboard({ onBroadcast, ambientOnly = false }: DmSoundboardProps) {
  const t = useTranslations("audio");
  const [isOpen, setIsOpen] = useState(false);
  const [cooldownId, setCooldownId] = useState<string | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeAmbientId = useAudioStore((s) => s.activeAmbientId);
  const playAmbient = useAudioStore((s) => s.playAmbient);
  const stopAmbient = useAudioStore((s) => s.stopAmbient);
  const playSound = useAudioStore((s) => s.playSound);
  const stopAllAudio = useAudioStore((s) => s.stopAllAudio);

  const ambientPresets = getAmbientPresets();
  const musicPresets = getMusicPresets();
  const sfxPresets = getSfxPresets();

  // Cleanup
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  const handleAmbientToggle = useCallback(
    (presetId: string) => {
      const wasPlaying = activeAmbientId === presetId;
      playAmbient(presetId);

      if (onBroadcast) {
        if (wasPlaying) {
          onBroadcast("audio:ambient_stop", {});
        } else {
          onBroadcast("audio:ambient_start", { sound_id: presetId });
        }
      }
    },
    [activeAmbientId, playAmbient, onBroadcast]
  );

  const handleSfxPlay = useCallback(
    (soundId: string) => {
      const now = Date.now();
      if (now - lastTriggerRef.current < SFX_COOLDOWN_MS) return;
      lastTriggerRef.current = now;

      setCooldownId(soundId);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => setCooldownId(null), SFX_COOLDOWN_MS);

      playSound(soundId, "preset", "DM");

      onBroadcast?.("audio:play_sound", {
        sound_id: soundId,
        source: "preset",
        player_name: "DM",
      });
    },
    [playSound, onBroadcast]
  );

  const handleStopAll = useCallback(() => {
    stopAllAudio();
    onBroadcast?.("audio:ambient_stop", {});
  }, [stopAllAudio, onBroadcast]);

  // Inline ambient bar for dashboard mode
  if (ambientOnly) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {t("dashboard_ambient_title")}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {ambientPresets.map((preset) => {
            const isActive = activeAmbientId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAmbientToggle(preset.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all min-h-[44px] ${
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-white/[0.06] text-foreground hover:bg-white/[0.1] border border-transparent"
                }`}
                title={t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
              >
                <span className="text-base">{preset.icon}</span>
                <span className="text-xs hidden sm:inline">
                  {t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {activeAmbientId && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-emerald-400">
              {t("dm_ambient_playing", {
                name: t(
                  `preset_${activeAmbientId.replace("ambient-", "ambient_")}` as Parameters<typeof t>[0]
                ),
              })}
            </span>
            <button
              type="button"
              onClick={() => { stopAmbient(); onBroadcast?.("audio:ambient_stop", {}); }}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 min-h-[36px]"
            >
              <Square className="w-3 h-3" />
              {t("dm_stop_ambient")}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full soundboard FAB + panel for combat
  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`px-2 py-2 text-sm min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md transition-colors ${
          isOpen || activeAmbientId
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label={t("dm_soundboard")}
        title={t("dm_soundboard")}
      >
        <Volume2 className="w-4 h-4" />
        {activeAmbientId && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-xl p-4 shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground text-sm font-semibold">{t("dm_soundboard")}</h3>
              {(activeAmbientId) && (
                <button
                  type="button"
                  onClick={handleStopAll}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 min-h-[36px] px-2"
                >
                  <Square className="w-3 h-3" />
                  {t("dm_stop_all")}
                </button>
              )}
            </div>

            {/* Ambient Section */}
            <h4 className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wider">
              {t("dm_ambient_section")}
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-1">
              {ambientPresets.map((preset) => {
                const isActive = activeAmbientId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAmbientToggle(preset.id)}
                    className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                      isActive
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        : "bg-white/[0.06] text-foreground hover:bg-white/[0.1] border border-transparent"
                    }`}
                  >
                    <span className="text-lg leading-none">{preset.icon}</span>
                    <span className="text-[10px] leading-tight text-center truncate w-full">
                      {t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
                    </span>
                    {isActive && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active ambient indicator */}
            {activeAmbientId && (
              <div className="flex items-center justify-between mb-3 mt-1 px-1">
                <span className="text-xs text-emerald-400">
                  {t("dm_ambient_playing", {
                    name: t(
                      `preset_${activeAmbientId.replace("ambient-", "ambient_")}` as Parameters<typeof t>[0]
                    ),
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => { stopAmbient(); onBroadcast?.("audio:ambient_stop", {}); }}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  {t("dm_stop_ambient")}
                </button>
              </div>
            )}

            {/* Music Section */}
            <h4 className="text-muted-foreground text-xs font-medium mb-2 mt-3 uppercase tracking-wider">
              {t("dm_music_section")}
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {musicPresets.map((preset) => {
                const isActive = activeAmbientId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAmbientToggle(preset.id)}
                    className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                      isActive
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                        : "bg-white/[0.06] text-foreground hover:bg-white/[0.1] border border-transparent"
                    }`}
                  >
                    <span className="text-lg leading-none">{preset.icon}</span>
                    <span className="text-[10px] leading-tight text-center truncate w-full">
                      {t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
                    </span>
                    {isActive && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* SFX Section */}
            <h4 className="text-muted-foreground text-xs font-medium mb-2 mt-3 uppercase tracking-wider">
              {t("dm_sfx_section")}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {sfxPresets.map((preset) => {
                const isCooling = cooldownId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isCooling}
                    onClick={() => handleSfxPlay(preset.id)}
                    className={`relative flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                      isCooling
                        ? "bg-white/[0.03] text-muted-foreground/40 cursor-not-allowed"
                        : "bg-white/[0.06] text-foreground active:bg-white/[0.12] hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="text-lg leading-none">{preset.icon}</span>
                    <span className="text-[10px] leading-tight text-center truncate w-full">
                      {t(preset.name_key.replace("audio.", "") as Parameters<typeof t>[0])}
                    </span>
                    {isCooling && (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold/30 animate-[shrink_1.5s_linear_forwards]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
