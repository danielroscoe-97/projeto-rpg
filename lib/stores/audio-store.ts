"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { PlayerAudioFile } from "@/lib/types/audio";
import { getPresetById } from "@/lib/utils/audio-presets";

const LS_VOLUME_KEY = "dm_audio_volume";
const LS_MUTED_KEY = "dm_audio_muted";

function loadVolume(): number {
  if (typeof window === "undefined") return 0.7;
  const stored = localStorage.getItem(LS_VOLUME_KEY);
  if (stored !== null) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return 0.7;
}

function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_MUTED_KEY) === "true";
}

interface ActiveLoop {
  id: string;
  audio: HTMLAudioElement;
  icon?: string;
  label?: string;
}

interface AudioState {
  volume: number;
  isMuted: boolean;
  activeAudioId: string | null;
  activeAudio: HTMLAudioElement | null;
  lastSoundLabel: string | null;

  /** Multiple active ambient/music loops */
  activeLoops: ActiveLoop[];

  /** Legacy getter — returns first active loop id (backward compat) */
  activeAmbientId: string | null;
  activeAmbientAudio: HTMLAudioElement | null;

  /** Preloaded signed URLs for player custom audio */
  playerAudioUrls: Record<string, string>;
  preloadedAudio: Record<string, HTMLAudioElement>;

  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playSound: (soundId: string, source: "preset" | "custom", playerName: string, url?: string) => void;
  /** Toggle a loop on/off. Supports multiple simultaneous loops. */
  playAmbient: (presetId: string) => void;
  stopAmbient: () => void;
  stopLoop: (presetId: string) => void;
  stopAllAudio: () => void;
  isLoopActive: (presetId: string) => boolean;
  preloadPlayerAudio: (audioFiles: PlayerAudioFile[]) => Promise<void>;
  /** Update signed URLs and preloaded audio elements (used by URL refresh timer) */
  updatePlayerAudioUrls: (urls: Record<string, string>) => void;
  cleanup: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  volume: loadVolume(),
  isMuted: loadMuted(),
  activeAudioId: null,
  activeAudio: null,
  lastSoundLabel: null,
  activeLoops: [],
  activeAmbientId: null,
  activeAmbientAudio: null,
  playerAudioUrls: {},
  preloadedAudio: {},

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    localStorage.setItem(LS_VOLUME_KEY, String(clamped));
    const { activeAudio, activeLoops, isMuted } = get();
    const effectiveVol = isMuted ? 0 : clamped;
    if (activeAudio) activeAudio.volume = effectiveVol;
    for (const loop of activeLoops) {
      loop.audio.volume = effectiveVol;
    }
  },

  toggleMute: () => {
    const next = !get().isMuted;
    set({ isMuted: next });
    localStorage.setItem(LS_MUTED_KEY, String(next));
    const { activeAudio, activeLoops, volume } = get();
    const effectiveVol = next ? 0 : volume;
    if (activeAudio) activeAudio.volume = effectiveVol;
    for (const loop of activeLoops) {
      loop.audio.volume = effectiveVol;
    }
  },

  playSound: (soundId, source, playerName, url) => {
    const { isMuted, volume, activeAudio } = get();
    if (isMuted) return;

    // Stop any currently playing one-shot
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    let audioUrl: string | undefined;
    if (source === "preset") {
      const preset = getPresetById(soundId);
      if (!preset) return;
      audioUrl = preset.file;
    } else {
      audioUrl = url ?? get().playerAudioUrls[soundId];
    }
    if (!audioUrl) return;

    const preloaded = get().preloadedAudio[soundId];
    const audio = preloaded ?? new Audio(audioUrl);
    audio.volume = volume;
    audio.currentTime = 0;
    audio.loop = false;

    audio.play().catch(() => {});

    const preset = source === "preset" ? getPresetById(soundId) : null;
    const label = `${playerName}: ${preset?.icon ?? "🔊"} ${preset?.id ?? soundId}`;

    set({
      activeAudioId: soundId,
      activeAudio: audio,
      lastSoundLabel: label,
    });

    audio.onended = () => {
      set({ activeAudioId: null, activeAudio: null });
    };
  },

  playAmbient: (presetId) => {
    const { activeLoops, isMuted, volume } = get();

    // Toggle off if already active
    const existing = activeLoops.find((l) => l.id === presetId);
    if (existing) {
      existing.audio.pause();
      existing.audio.currentTime = 0;
      const newLoops = activeLoops.filter((l) => l.id !== presetId);
      set({
        activeLoops: newLoops,
        activeAmbientId: newLoops[0]?.id ?? null,
        activeAmbientAudio: newLoops[0]?.audio ?? null,
      });
      return;
    }

    const preset = getPresetById(presetId);
    if (!preset) return;

    const audio = new Audio(preset.file);
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(() => {});

    const newLoop: ActiveLoop = {
      id: presetId,
      audio,
      icon: preset.icon,
      label: preset.id,
    };
    const newLoops = [...activeLoops, newLoop];

    set({
      activeLoops: newLoops,
      activeAmbientId: newLoops[0]?.id ?? null,
      activeAmbientAudio: newLoops[0]?.audio ?? null,
      lastSoundLabel: `${preset.icon} ${preset.id}`,
    });
  },

  stopLoop: (presetId) => {
    const { activeLoops } = get();
    const loop = activeLoops.find((l) => l.id === presetId);
    if (loop) {
      loop.audio.pause();
      loop.audio.currentTime = 0;
    }
    const newLoops = activeLoops.filter((l) => l.id !== presetId);
    set({
      activeLoops: newLoops,
      activeAmbientId: newLoops[0]?.id ?? null,
      activeAmbientAudio: newLoops[0]?.audio ?? null,
    });
  },

  stopAmbient: () => {
    const { activeLoops } = get();
    for (const loop of activeLoops) {
      loop.audio.pause();
      loop.audio.currentTime = 0;
    }
    set({ activeLoops: [], activeAmbientId: null, activeAmbientAudio: null });
  },

  stopAllAudio: () => {
    const { activeAudio, activeLoops } = get();
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    for (const loop of activeLoops) {
      loop.audio.pause();
      loop.audio.currentTime = 0;
    }
    set({
      activeAudioId: null,
      activeAudio: null,
      activeLoops: [],
      activeAmbientId: null,
      activeAmbientAudio: null,
    });
  },

  isLoopActive: (presetId) => {
    return get().activeLoops.some((l) => l.id === presetId);
  },

  preloadPlayerAudio: async (audioFiles) => {
    if (audioFiles.length === 0) return;

    const existing = get().preloadedAudio;
    for (const file of audioFiles) {
      const old = existing[file.id];
      if (old) {
        old.pause();
        old.src = "";
      }
    }

    const supabase = createClient();
    const urls: Record<string, string> = {};
    const preloaded: Record<string, HTMLAudioElement> = {};

    for (const file of audioFiles) {
      try {
        const { data } = await supabase.storage
          .from("player-audio")
          .createSignedUrl(file.file_path, 3600);

        if (data?.signedUrl) {
          urls[file.id] = data.signedUrl;
          const audio = new Audio(data.signedUrl);
          audio.preload = "auto";
          audio.load();
          preloaded[file.id] = audio;
        }
      } catch {
        // Skip failed preloads
      }
    }

    set((state) => ({
      playerAudioUrls: { ...state.playerAudioUrls, ...urls },
      preloadedAudio: { ...state.preloadedAudio, ...preloaded },
    }));
  },

  updatePlayerAudioUrls: (urls) => {
    const { preloadedAudio } = get();
    // Clean up old preloaded elements and create new ones with fresh URLs
    const newPreloaded: Record<string, HTMLAudioElement> = {};
    for (const [id, url] of Object.entries(urls)) {
      const old = preloadedAudio[id];
      if (old) {
        old.pause();
        old.src = "";
      }
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.load();
      newPreloaded[id] = audio;
    }
    set({ playerAudioUrls: urls, preloadedAudio: newPreloaded });
  },

  cleanup: () => {
    const { activeAudio, activeLoops, preloadedAudio } = get();
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    for (const loop of activeLoops) {
      loop.audio.pause();
      loop.audio.currentTime = 0;
    }
    Object.values(preloadedAudio).forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    set({
      activeAudioId: null,
      activeAudio: null,
      activeLoops: [],
      activeAmbientId: null,
      activeAmbientAudio: null,
      playerAudioUrls: {},
      preloadedAudio: {},
      lastSoundLabel: null,
    });
  },
}));
