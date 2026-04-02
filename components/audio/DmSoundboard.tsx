"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Volume2, Square, X } from "lucide-react";
import { useAudioStore } from "@/lib/stores/audio-store";
import { getAmbientPresets, getMusicPresets, getSfxPresets } from "@/lib/utils/audio-presets";
import { isTurnSfxEnabled, setTurnSfxEnabled } from "@/lib/utils/turn-sfx";

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

  const isLoopActive = useAudioStore((s) => s.isLoopActive);
  const activeLoops = useAudioStore((s) => s.activeLoops);
  const playAmbient = useAudioStore((s) => s.playAmbient);
  const stopLoop = useAudioStore((s) => s.stopLoop);
  const playSound = useAudioStore((s) => s.playSound);
  const stopAllAudio = useAudioStore((s) => s.stopAllAudio);

  const ambientPresets = getAmbientPresets();
  const musicPresets = getMusicPresets();
  const sfxPresets = getSfxPresets();

  const [turnSfx, setTurnSfx] = useState(isTurnSfxEnabled);

  const handleTurnSfxToggle = useCallback(() => {
    const next = !turnSfx;
    setTurnSfx(next);
    setTurnSfxEnabled(next);
  }, [turnSfx]);

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
      const wasPlaying = isLoopActive(presetId);
      playAmbient(presetId);

      if (onBroadcast) {
        if (wasPlaying) {
          onBroadcast("audio:loop_stop", { sound_id: presetId });
        } else {
          onBroadcast("audio:ambient_start", { sound_id: presetId });
        }
      }
    },
    [isLoopActive, playAmbient, onBroadcast]
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
            const isActive = isLoopActive(preset.id);
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

        {activeLoops.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-emerald-400">
                🎵 {t("now_playing_count", { count: activeLoops.length })}
              </span>
              <button
                type="button"
                onClick={() => { stopAllAudio(); onBroadcast?.("audio:ambient_stop", {}); }}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 min-h-[36px]"
              >
                <Square className="w-3 h-3" />
                {t("dm_stop_all")}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeLoops.map((loop) => (
                <span
                  key={loop.id}
                  className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full px-2 py-0.5 text-xs"
                >
                  {loop.icon} {t(`preset_${loop.label?.replace("ambient-", "ambient_").replace("music-", "music_")}` as Parameters<typeof t>[0])}
                  <button
                    type="button"
                    onClick={() => {
                      stopLoop(loop.id);
                      onBroadcast?.("audio:loop_stop", { sound_id: loop.id });
                    }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
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
          isOpen || activeLoops.length > 0
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label={t("dm_soundboard")}
        title={t("dm_soundboard")}
      >
        <Volume2 className="w-4 h-4" />
        {activeLoops.length > 0 && (
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
              {activeLoops.length > 0 && (
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

            {/* Turn SFX toggle */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs text-muted-foreground">{t("turn_sfx_toggle")}</span>
              <button
                type="button"
                onClick={handleTurnSfxToggle}
                className={`relative w-8 h-4 rounded-full transition-colors ${
                  turnSfx ? "bg-gold/60" : "bg-white/10"
                }`}
                aria-label={t("turn_sfx_toggle")}
                data-testid="turn-sfx-toggle"
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
                    turnSfx ? "translate-x-4 bg-gold" : "translate-x-0.5 bg-gray-500"
                  }`}
                />
              </button>
            </div>

            {/* Now Playing chips */}
            {activeLoops.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center mb-1.5">
                  <span className="text-xs font-medium text-emerald-400">
                    🎵 {t("now_playing_count", { count: activeLoops.length })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeLoops.map((loop) => (
                    <span
                      key={loop.id}
                      className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full px-2 py-0.5 text-[10px]"
                    >
                      {loop.icon} {t(`preset_${loop.label?.replace("ambient-", "ambient_").replace("music-", "music_")}` as Parameters<typeof t>[0])}
                      <button
                        type="button"
                        onClick={() => {
                          stopLoop(loop.id);
                          onBroadcast?.("audio:loop_stop", { sound_id: loop.id });
                        }}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ambient Section */}
            <h4 className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wider">
              {t("dm_ambient_section")}
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-1">
              {ambientPresets.map((preset) => {
                const isActive = isLoopActive(preset.id);
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

            {/* Music Section */}
            <h4 className="text-muted-foreground text-xs font-medium mb-2 mt-3 uppercase tracking-wider">
              {t("dm_music_section")}
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {musicPresets.map((preset) => {
                const isActive = isLoopActive(preset.id);
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
