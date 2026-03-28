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

interface AudioState {
  volume: number;
  isMuted: boolean;
  activeAudioId: string | null;
  activeAudio: HTMLAudioElement | null;
  lastSoundLabel: string | null;

  /** Preloaded signed URLs for player custom audio */
  playerAudioUrls: Record<string, string>;
  preloadedAudio: Record<string, HTMLAudioElement>;

  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playSound: (soundId: string, source: "preset" | "custom", playerName: string, url?: string) => void;
  stopAllAudio: () => void;
  preloadPlayerAudio: (audioFiles: PlayerAudioFile[]) => Promise<void>;
  cleanup: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  volume: loadVolume(),
  isMuted: loadMuted(),
  activeAudioId: null,
  activeAudio: null,
  lastSoundLabel: null,
  playerAudioUrls: {},
  preloadedAudio: {},

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    localStorage.setItem(LS_VOLUME_KEY, String(clamped));
    // Update active audio volume
    const { activeAudio, isMuted } = get();
    if (activeAudio) activeAudio.volume = isMuted ? 0 : clamped;
  },

  toggleMute: () => {
    const next = !get().isMuted;
    set({ isMuted: next });
    localStorage.setItem(LS_MUTED_KEY, String(next));
    const { activeAudio, volume } = get();
    if (activeAudio) activeAudio.volume = next ? 0 : volume;
  },

  playSound: (soundId, source, playerName, url) => {
    const { isMuted, volume, activeAudio } = get();
    if (isMuted) return;

    // Stop any currently playing audio
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    // Resolve URL
    let audioUrl: string | undefined;
    if (source === "preset") {
      const preset = getPresetById(soundId);
      if (!preset) return;
      audioUrl = preset.file;
    } else {
      // Custom: use provided URL or try preloaded
      audioUrl = url ?? get().playerAudioUrls[soundId];
    }
    if (!audioUrl) return;

    // Check if we have a preloaded audio element
    const preloaded = get().preloadedAudio[soundId];
    const audio = preloaded ?? new Audio(audioUrl);
    audio.volume = volume;
    audio.currentTime = 0;

    // Ambient sounds loop continuously
    const preset = source === "preset" ? getPresetById(soundId) : null;
    audio.loop = preset?.category === "ambient";

    audio.play().catch(() => {
      // Browser blocked autoplay — ignored silently
    });

    const label = `${playerName}: ${preset?.icon ?? "🔊"} ${preset?.id ?? soundId}`;

    set({
      activeAudioId: soundId,
      activeAudio: audio,
      lastSoundLabel: label,
    });

    // Clear active state when audio ends
    audio.onended = () => {
      set({ activeAudioId: null, activeAudio: null });
    };
  },

  stopAllAudio: () => {
    const { activeAudio } = get();
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    set({ activeAudioId: null, activeAudio: null });
  },

  preloadPlayerAudio: async (audioFiles) => {
    if (audioFiles.length === 0) return;

    // Clean up existing preloaded audio for the same IDs to prevent memory leaks
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
          .createSignedUrl(file.file_path, 3600); // 1h expiry

        if (data?.signedUrl) {
          urls[file.id] = data.signedUrl;
          const audio = new Audio(data.signedUrl);
          audio.preload = "auto";
          audio.load();
          preloaded[file.id] = audio;
        }
      } catch {
        // Skip failed preloads — will fallback to on-demand
      }
    }

    set((state) => ({
      playerAudioUrls: { ...state.playerAudioUrls, ...urls },
      preloadedAudio: { ...state.preloadedAudio, ...preloaded },
    }));
  },

  cleanup: () => {
    const { activeAudio, preloadedAudio } = get();
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    // Release preloaded audio elements
    Object.values(preloadedAudio).forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    set({
      activeAudioId: null,
      activeAudio: null,
      playerAudioUrls: {},
      preloadedAudio: {},
      lastSoundLabel: null,
    });
  },
}));
