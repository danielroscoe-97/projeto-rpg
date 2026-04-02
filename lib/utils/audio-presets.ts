import type { AudioPreset } from "@/lib/types/audio";

/**
 * Beta curated preset library.
 *
 * SFX sources: Kenney.nl (CC0) + OpenGameArt/artisticdude (CC0)
 * Music sources: Kevin MacLeod / incompetech.com (CC-BY 3.0)
 * Ambient: project originals
 */
const PRESETS: AudioPreset[] = [
  // ── SFX — short one-shot sounds ─────────────────────────────
  { id: "sword-unsheathe", name_key: "audio.preset_sword_unsheathe", file: "/sounds/sfx/sword-unsheathe.mp3", icon: "\uD83D\uDDE1\uFE0F", category: "attack" },
  { id: "sword-swing", name_key: "audio.preset_sword_swing", file: "/sounds/sfx/sword-swing.mp3", icon: "\u2694\uFE0F", category: "attack" },
  { id: "axe-chop", name_key: "audio.preset_axe_chop", file: "/sounds/sfx/axe-chop.mp3", icon: "\uD83E\uDE93", category: "attack" },
  { id: "punch", name_key: "audio.preset_punch", file: "/sounds/sfx/punch.mp3", icon: "\uD83D\uDC4A", category: "attack" },
  { id: "spell", name_key: "audio.preset_spell", file: "/sounds/sfx/spell.mp3", icon: "\u2728", category: "magic" },
  { id: "magic-cast", name_key: "audio.preset_magic_cast", file: "/sounds/sfx/magic-cast.mp3", icon: "\uD83E\uDE84", category: "magic" },
  { id: "potion", name_key: "audio.preset_potion", file: "/sounds/sfx/potion.mp3", icon: "\uD83E\uDDEA", category: "magic" },
  { id: "door-creak", name_key: "audio.preset_door_creak", file: "/sounds/sfx/door-creak.mp3", icon: "\uD83D\uDEAA", category: "interaction" },
  { id: "chest-open", name_key: "audio.preset_chest_open", file: "/sounds/sfx/chest-open.mp3", icon: "\uD83D\uDCE6", category: "interaction" },
  { id: "coins", name_key: "audio.preset_coins", file: "/sounds/sfx/coins.mp3", icon: "\uD83D\uDCB0", category: "interaction" },
  { id: "monster-snarl", name_key: "audio.preset_monster_snarl", file: "/sounds/sfx/monster-snarl.mp3", icon: "\uD83D\uDC7E", category: "monster" },
  { id: "ogre-growl", name_key: "audio.preset_ogre_growl", file: "/sounds/sfx/ogre-growl.mp3", icon: "\uD83D\uDC79", category: "monster" },

  // ── SFX — RO-inspired spell effects (prototype reference) ──
  // Fire
  { id: "fire-bolt", name_key: "audio.preset_fire_bolt", file: "/sounds/sfx/fire-bolt.mp3", icon: "\uD83D\uDD25", category: "magic" },
  { id: "fire-wall", name_key: "audio.preset_fire_wall", file: "/sounds/sfx/fire-wall.mp3", icon: "\uD83E\uDDE8", category: "magic" },
  { id: "meteor-storm", name_key: "audio.preset_meteor_storm", file: "/sounds/sfx/meteor-storm.mp3", icon: "\u2604\uFE0F", category: "magic" },
  { id: "explosion", name_key: "audio.preset_explosion", file: "/sounds/sfx/explosion.mp3", icon: "\uD83D\uDCA5", category: "magic" },
  // Ice
  { id: "cold-bolt", name_key: "audio.preset_cold_bolt", file: "/sounds/sfx/cold-bolt.mp3", icon: "\u2744\uFE0F", category: "magic" },
  { id: "frost-diver", name_key: "audio.preset_frost_diver", file: "/sounds/sfx/frost-diver.mp3", icon: "\uD83E\uDDCA", category: "magic" },
  { id: "storm-gust", name_key: "audio.preset_storm_gust", file: "/sounds/sfx/storm-gust.mp3", icon: "\uD83C\uDF2C\uFE0F", category: "magic" },
  { id: "ice-wall", name_key: "audio.preset_ice_wall", file: "/sounds/sfx/ice-wall.mp3", icon: "\uD83E\uDDF1", category: "magic" },
  // Lightning
  { id: "lightning-bolt", name_key: "audio.preset_lightning_bolt", file: "/sounds/sfx/lightning-bolt.mp3", icon: "\u26A1", category: "magic" },
  { id: "jupitel-thunder", name_key: "audio.preset_jupitel_thunder", file: "/sounds/sfx/jupitel-thunder.mp3", icon: "\uD83C\uDF29\uFE0F", category: "magic" },
  { id: "shock", name_key: "audio.preset_shock", file: "/sounds/sfx/shock.mp3", icon: "\uD83D\uDCA2", category: "magic" },
  // Earth
  { id: "earth-spike", name_key: "audio.preset_earth_spike", file: "/sounds/sfx/earth-spike.mp3", icon: "\uD83C\uDF0D", category: "magic" },
  { id: "water-spell", name_key: "audio.preset_water_spell", file: "/sounds/sfx/water-spell.mp3", icon: "\uD83D\uDCA7", category: "magic" },
  // Holy / Dark
  { id: "holy-smite", name_key: "audio.preset_holy_smite", file: "/sounds/sfx/holy-smite.mp3", icon: "\uD83D\uDD31", category: "magic" },
  { id: "soul-strike", name_key: "audio.preset_soul_strike", file: "/sounds/sfx/soul-strike.mp3", icon: "\uD83D\uDC7B", category: "magic" },
  { id: "darkness", name_key: "audio.preset_darkness", file: "/sounds/sfx/darkness.mp3", icon: "\uD83C\uDF11", category: "magic" },
  // Support / Buffs
  { id: "heal-full", name_key: "audio.preset_heal_full", file: "/sounds/sfx/heal-full.mp3", icon: "\uD83D\uDC9A", category: "magic" },
  { id: "blessing", name_key: "audio.preset_blessing", file: "/sounds/sfx/blessing.mp3", icon: "\uD83D\uDE4F", category: "magic" },
  { id: "speed-buff", name_key: "audio.preset_speed_buff", file: "/sounds/sfx/speed-buff.mp3", icon: "\uD83C\uDFC3", category: "magic" },
  { id: "magic-shield", name_key: "audio.preset_magic_shield", file: "/sounds/sfx/magic-shield.mp3", icon: "\uD83D\uDEE1\uFE0F", category: "defense" },
  { id: "enchant", name_key: "audio.preset_enchant", file: "/sounds/sfx/enchant.mp3", icon: "\uD83D\uDD2E", category: "magic" },
  { id: "revive", name_key: "audio.preset_revive", file: "/sounds/sfx/revive.mp3", icon: "\uD83C\uDF1F", category: "magic" },
  { id: "atk-buff", name_key: "audio.preset_atk_buff", file: "/sounds/sfx/atk-buff.mp3", icon: "\u2B06\uFE0F", category: "magic" },
  { id: "def-buff", name_key: "audio.preset_def_buff", file: "/sounds/sfx/def-buff.mp3", icon: "\uD83D\uDEE1\uFE0F", category: "defense" },
  // Debuffs
  { id: "curse", name_key: "audio.preset_curse", file: "/sounds/sfx/curse.mp3", icon: "\uD83D\uDC00", category: "magic" },
  { id: "debuff", name_key: "audio.preset_debuff", file: "/sounds/sfx/debuff.mp3", icon: "\u2B07\uFE0F", category: "magic" },
  // Combat specials
  { id: "asura-strike", name_key: "audio.preset_asura_strike", file: "/sounds/sfx/asura-strike.mp3", icon: "\uD83D\uDCA3", category: "dramatic" },
  { id: "level-up", name_key: "audio.preset_level_up", file: "/sounds/sfx/level-up.mp3", icon: "\uD83C\uDF1F", category: "dramatic" },

  // ── Ambient — loopable atmosphere (auto-loop) ───────────────
  { id: "ambient-bonfire", name_key: "audio.preset_ambient_bonfire", file: "/sounds/ambient/bonfire.mp3", icon: "\uD83D\uDD25", category: "ambient" },
  { id: "ambient-thunder-storm", name_key: "audio.preset_ambient_thunder_storm", file: "/sounds/ambient/thunder-storm.mp3", icon: "\u26C8\uFE0F", category: "ambient" },
  { id: "ambient-wind", name_key: "audio.preset_ambient_wind", file: "/sounds/ambient/wind.mp3", icon: "\uD83C\uDFD4\uFE0F", category: "ambient" },
  { id: "ambient-dungeon", name_key: "audio.preset_ambient_dungeon", file: "/sounds/ambient/dungeon.mp3", icon: "\uD83D\uDD76\uFE0F", category: "ambient" },
  { id: "ambient-rain", name_key: "audio.preset_ambient_rain", file: "/sounds/ambient/rain.mp3", icon: "\uD83C\uDF27\uFE0F", category: "ambient" },
  { id: "ambient-tavern", name_key: "audio.preset_ambient_tavern", file: "/sounds/ambient/tavern.mp3", icon: "\uD83C\uDFFA", category: "ambient" },
  { id: "ambient-forest", name_key: "audio.preset_ambient_forest", file: "/sounds/ambient/forest.mp3", icon: "\uD83C\uDF32", category: "ambient" },
  { id: "ambient-ocean", name_key: "audio.preset_ambient_ocean", file: "/sounds/ambient/ocean.mp3", icon: "\uD83C\uDF0A", category: "ambient" },
  { id: "ambient-creek", name_key: "audio.preset_ambient_creek", file: "/sounds/ambient/creek.mp3", icon: "\uD83C\uDFDE\uFE0F", category: "ambient" },

  // ── Music — 45 s loops, Kevin MacLeod CC-BY 3.0 ─────────────
  { id: "music-battle-epic", name_key: "audio.preset_music_battle_epic", file: "/sounds/music/battle-epic.mp3", icon: "\u2694\uFE0F", category: "music" },
  { id: "music-boss-fight", name_key: "audio.preset_music_boss_fight", file: "/sounds/music/boss-fight.mp3", icon: "\uD83D\uDC09", category: "music" },
  { id: "music-exploration", name_key: "audio.preset_music_exploration", file: "/sounds/music/exploration.mp3", icon: "\uD83D\uDDFA\uFE0F", category: "music" },
  { id: "music-celtic-rest", name_key: "audio.preset_music_celtic_rest", file: "/sounds/music/celtic-rest.mp3", icon: "\uD83C\uDF40", category: "music" },
  { id: "music-horror-dungeon", name_key: "audio.preset_music_horror_dungeon", file: "/sounds/music/horror-dungeon.mp3", icon: "\uD83D\uDC80", category: "music" },
  { id: "music-mystery", name_key: "audio.preset_music_mystery", file: "/sounds/music/mystery.mp3", icon: "\uD83D\uDD0D", category: "music" },
];

export function getPresetById(id: string): AudioPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function getAllPresets(): AudioPreset[] {
  return PRESETS;
}

export function getAmbientPresets(): AudioPreset[] {
  return PRESETS.filter((p) => p.category === "ambient");
}

export function getMusicPresets(): AudioPreset[] {
  return PRESETS.filter((p) => p.category === "music");
}

export function getSfxPresets(): AudioPreset[] {
  return PRESETS.filter((p) => p.category !== "ambient" && p.category !== "music");
}
