"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useDragControls } from "framer-motion";
import { useTranslations } from "next-intl";
import { Square, Minimize2, X } from "lucide-react";
import { useAudioStore } from "@/lib/stores/audio-store";
import {
  getAmbientPresets,
  getMusicPresets,
  getSfxPresets,
} from "@/lib/utils/audio-presets";
import { AudioUploadManager } from "@/components/audio/AudioUploadManager";
// WEATHER_DISABLED (reintroduzir no futuro):
// import type { WeatherEffect } from "@/components/player/WeatherOverlay";

const SFX_COOLDOWN_MS = 1500;
const STORAGE_KEY = "pocket-dm-atmosphere-position";

type Tab = "ambient" | "music" | "sfx" | "uploads" | "volume";

interface SavedState {
  x: number;
  y: number;
  collapsed: boolean;
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { x: -1, y: -1, collapsed: false };
}

function savePanelState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// WEATHER_DISABLED (reintroduzir no futuro):
// const WEATHER_OPTIONS: { id: WeatherEffect; emoji: string }[] = [
//   { id: "none", emoji: "----" },
//   { id: "rain", emoji: "🌧️" },
//   { id: "snow", emoji: "❄️" },
//   { id: "fog", emoji: "🌫️" },
//   { id: "storm", emoji: "⛈️" },
//   { id: "ash", emoji: "🌋" },
// ];

interface DmAtmospherePanelProps {
  onBroadcast?: (event: string, payload: Record<string, unknown>) => void;
  // WEATHER_DISABLED (reintroduzir no futuro):
  // weatherEffect: WeatherEffect;
  // onWeatherChange: (effect: WeatherEffect) => void;
}

