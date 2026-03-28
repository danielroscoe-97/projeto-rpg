/** Preset sound effect bundled with the app (static in /public/sounds/sfx/) */
export interface AudioPreset {
  id: string;
  name_key: string;
  file: string;
  icon: string;
  category: "attack" | "magic" | "defense" | "dramatic" | "ambient";
}

/** Player-uploaded audio file record from the database */
export interface PlayerAudioFile {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  created_at: string;
}

/** Payload for audio:play_sound broadcast events */
export interface AudioPlayEvent {
  sound_id: string;
  source: "preset" | "custom";
  player_name: string;
  /** Signed URL for custom sounds (DM resolves presets locally) */
  audio_url?: string;
}
