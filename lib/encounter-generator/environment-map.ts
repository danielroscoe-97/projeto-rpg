/**
 * Static mapping of D&D environments to likely monster types.
 * Used by the encounter generator to filter SRD monsters by terrain.
 */

export type EncounterEnvironment =
  | "forest" | "dungeon" | "cave" | "swamp" | "mountain"
  | "desert" | "arctic" | "coastal" | "urban" | "underdark"
  | "plane_fire" | "plane_abyss" | "any";

export const ENVIRONMENT_MONSTER_TYPES: Record<EncounterEnvironment, string[]> = {
  forest: ["beast", "fey", "plant", "monstrosity", "humanoid", "dragon"],
  dungeon: ["undead", "construct", "ooze", "aberration", "monstrosity", "humanoid"],
  cave: ["beast", "monstrosity", "ooze", "dragon", "aberration"],
  swamp: ["undead", "beast", "plant", "monstrosity", "dragon"],
  mountain: ["dragon", "giant", "elemental", "beast", "monstrosity"],
  desert: ["beast", "monstrosity", "elemental", "undead", "dragon"],
  arctic: ["beast", "monstrosity", "elemental", "giant", "dragon"],
  coastal: ["beast", "monstrosity", "elemental", "dragon", "humanoid"],
  urban: ["humanoid", "construct", "fiend", "undead", "monstrosity"],
  underdark: ["aberration", "ooze", "undead", "monstrosity", "fiend", "elemental"],
  plane_fire: ["elemental", "fiend", "dragon"],
  plane_abyss: ["fiend", "undead", "aberration"],
  any: [],
};

export const ENVIRONMENT_ICONS: Record<EncounterEnvironment, string> = {
  forest: "\u{1F332}",
  dungeon: "\u{1F3F0}",
  cave: "\u{26F0}\uFE0F",
  swamp: "\u{1FAB8}",
  mountain: "\u{1F3D4}\uFE0F",
  desert: "\u{1F3DC}\uFE0F",
  arctic: "\u{2744}\uFE0F",
  coastal: "\u{1F30A}",
  urban: "\u{1F3D8}\uFE0F",
  underdark: "\u{1F578}\uFE0F",
  plane_fire: "\u{1F525}",
  plane_abyss: "\u{1F608}",
  any: "\u{1F30D}",
};

export const ALL_ENVIRONMENTS: EncounterEnvironment[] = [
  "forest", "dungeon", "cave", "swamp", "mountain",
  "desert", "arctic", "coastal", "urban", "underdark",
  "plane_fire", "plane_abyss", "any",
];