export function DmAtmospherePanel({
  onBroadcast,
  // WEATHER_DISABLED:
  // weatherEffect,
  // onWeatherChange,
}: DmAtmospherePanelProps) {
  const t = useTranslations("audio");
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ambient");
  const [cooldownId, setCooldownId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const lastTriggerRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragControls = useDragControls();

  const isLoopActive = useAudioStore((s) => s.isLoopActive);
  const activeLoops = useAudioStore((s) => s.activeLoops);
  const playAmbient = useAudioStore((s) => s.playAmbient);
  const stopLoop = useAudioStore((s) => s.stopLoop);
  const playSound = useAudioStore((s) => s.playSound);
  const stopAllAudio = useAudioStore((s) => s.stopAllAudio);
  const volume = useAudioStore((s) => s.volume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const ambientPresets = getAmbientPresets();
  const musicPresets = getMusicPresets();
  const sfxPresets = getSfxPresets();

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved position on open
  useEffect(() => {
    if (!isOpen) return;
    const saved = loadSavedState();
    setCollapsed(saved.collapsed);
    if (saved.x >= 0 && saved.y >= 0) {
      // Clamp to viewport
      const maxX = window.innerWidth - (saved.collapsed ? 48 : 352);
      const maxY = window.innerHeight - (saved.collapsed ? 48 : 200);
      x.set(Math.min(saved.x, Math.max(0, maxX)));
      y.set(Math.min(saved.y, Math.max(0, maxY)));
    } else {
      // Default: bottom-right
      x.set(window.innerWidth - 372);
      y.set(window.innerHeight - 500);
    }
  }, [isOpen, x, y]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const persistState = useCallback((overrides?: Partial<SavedState>) => {
    savePanelState({
      x: x.get(),
      y: y.get(),
      collapsed,
      ...overrides,
    });
  }, [x, y, collapsed]);

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
      cooldownTimerRef.current = setTimeout(
        () => setCooldownId(null),
        SFX_COOLDOWN_MS
      );
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

  const toggleCollapse = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    persistState({ collapsed: next });
  }, [collapsed, persistState]);

  const hasActiveAudio = activeLoops.length > 0;
  // WEATHER_DISABLED: const hasActiveWeather = weatherEffect !== "none";
  const hasActiveAnything = hasActiveAudio;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "ambient", label: t("dm_ambient_section"), icon: "🔥" },
    { id: "music", label: t("dm_music_section"), icon: "🎵" },
    { id: "sfx", label: "SFX", icon: "⚔️" },
    { id: "uploads", label: t("my_sounds"), icon: "📁" },
    { id: "volume", label: "Volume", icon: isMuted ? "🔇" : "🔊" },
  ];

  // ── Floating panel content (rendered via portal) ──────────────────────────

  const floatingPanel = isOpen && mounted ? createPortal(
    <AnimatePresence>
      {collapsed ? (
        /* ── Collapsed: floating circle ── */
        <motion.div
          key="collapsed"
          drag
          dragMomentum={false}
          dragElastic={0}
          style={{ x, y }}
          onDragEnd={() => persistState({ collapsed: true })}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          className="fixed top-0 left-0 z-[60] w-12 h-12 bg-card border border-border rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        >
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full h-full flex items-center justify-center"
          >
            <span className="text-lg">🎭</span>
            {hasActiveAnything && (
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </motion.div>
      ) : (
        /* ── Expanded: full panel ── */
        <motion.div
          key="expanded"
          drag
          dragMomentum={false}
          dragElastic={0}
          dragControls={dragControls}
          dragListener={false}
          style={{ x, y }}
          onDragEnd={() => persistState({ collapsed: false })}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed top-0 left-0 z-[60] w-[352px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden select-none"
        >
          {/* Drag handle / header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <span className="text-xs text-gold font-medium flex items-center gap-1.5 pointer-events-none">
              🎭 {t("atmosphere_label")}
              {hasActiveAnything && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setIsOpen(false); persistState(); }}
                className="p-1 text-muted-foreground hover:text-red-400 transition-colors rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Now playing banner — shown above tabs when loops are active */}
          {hasActiveAudio && (
            <div className="px-3 py-2 border-b border-border bg-emerald-500/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-emerald-400">
                  🎵 {t("now_playing_count", { count: activeLoops.length })}
                </span>
                <button
                  type="button"
                  onClick={handleStopAll}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 min-h-[24px] px-1"
                >
                  <Square className="w-3 h-3" />
                  {t("dm_stop_all")}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeLoops.map((loop) => (
                  <span
                    key={loop.id}
                    className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {loop.icon} {t(loop.label as Parameters<typeof t>[0])}
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

          {/* Tab bar */}
          <div className="flex border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[9px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-gold border-b-2 border-gold bg-gold/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                <span className="leading-tight text-center">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* === AMBIENTE TAB === */}
            {activeTab === "ambient" && (
              <div className="grid grid-cols-3 gap-2">
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
            )}

            {/* === MÚSICAS TAB === */}
            {activeTab === "music" && (
              <div className="grid grid-cols-3 gap-2">
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
            )}

            {/* === SFX TAB === */}
            {activeTab === "sfx" && (
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
            )}

            {/* === UPLOADS (MEUS SONS) TAB === */}
            {activeTab === "uploads" && (
              <AudioUploadManager />
            )}

            {/* === VOLUME TAB === */}
            {activeTab === "volume" && (
              <div>
                <p className="text-xs text-muted-foreground mb-3">{t("dm_volume")}</p>
                <div className="flex items-center gap-3 mb-4">
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
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-full px-3 py-2.5 text-sm rounded-md transition-colors min-h-[36px] ${
                    isMuted
                      ? "bg-red-900/20 text-red-400 hover:bg-red-900/40"
                      : "bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
                  }`}
                  data-testid="dm-mute-toggle"
                >
                  {isMuted ? `🔇 ${t("dm_muted")}` : `🔊 ${t("dm_unmuted")}`}
                </button>
              </div>
            )}

            {/* WEATHER_DISABLED (reintroduzir no futuro): */}
            {/* === WEATHER TAB === */}
            {/* {activeTab === "weather" && (
              <div>
                <p className="text-muted-foreground text-xs mb-3">
                  {tCombat("weather_title")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {WEATHER_OPTIONS.map((opt) => {
                    const isActive = weatherEffect === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onWeatherChange(opt.id)}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-sm transition-all min-h-[60px] ${
                          isActive
                            ? "border-2 border-gold bg-gold/10 text-foreground"
                            : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] border border-transparent"
                        }`}
                        aria-pressed={isActive}
                        data-testid={`weather-btn-${opt.id}`}
                      >
                        <span className="text-lg leading-none">{opt.emoji}</span>
                        <span className="text-[10px] leading-tight text-center">
                          {tCombat(`weather_${opt.id}` as Parameters<typeof tCombat>[0])}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )} */}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  // ── Toolbar toggle button ─────────────────────────────────────────────────

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`px-2.5 py-2 text-sm min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-md transition-all duration-200 ${
          isOpen || hasActiveAnything
            ? "bg-gold/10 text-gold border border-gold/30"
            : "text-muted-foreground hover:text-foreground bg-white/[0.04]"
        }`}
        aria-label={t("atmosphere_label")}
        title={t("atmosphere_label")}
        data-testid="atmosphere-btn"
      >
        <span className="text-base">🎭</span>
        <span className="hidden sm:inline text-xs">{t("atmosphere_label")}</span>
        {hasActiveAnything && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>
      {floatingPanel}
    </>
  );
}
