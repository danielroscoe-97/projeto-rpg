import { useAudioStore } from "@/lib/stores/audio-store";

const LS_KEY = "dm_turn_sfx_enabled";
const TURN_SFX_PATH = "/sounds/sfx/page-flip.mp3";

let cachedAudio: HTMLAudioElement | null = null;

export function isTurnSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
}

export function setTurnSfxEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function playTurnSfx(): void {
  if (!isTurnSfxEnabled()) return;

  const { isMuted, volume } = useAudioStore.getState();
  if (isMuted) return;

  if (!cachedAudio) {
    cachedAudio = new Audio(TURN_SFX_PATH);
  }
  cachedAudio.volume = Math.min(volume, 0.5);
  cachedAudio.currentTime = 0;
  cachedAudio.play().catch(() => {});
}
