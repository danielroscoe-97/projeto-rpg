"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { CustomSoundCard, type CustomSound } from "@/components/audio/CustomSoundCard";
import { CustomSoundUploader } from "@/components/audio/CustomSoundUploader";
import {
  getAmbientPresets,
  getMusicPresets,
  getSfxPresets,
} from "@/lib/utils/audio-presets";
import { useAudioStore } from "@/lib/stores/audio-store";
import { Play, Square, X } from "lucide-react";

type PresetTab = "ambient" | "music" | "sfx";

export function SoundboardPageClient({ title }: { title: string }) {
  const t = useTranslations("soundboard");
  const tAudio = useTranslations("audio");
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [presetTab, setPresetTab] = useState<PresetTab>("ambient");

  const isLoopActive = useAudioStore((s) => s.isLoopActive);
  const activeLoops = useAudioStore((s) => s.activeLoops);
  const playAmbient = useAudioStore((s) => s.playAmbient);
  const stopLoop = useAudioStore((s) => s.stopLoop);
  const stopAllAudio = useAudioStore((s) => s.stopAllAudio);
  const playSound = useAudioStore((s) => s.playSound);

  const ambientPresets = getAmbientPresets();
  const musicPresets = getMusicPresets();
  const sfxPresets = getSfxPresets();

  const presetsByTab = {
    ambient: ambientPresets,
    music: musicPresets,
    sfx: sfxPresets,
  };

  const loadSounds = useCallback(async () => {
    try {
      const res = await fetch("/api/dm-audio");
      if (res.ok) {
        const { data } = await res.json();
        setCustomSounds(data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSounds();
  }, [loadSounds]);

  const handleSoundUploaded = (sound: CustomSound) => {
    setCustomSounds((prev) => [...prev, sound]);
  };

  const handleSoundDeleted = (id: string) => {
    setCustomSounds((prev) => prev.filter((s) => s.id !== id));
  };

  const presetTabs: { id: PresetTab; label: string }[] = [
    { id: "ambient", label: t("tab_ambient") },
    { id: "music", label: t("tab_music") },
    { id: "sfx", label: t("tab_sfx") },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">{title}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {/* ── Custom Sounds Section ── */}
      <section className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            🎤 {t("my_sounds")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {customSounds.length}/5
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-24 bg-white/[0.04] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {customSounds.map((sound) => (
              <CustomSoundCard
                key={sound.id}
                sound={sound}
                onDelete={handleSoundDeleted}
              />
            ))}
            <CustomSoundUploader
              currentCount={customSounds.length}
              onUploaded={handleSoundUploaded}
            />
          </div>
        )}
      </section>

      {/* ── Presets Section ── */}
      <section className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          🎵 {t("presets")}
        </h2>

        {/* Preset tabs */}
        <div className="flex gap-2 mb-4">
          {presetTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPresetTab(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all min-h-[36px] ${
                presetTab === tab.id
                  ? "bg-gold/15 text-gold border border-gold/30"
                  : "text-muted-foreground border border-border hover:text-foreground hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Now Playing bar */}
        {activeLoops.length > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-400">
                🎵 {tAudio("now_playing_count", { count: activeLoops.length })}
              </span>
              <button
                type="button"
                onClick={() => stopAllAudio()}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 min-h-[28px] px-2"
              >
                <Square className="w-3 h-3" />
                {tAudio("dm_stop_all")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeLoops.map((loop) => (
                <span
                  key={loop.id}
                  className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full px-2.5 py-1 text-xs"
                >
                  {loop.icon} {tAudio(`preset_${loop.label?.replace("ambient-", "ambient_").replace("music-", "music_")}` as Parameters<typeof tAudio>[0])}
                  <button
                    type="button"
                    onClick={() => stopLoop(loop.id)}
                    className="hover:text-red-400 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preset grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {presetsByTab[presetTab].map((preset) => {
            const isActive = isLoopActive(preset.id);
            const isSfx = presetTab === "sfx";

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (isSfx) {
                    playSound(preset.id, "preset", "DM");
                  } else {
                    playAmbient(preset.id);
                  }
                }}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all min-h-[80px] ${
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-white/[0.06] text-foreground hover:bg-white/[0.1] border border-transparent"
                }`}
              >
                <span className="text-xl leading-none">{preset.icon}</span>
                <span className="text-[11px] text-center truncate w-full">
                  {tAudio(preset.name_key.replace("audio.", "") as Parameters<typeof tAudio>[0])}
                </span>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                )}
                <div className="mt-auto">
                  {isActive ? (
                    <Square className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Play className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
