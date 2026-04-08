"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CustomSoundCard, type CustomSound } from "@/components/audio/CustomSoundCard";
import { CustomSoundUploader } from "@/components/audio/CustomSoundUploader";
import {
  getAmbientPresets,
  getMusicPresets,
  getSfxPresets,
} from "@/lib/utils/audio-presets";
import type { AudioPreset } from "@/lib/types/audio";
import { useAudioStore } from "@/lib/stores/audio-store";
import { DmAudioControls } from "@/components/audio/DmAudioControls";
import { Play, Square, X, Search } from "lucide-react";

const DM_PAGE_TABS = [
  { key: "ambient", icon: "🌿", categories: ["ambient"] as string[], isLoop: true },
  { key: "music", icon: "🎵", categories: ["music"] as string[], isLoop: true },
  { key: "attacks", icon: "⚔️", categories: ["attack", "defense"] as string[], isLoop: false },
  { key: "magic", icon: "✨", categories: ["magic"] as string[], isLoop: false },
  { key: "epic", icon: "🎭", categories: ["dramatic", "monster"] as string[], isLoop: false },
  { key: "world", icon: "🚪", categories: ["interaction"] as string[], isLoop: false },
] as const;

type PresetTab = (typeof DM_PAGE_TABS)[number]["key"];

export function SoundboardPageClient({ title }: { title: string }) {
  const t = useTranslations("soundboard");
  const tAudio = useTranslations("audio");
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [presetTab, setPresetTab] = useState<PresetTab>("ambient");
  const [search, setSearch] = useState("");

  const isLoopActive = useAudioStore((s) => s.isLoopActive);
  const activeLoops = useAudioStore((s) => s.activeLoops);
  const playAmbient = useAudioStore((s) => s.playAmbient);
  const stopLoop = useAudioStore((s) => s.stopLoop);
  const stopAllAudio = useAudioStore((s) => s.stopAllAudio);
  const playSound = useAudioStore((s) => s.playSound);
  const activeAudioId = useAudioStore((s) => s.activeAudioId);

  const ambientPresets = getAmbientPresets();
  const musicPresets = getMusicPresets();
  const sfxPresets = getSfxPresets();

  const allPresets = useMemo(
    () => [...ambientPresets, ...musicPresets, ...sfxPresets],
    [ambientPresets, musicPresets, sfxPresets]
  );

  const presetsByTab = useMemo(() => {
    const map = new Map<PresetTab, AudioPreset[]>();
    for (const tab of DM_PAGE_TABS) {
      map.set(
        tab.key,
        allPresets.filter((p) => tab.categories.includes(p.category))
      );
    }
    return map;
  }, [allPresets]);

  const activeTabDef = DM_PAGE_TABS.find((t) => t.key === presetTab)!;

  const filteredPresets = useMemo(() => {
    const tabPresets = presetsByTab.get(presetTab) ?? [];
    const trimmed = search.trim();
    if (!trimmed) return tabPresets;
    const q = trimmed.toLowerCase();
    return tabPresets.filter((p) => {
      const name = tAudio(p.name_key.replace("audio.", "") as Parameters<typeof tAudio>[0]);
      return name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [presetTab, presetsByTab, search, tAudio]);

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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">{title}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <DmAudioControls />
          {(activeLoops.length > 0 || activeAudioId) && (
            <button
              type="button"
              onClick={() => stopAllAudio()}
              className="px-3 py-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-1.5 min-h-[36px]"
            >
              <Square className="w-3.5 h-3.5" />
              {tAudio("dm_stop_all")}
            </button>
          )}
        </div>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            🎵 {t("presets")}
          </h2>
          {(activeLoops.length > 0 || activeAudioId) && (
            <button
              type="button"
              onClick={() => stopAllAudio()}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 min-h-[28px] px-2"
            >
              <Square className="w-3 h-3" />
              {tAudio("dm_stop_all")}
            </button>
          )}
        </div>

        {/* Preset tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {DM_PAGE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setPresetTab(tab.key); setSearch(""); }}
              className={`px-3 py-1.5 text-sm rounded-md transition-all min-h-[36px] flex items-center gap-1.5 ${
                presetTab === tab.key
                  ? "bg-gold/15 text-gold border border-gold/30"
                  : "text-muted-foreground border border-border hover:text-foreground hover:border-white/20"
              }`}
            >
              <span>{tab.icon}</span>
              {tAudio(`tab_${tab.key}` as Parameters<typeof tAudio>[0])}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tAudio("search_sfx")}
            className="w-full bg-white/[0.06] border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/50"
          />
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
                  {loop.icon} {tAudio(loop.label as Parameters<typeof tAudio>[0])}
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
        {filteredPresets.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filteredPresets.map((preset) => {
              const isLoop = activeTabDef.isLoop;
              const isActive = isLoop && isLoopActive(preset.id);
              const activeColor = presetTab === "music"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400";

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (isLoop) {
                      playAmbient(preset.id);
                    } else {
                      playSound(preset.id, "preset", "DM");
                    }
                  }}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all min-h-[80px] ${
                    isActive
                      ? activeColor
                      : "bg-white/[0.06] text-foreground hover:bg-white/[0.1] border border-transparent"
                  }`}
                >
                  <span className="text-xl leading-none">{preset.icon}</span>
                  <span className="text-[11px] text-center truncate w-full">
                    {tAudio(preset.name_key.replace("audio.", "") as Parameters<typeof tAudio>[0])}
                  </span>
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        presetTab === "music" ? "bg-amber-400" : "bg-emerald-400"
                      }`} />
                    </div>
                  )}
                  <div className="mt-auto">
                    {isActive ? (
                      <Square className={`w-3 h-3 ${presetTab === "music" ? "text-amber-400" : "text-emerald-400"}`} />
                    ) : (
                      <Play className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground/50 text-xs text-center py-6">—</p>
        )}
      </section>
    </div>
  );
}
