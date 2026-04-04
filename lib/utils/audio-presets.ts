import type { AudioPreset } from "@/lib/types/audio";

/**
 * Curated preset library — 80% Ragnarok Online originals + 20% CC0.
 *
 * RO SFX: Ragnarok Online original sound effects (Gravity Co.)
 * CC0 SFX: Kenney.nl (CC0) — basic melee, interaction, UI
 * Music: Kevin MacLeod / incompetech.com (CC-BY 3.0)
 * Ambient: project originals
 */
const PRESETS: AudioPreset[] = [
  // ═══════════════════════════════════════════════════════════════
  // SFX — ATTACKS
  // ═══════════════════════════════════════════════════════════════

  // ── Melee — RO ──
  { id: "bash", name_key: "audio.preset_bash", file: "/sounds/sfx/bash.mp3", icon: "👊", category: "attack" },
  { id: "sonic-blow", name_key: "audio.preset_sonic_blow", file: "/sounds/sfx/sonic-blow.mp3", icon: "💨", category: "attack" },
  { id: "bowling-bash", name_key: "audio.preset_bowling_bash", file: "/sounds/sfx/bowling-bash.mp3", icon: "💥", category: "attack" },
  { id: "spear-thrust", name_key: "audio.preset_spear_thrust", file: "/sounds/sfx/spear-thrust.mp3", icon: "🔱", category: "attack" },
  { id: "holy-cross", name_key: "audio.preset_holy_cross", file: "/sounds/sfx/holy-cross.mp3", icon: "✝️", category: "attack" },
  { id: "shield-bash", name_key: "audio.preset_shield_bash", file: "/sounds/sfx/shield-bash.mp3", icon: "🛡️", category: "attack" },
  { id: "backstab", name_key: "audio.preset_backstab", file: "/sounds/sfx/backstab.mp3", icon: "🗡️", category: "attack" },
  { id: "magnum-break", name_key: "audio.preset_magnum_break", file: "/sounds/sfx/magnum-break.mp3", icon: "💢", category: "attack" },
  { id: "cleave", name_key: "audio.preset_cleave", file: "/sounds/sfx/cleave.mp3", icon: "⚔️", category: "attack" },
  { id: "hammerfall", name_key: "audio.preset_hammerfall", file: "/sounds/sfx/hammerfall.mp3", icon: "🔨", category: "attack" },

  // ── Ranged / Misc — mixed ──
  { id: "arrow", name_key: "audio.preset_arrow", file: "/sounds/sfx/arrow.mp3", icon: "🏹", category: "attack" },
  { id: "sword-hit", name_key: "audio.preset_sword_hit", file: "/sounds/sfx/sword-hit.mp3", icon: "⚔️", category: "attack" },
  { id: "critical-hit", name_key: "audio.preset_critical_hit", file: "/sounds/sfx/critical-hit.mp3", icon: "💥", category: "attack" },
  { id: "trap", name_key: "audio.preset_trap", file: "/sounds/sfx/trap.mp3", icon: "🪤", category: "attack" },

  // ── Melee basics — Kenney CC0 ──
  { id: "sword-unsheathe", name_key: "audio.preset_sword_unsheathe", file: "/sounds/sfx/sword-unsheathe.mp3", icon: "🗡️", category: "attack" },
  { id: "sword-swing", name_key: "audio.preset_sword_swing", file: "/sounds/sfx/sword-swing.mp3", icon: "⚔️", category: "attack" },
  { id: "axe-chop", name_key: "audio.preset_axe_chop", file: "/sounds/sfx/axe-chop.mp3", icon: "🪓", category: "attack" },
  { id: "punch", name_key: "audio.preset_punch", file: "/sounds/sfx/punch.mp3", icon: "👊", category: "attack" },
  { id: "knife-slice", name_key: "audio.preset_knife_slice", file: "/sounds/sfx/knife-slice.mp3", icon: "🔪", category: "attack" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: FIRE (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "fire-bolt", name_key: "audio.preset_fire_bolt", file: "/sounds/sfx/fire-bolt.mp3", icon: "🔥", category: "magic" },
  { id: "fire-wall", name_key: "audio.preset_fire_wall", file: "/sounds/sfx/fire-wall.mp3", icon: "🧨", category: "magic" },
  { id: "fireball", name_key: "audio.preset_fireball", file: "/sounds/sfx/fireball.mp3", icon: "🔥", category: "magic" },
  { id: "fire-pillar", name_key: "audio.preset_fire_pillar", file: "/sounds/sfx/fire-pillar.mp3", icon: "🔥", category: "magic" },
  { id: "meteor-storm", name_key: "audio.preset_meteor_storm", file: "/sounds/sfx/meteor-storm.mp3", icon: "☄️", category: "magic" },
  { id: "explosion", name_key: "audio.preset_explosion", file: "/sounds/sfx/explosion.mp3", icon: "💥", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: ICE (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "cold-bolt", name_key: "audio.preset_cold_bolt", file: "/sounds/sfx/cold-bolt.mp3", icon: "❄️", category: "magic" },
  { id: "frost-diver", name_key: "audio.preset_frost_diver", file: "/sounds/sfx/frost-diver.mp3", icon: "🧊", category: "magic" },
  { id: "storm-gust", name_key: "audio.preset_storm_gust", file: "/sounds/sfx/storm-gust.mp3", icon: "🌬️", category: "magic" },
  { id: "ice-wall", name_key: "audio.preset_ice_wall", file: "/sounds/sfx/ice-wall.mp3", icon: "🧱", category: "magic" },
  { id: "ice-burst", name_key: "audio.preset_ice_burst", file: "/sounds/sfx/ice-burst.mp3", icon: "❄️", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: LIGHTNING (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "lightning-bolt", name_key: "audio.preset_lightning_bolt", file: "/sounds/sfx/lightning-bolt.mp3", icon: "⚡", category: "magic" },
  { id: "jupitel-thunder", name_key: "audio.preset_jupitel_thunder", file: "/sounds/sfx/jupitel-thunder.mp3", icon: "🌩️", category: "magic" },
  { id: "shock", name_key: "audio.preset_shock", file: "/sounds/sfx/shock.mp3", icon: "💢", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: EARTH / WATER (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "earth-spike", name_key: "audio.preset_earth_spike", file: "/sounds/sfx/earth-spike.mp3", icon: "🌍", category: "magic" },
  { id: "water-spell", name_key: "audio.preset_water_spell", file: "/sounds/sfx/water-spell.mp3", icon: "💧", category: "magic" },
  { id: "earthquake", name_key: "audio.preset_earthquake", file: "/sounds/sfx/earthquake.mp3", icon: "🌍", category: "magic" },
  { id: "magma-eruption", name_key: "audio.preset_magma_eruption", file: "/sounds/sfx/magma-eruption.mp3", icon: "🌋", category: "magic" },
  { id: "quagmire", name_key: "audio.preset_quagmire", file: "/sounds/sfx/quagmire.mp3", icon: "🪹", category: "magic" },
  { id: "elemental-burst", name_key: "audio.preset_elemental_burst", file: "/sounds/sfx/elemental-burst.mp3", icon: "🌊", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: HOLY / DIVINE (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "holy-smite", name_key: "audio.preset_holy_smite", file: "/sounds/sfx/holy-smite.mp3", icon: "🔱", category: "magic" },
  { id: "grand-cross", name_key: "audio.preset_grand_cross", file: "/sounds/sfx/grand-cross.mp3", icon: "✨", category: "magic" },
  { id: "holy-weapon", name_key: "audio.preset_holy_weapon", file: "/sounds/sfx/holy-weapon.mp3", icon: "🔱", category: "magic" },
  { id: "divine-ray", name_key: "audio.preset_divine_ray", file: "/sounds/sfx/divine-ray.mp3", icon: "☀️", category: "magic" },
  { id: "sanctuary", name_key: "audio.preset_sanctuary", file: "/sounds/sfx/sanctuary.mp3", icon: "🟡", category: "magic" },
  { id: "turn-undead", name_key: "audio.preset_turn_undead", file: "/sounds/sfx/turn-undead.mp3", icon: "☠️", category: "magic" },
  { id: "glory", name_key: "audio.preset_glory", file: "/sounds/sfx/glory.mp3", icon: "🙏", category: "magic" },
  { id: "judgement", name_key: "audio.preset_judgement", file: "/sounds/sfx/judgement.mp3", icon: "⚖️", category: "magic" },
  { id: "adoramus", name_key: "audio.preset_adoramus", file: "/sounds/sfx/adoramus.mp3", icon: "🌟", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: DARK / SOUL (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "soul-strike", name_key: "audio.preset_soul_strike", file: "/sounds/sfx/soul-strike.mp3", icon: "👻", category: "magic" },
  { id: "darkness", name_key: "audio.preset_darkness", file: "/sounds/sfx/darkness.mp3", icon: "🌑", category: "magic" },
  { id: "curse", name_key: "audio.preset_curse", file: "/sounds/sfx/curse.mp3", icon: "🐀", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MAGIC: GENERIC (Kenney CC0)
  // ═══════════════════════════════════════════════════════════════
  { id: "spell", name_key: "audio.preset_spell", file: "/sounds/sfx/spell.mp3", icon: "✨", category: "magic" },
  { id: "magic-cast", name_key: "audio.preset_magic_cast", file: "/sounds/sfx/magic-cast.mp3", icon: "🪄", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — HEALING & BUFFS (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "heal-full", name_key: "audio.preset_heal_full", file: "/sounds/sfx/heal-full.mp3", icon: "💚", category: "magic" },
  { id: "healing", name_key: "audio.preset_healing", file: "/sounds/sfx/healing.mp3", icon: "💖", category: "magic" },
  { id: "blessing", name_key: "audio.preset_blessing", file: "/sounds/sfx/blessing.mp3", icon: "🙏", category: "magic" },
  { id: "speed-buff", name_key: "audio.preset_speed_buff", file: "/sounds/sfx/speed-buff.mp3", icon: "🏃", category: "magic" },
  { id: "atk-buff", name_key: "audio.preset_atk_buff", file: "/sounds/sfx/atk-buff.mp3", icon: "⬆️", category: "magic" },
  { id: "enchant", name_key: "audio.preset_enchant", file: "/sounds/sfx/enchant.mp3", icon: "🔮", category: "magic" },
  { id: "revive", name_key: "audio.preset_revive", file: "/sounds/sfx/revive.mp3", icon: "🌟", category: "magic" },
  { id: "haste", name_key: "audio.preset_haste", file: "/sounds/sfx/haste.mp3", icon: "⚡", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — DEFENSE (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "magic-shield", name_key: "audio.preset_magic_shield", file: "/sounds/sfx/magic-shield.mp3", icon: "🛡️", category: "defense" },
  { id: "def-buff", name_key: "audio.preset_def_buff", file: "/sounds/sfx/def-buff.mp3", icon: "🛡️", category: "defense" },
  { id: "endure", name_key: "audio.preset_endure", file: "/sounds/sfx/endure.mp3", icon: "💪", category: "defense" },
  { id: "shield", name_key: "audio.preset_shield", file: "/sounds/sfx/shield.mp3", icon: "✨", category: "defense" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — DEBUFFS & STATUS (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "debuff", name_key: "audio.preset_debuff", file: "/sounds/sfx/debuff.mp3", icon: "⬇️", category: "magic" },
  { id: "blind", name_key: "audio.preset_blind", file: "/sounds/sfx/blind.mp3", icon: "😶‍🌫️", category: "magic" },
  { id: "stun", name_key: "audio.preset_stun", file: "/sounds/sfx/stun.mp3", icon: "💫", category: "magic" },
  { id: "petrify", name_key: "audio.preset_petrify", file: "/sounds/sfx/petrify.mp3", icon: "🪨", category: "magic" },
  { id: "vulnerability", name_key: "audio.preset_vulnerability", file: "/sounds/sfx/vulnerability.mp3", icon: "🎯", category: "magic" },
  { id: "poison", name_key: "audio.preset_poison", file: "/sounds/sfx/poison.mp3", icon: "☠️", category: "magic" },
  { id: "venom-dust", name_key: "audio.preset_venom_dust", file: "/sounds/sfx/venom-dust.mp3", icon: "🐍", category: "magic" },
  { id: "silence", name_key: "audio.preset_silence", file: "/sounds/sfx/silence.mp3", icon: "🤐", category: "magic" },
  { id: "provoke", name_key: "audio.preset_provoke", file: "/sounds/sfx/provoke.mp3", icon: "😤", category: "magic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — UTILITY & INTERACTION (RO + Kenney)
  // ═══════════════════════════════════════════════════════════════
  { id: "stealth", name_key: "audio.preset_stealth", file: "/sounds/sfx/stealth.mp3", icon: "🥷", category: "interaction" },
  { id: "hide", name_key: "audio.preset_hide", file: "/sounds/sfx/hide.mp3", icon: "👁️", category: "interaction" },
  { id: "portal", name_key: "audio.preset_portal", file: "/sounds/sfx/portal.mp3", icon: "🌀", category: "interaction" },
  { id: "warp", name_key: "audio.preset_warp", file: "/sounds/sfx/warp.mp3", icon: "⚡", category: "interaction" },
  { id: "teleport", name_key: "audio.preset_teleport", file: "/sounds/sfx/teleport.mp3", icon: "✨", category: "interaction" },
  { id: "steal", name_key: "audio.preset_steal", file: "/sounds/sfx/steal.mp3", icon: "🤏", category: "interaction" },
  { id: "detect", name_key: "audio.preset_detect", file: "/sounds/sfx/detect.mp3", icon: "👁️‍🗨️", category: "interaction" },
  { id: "coin-pickup", name_key: "audio.preset_coin_pickup", file: "/sounds/sfx/coin-pickup.mp3", icon: "🪙", category: "interaction" },
  { id: "door-open", name_key: "audio.preset_door_open", file: "/sounds/sfx/door-open.mp3", icon: "🚪", category: "interaction" },
  { id: "door-close", name_key: "audio.preset_door_close", file: "/sounds/sfx/door-close.mp3", icon: "🚪", category: "interaction" },

  // ── Interaction — Kenney CC0 ──
  { id: "door-creak", name_key: "audio.preset_door_creak", file: "/sounds/sfx/door-creak.mp3", icon: "🚪", category: "interaction" },
  { id: "chest-open", name_key: "audio.preset_chest_open", file: "/sounds/sfx/chest-open.mp3", icon: "📦", category: "interaction" },
  { id: "coins", name_key: "audio.preset_coins", file: "/sounds/sfx/coins.mp3", icon: "💰", category: "interaction" },
  { id: "potion", name_key: "audio.preset_potion", file: "/sounds/sfx/potion.mp3", icon: "🧪", category: "interaction" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — DRAMATIC & SPECIAL (RO)
  // ═══════════════════════════════════════════════════════════════
  { id: "asura-strike", name_key: "audio.preset_asura_strike", file: "/sounds/sfx/asura-strike.mp3", icon: "💣", category: "dramatic" },
  { id: "level-up", name_key: "audio.preset_level_up", file: "/sounds/sfx/level-up.mp3", icon: "🌟", category: "dramatic" },
  { id: "boss-kill", name_key: "audio.preset_boss_kill", file: "/sounds/sfx/boss-kill.mp3", icon: "🏆", category: "dramatic" },
  { id: "dragon-roar", name_key: "audio.preset_dragon_roar", file: "/sounds/sfx/dragon-roar.mp3", icon: "🐉", category: "dramatic" },
  { id: "success", name_key: "audio.preset_success", file: "/sounds/sfx/success.mp3", icon: "✅", category: "dramatic" },
  { id: "fail", name_key: "audio.preset_fail", file: "/sounds/sfx/fail.mp3", icon: "❌", category: "dramatic" },
  { id: "death", name_key: "audio.preset_death", file: "/sounds/sfx/death.mp3", icon: "💀", category: "dramatic" },
  { id: "thunder", name_key: "audio.preset_thunder", file: "/sounds/sfx/thunder.mp3", icon: "⛈️", category: "dramatic" },
  { id: "war-cry", name_key: "audio.preset_war_cry", file: "/sounds/sfx/war-cry.mp3", icon: "📯", category: "dramatic" },

  // ═══════════════════════════════════════════════════════════════
  // SFX — MONSTERS (Kenney CC0)
  // ═══════════════════════════════════════════════════════════════
  { id: "monster-snarl", name_key: "audio.preset_monster_snarl", file: "/sounds/sfx/monster-snarl.mp3", icon: "👾", category: "monster" },
  { id: "ogre-growl", name_key: "audio.preset_ogre_growl", file: "/sounds/sfx/ogre-growl.mp3", icon: "👹", category: "monster" },

  // ═══════════════════════════════════════════════════════════════
  // AMBIENT — loopable atmosphere (auto-loop)
  // ═══════════════════════════════════════════════════════════════
  { id: "ambient-bonfire", name_key: "audio.preset_ambient_bonfire", file: "/sounds/ambient/bonfire.mp3", icon: "🔥", category: "ambient" },
  { id: "ambient-thunder-storm", name_key: "audio.preset_ambient_thunder_storm", file: "/sounds/ambient/thunder-storm.mp3", icon: "⛈️", category: "ambient" },
  { id: "ambient-wind", name_key: "audio.preset_ambient_wind", file: "/sounds/ambient/wind.mp3", icon: "🏔️", category: "ambient" },
  { id: "ambient-dungeon", name_key: "audio.preset_ambient_dungeon", file: "/sounds/ambient/dungeon.mp3", icon: "🕶️", category: "ambient" },
  { id: "ambient-rain", name_key: "audio.preset_ambient_rain", file: "/sounds/ambient/rain.mp3", icon: "🌧️", category: "ambient" },
  { id: "ambient-tavern", name_key: "audio.preset_ambient_tavern", file: "/sounds/ambient/tavern.mp3", icon: "🍺", category: "ambient" },
  { id: "ambient-forest", name_key: "audio.preset_ambient_forest", file: "/sounds/ambient/forest.mp3", icon: "🌲", category: "ambient" },
  { id: "ambient-ocean", name_key: "audio.preset_ambient_ocean", file: "/sounds/ambient/ocean.mp3", icon: "🌊", category: "ambient" },
  { id: "ambient-creek", name_key: "audio.preset_ambient_creek", file: "/sounds/ambient/creek.mp3", icon: "🏞️", category: "ambient" },

  // ═══════════════════════════════════════════════════════════════
  // MUSIC — Kevin MacLeod CC-BY 3.0
  // ═══════════════════════════════════════════════════════════════
  { id: "music-battle-epic", name_key: "audio.preset_music_battle_epic", file: "/sounds/music/battle-epic.mp3", icon: "⚔️", category: "music" },
  { id: "music-battle-march", name_key: "audio.preset_music_battle_march", file: "/sounds/music/battle-march.mp3", icon: "🥁", category: "music" },
  { id: "music-boss-fight", name_key: "audio.preset_music_boss_fight", file: "/sounds/music/boss-fight.mp3", icon: "🐉", category: "music" },
  { id: "music-exploration", name_key: "audio.preset_music_exploration", file: "/sounds/music/exploration.mp3", icon: "🗺️", category: "music" },
  { id: "music-celtic-rest", name_key: "audio.preset_music_celtic_rest", file: "/sounds/music/celtic-rest.mp3", icon: "🍀", category: "music" },
  { id: "music-horror-dungeon", name_key: "audio.preset_music_horror_dungeon", file: "/sounds/music/horror-dungeon.mp3", icon: "💀", category: "music" },
  { id: "music-mystery", name_key: "audio.preset_music_mystery", file: "/sounds/music/mystery.mp3", icon: "🔍", category: "music" },
  { id: "music-suspense-dark", name_key: "audio.preset_music_suspense_dark", file: "/sounds/music/suspense-dark.mp3", icon: "🌑", category: "music" },
  { id: "music-medieval-court", name_key: "audio.preset_music_medieval_court", file: "/sounds/music/medieval-court.mp3", icon: "👑", category: "music" },
  { id: "music-ghost-story", name_key: "audio.preset_music_ghost_story", file: "/sounds/music/ghost-story.mp3", icon: "👻", category: "music" },
  { id: "music-enchanted-valley", name_key: "audio.preset_music_enchanted_valley", file: "/sounds/music/enchanted-valley.mp3", icon: "🧚", category: "music" },
  { id: "music-moonlight-hall", name_key: "audio.preset_music_moonlight_hall", file: "/sounds/music/moonlight-hall.mp3", icon: "🌙", category: "music" },
  { id: "music-dungeon-ambient", name_key: "audio.preset_music_dungeon_ambient", file: "/sounds/music/dungeon-ambient.mp3", icon: "🕳️", category: "music" },
  { id: "music-supernatural", name_key: "audio.preset_music_supernatural", file: "/sounds/music/supernatural.mp3", icon: "👁️", category: "music" },
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
