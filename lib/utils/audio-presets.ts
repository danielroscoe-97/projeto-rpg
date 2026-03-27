import type { AudioPreset } from "@/lib/types/audio";

const PRESETS: AudioPreset[] = [
  { id: "sword-hit", name_key: "audio.preset_sword_hit", file: "/sounds/sfx/sword-hit.mp3", icon: "\u2694\uFE0F", category: "attack" },
  { id: "fireball", name_key: "audio.preset_fireball", file: "/sounds/sfx/fireball.mp3", icon: "\uD83D\uDD25", category: "magic" },
  { id: "healing", name_key: "audio.preset_healing", file: "/sounds/sfx/healing.mp3", icon: "\uD83D\uDC9A", category: "magic" },
  { id: "thunder", name_key: "audio.preset_thunder", file: "/sounds/sfx/thunder.mp3", icon: "\u26A1", category: "magic" },
  { id: "death", name_key: "audio.preset_death", file: "/sounds/sfx/death.mp3", icon: "\uD83D\uDC80", category: "dramatic" },
  { id: "war-cry", name_key: "audio.preset_war_cry", file: "/sounds/sfx/war-cry.mp3", icon: "\uD83D\uDCEF", category: "dramatic" },
  { id: "shield", name_key: "audio.preset_shield", file: "/sounds/sfx/shield.mp3", icon: "\uD83D\uDEE1\uFE0F", category: "defense" },
  { id: "arrow", name_key: "audio.preset_arrow", file: "/sounds/sfx/arrow.mp3", icon: "\uD83C\uDFF9", category: "attack" },
  { id: "critical-hit", name_key: "audio.preset_critical_hit", file: "/sounds/sfx/critical-hit.mp3", icon: "\uD83C\uDFB2", category: "attack" },
  { id: "teleport", name_key: "audio.preset_teleport", file: "/sounds/sfx/teleport.mp3", icon: "\uD83C\uDF00", category: "magic" },
];

export function getPresetById(id: string): AudioPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function getAllPresets(): AudioPreset[] {
  return PRESETS;
}
