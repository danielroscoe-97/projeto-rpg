export interface RaceOption {
  id: string;
  name: string;
  source: string;
  srd: boolean;
}

// ---------------------------------------------------------------------------
// Backward-compatible legacy interface (source was "2014" | "2024")
// ---------------------------------------------------------------------------
export interface LegacyRaceOption {
  id: string;
  name: string;
  source: "2014" | "2024";
}

// ---------------------------------------------------------------------------
// SRD Races — available to ALL authenticated users
// ---------------------------------------------------------------------------
const SRD_RACE_LIST: RaceOption[] = [
  // SRD 2014 (PHB core)
  { id: "human",       name: "Human",      source: "PHB", srd: true },
  { id: "elf",         name: "Elf",        source: "PHB", srd: true },
  { id: "dwarf",       name: "Dwarf",      source: "PHB", srd: true },
  { id: "halfling",    name: "Halfling",   source: "PHB", srd: true },
  { id: "gnome",       name: "Gnome",      source: "PHB", srd: true },
  { id: "half-elf",    name: "Half-Elf",   source: "PHB", srd: true },
  { id: "half-orc",    name: "Half-Orc",   source: "PHB", srd: true },
  { id: "tiefling",    name: "Tiefling",   source: "PHB", srd: true },
  { id: "dragonborn",  name: "Dragonborn", source: "PHB", srd: true },

  // SRD 2024 additions
  { id: "goliath",     name: "Goliath",    source: "PHB24", srd: true },
  { id: "orc",         name: "Orc",        source: "PHB24", srd: true },
  { id: "aasimar",     name: "Aasimar",    source: "PHB24", srd: true },
];

// ---------------------------------------------------------------------------
// Non-SRD Races — beta testers / admin / content_whitelist ONLY
// ---------------------------------------------------------------------------
const NON_SRD_RACE_LIST: RaceOption[] = [
  // Volo's Guide to Monsters (VGM)
  { id: "firbolg",            name: "Firbolg",            source: "VGM",  srd: false },
  { id: "kenku",              name: "Kenku",              source: "VGM",  srd: false },
  { id: "lizardfolk",         name: "Lizardfolk",         source: "VGM",  srd: false },
  { id: "tabaxi",             name: "Tabaxi",             source: "VGM",  srd: false },
  { id: "triton",             name: "Triton",             source: "VGM",  srd: false },
  { id: "bugbear",            name: "Bugbear",            source: "VGM",  srd: false },
  { id: "goblin",             name: "Goblin",             source: "VGM",  srd: false },
  { id: "hobgoblin",          name: "Hobgoblin",          source: "VGM",  srd: false },
  { id: "kobold",             name: "Kobold",             source: "VGM",  srd: false },
  { id: "yuan-ti-pureblood",  name: "Yuan-ti Pureblood",  source: "VGM",  srd: false },

  // Mordenkainen Presents: Monsters of the Multiverse (MPMM / MotM)
  { id: "changeling",   name: "Changeling",   source: "MPMM", srd: false },
  { id: "fairy",         name: "Fairy",         source: "MPMM", srd: false },
  { id: "harengon",      name: "Harengon",      source: "MPMM", srd: false },
  { id: "owlin",         name: "Owlin",         source: "MPMM", srd: false },
  { id: "giff",          name: "Giff",          source: "MPMM", srd: false },
  { id: "plasmoid",      name: "Plasmoid",      source: "MPMM", srd: false },
  { id: "autognome",     name: "Autognome",     source: "MPMM", srd: false },
  { id: "hadozee",       name: "Hadozee",       source: "MPMM", srd: false },
  { id: "thri-kreen",    name: "Thri-kreen",    source: "MPMM", srd: false },
  { id: "tortle",        name: "Tortle",        source: "MPMM", srd: false },
  { id: "grung",         name: "Grung",         source: "MPMM", srd: false },
  { id: "shifter",       name: "Shifter",       source: "MPMM", srd: false },
  { id: "kalashtar",     name: "Kalashtar",     source: "MPMM", srd: false },
  { id: "warforged",     name: "Warforged",     source: "MPMM", srd: false },
  { id: "minotaur",      name: "Minotaur",      source: "MPMM", srd: false },
  { id: "centaur",       name: "Centaur",       source: "MPMM", srd: false },
  { id: "satyr",         name: "Satyr",         source: "MPMM", srd: false },
  { id: "leonin",        name: "Leonin",        source: "MPMM", srd: false },

  // Elemental Evil Player's Companion (EEPC)
  { id: "aarakocra",     name: "Aarakocra",     source: "EEPC", srd: false },
  { id: "genasi-air",    name: "Genasi (Air)",   source: "EEPC", srd: false },
  { id: "genasi-earth",  name: "Genasi (Earth)", source: "EEPC", srd: false },
  { id: "genasi-fire",   name: "Genasi (Fire)",  source: "EEPC", srd: false },
  { id: "genasi-water",  name: "Genasi (Water)", source: "EEPC", srd: false },

  // Guildmasters' Guide to Ravnica (GGR)
  { id: "loxodon",       name: "Loxodon",       source: "GGR",  srd: false },
  { id: "simic-hybrid",  name: "Simic Hybrid",  source: "GGR",  srd: false },
  { id: "vedalken",      name: "Vedalken",      source: "GGR",  srd: false },

  // Acquisitions Incorporated (AI)
  { id: "verdan",        name: "Verdan",        source: "AI",   srd: false },

  // Eberron: Rising from the Last War (ERLW)
  // (Changeling, Shifter, Kalashtar, Warforged already listed under MPMM reprints)

  // Mythic Odysseys of Theros (MOT)
  // (Satyr, Leonin already listed under MPMM reprints)

  // Custom Lineage (Tasha's Cauldron of Everything)
  { id: "custom-lineage", name: "Custom Lineage", source: "TCE", srd: false },
];

// ---------------------------------------------------------------------------
// Combined list (SRD first, then non-SRD sorted alphabetically)
// ---------------------------------------------------------------------------
export const ALL_RACES: RaceOption[] = [
  ...SRD_RACE_LIST,
  ...NON_SRD_RACE_LIST.sort((a, b) => a.name.localeCompare(b.name)),
];

// ---------------------------------------------------------------------------
// Access-filtered helper
// ---------------------------------------------------------------------------
/**
 * Returns available races based on access level.
 * @param fullMode - true if user has beta/admin/whitelist access
 */
export function getAvailableRaces(fullMode: boolean): RaceOption[] {
  if (fullMode) return ALL_RACES;
  return SRD_RACE_LIST;
}

// ---------------------------------------------------------------------------
// Backward-compatible export: SRD_RACES (legacy format with "2014"/"2024")
// Used by existing code that depends on the old interface.
// ---------------------------------------------------------------------------
export const SRD_RACES: LegacyRaceOption[] = [
  // 2014 SRD races
  { id: "human-2014", name: "Human", source: "2014" },
  { id: "elf-2014", name: "Elf", source: "2014" },
  { id: "dwarf-2014", name: "Dwarf", source: "2014" },
  { id: "halfling-2014", name: "Halfling", source: "2014" },
  { id: "gnome-2014", name: "Gnome", source: "2014" },
  { id: "half-elf-2014", name: "Half-Elf", source: "2014" },
  { id: "half-orc-2014", name: "Half-Orc", source: "2014" },
  { id: "tiefling-2014", name: "Tiefling", source: "2014" },
  { id: "dragonborn-2014", name: "Dragonborn", source: "2014" },

  // 2024 SRD races
  { id: "human-2024", name: "Human", source: "2024" },
  { id: "elf-2024", name: "Elf", source: "2024" },
  { id: "dwarf-2024", name: "Dwarf", source: "2024" },
  { id: "halfling-2024", name: "Halfling", source: "2024" },
  { id: "gnome-2024", name: "Gnome", source: "2024" },
  { id: "tiefling-2024", name: "Tiefling", source: "2024" },
  { id: "dragonborn-2024", name: "Dragonborn", source: "2024" },
  { id: "goliath-2024", name: "Goliath", source: "2024" },
  { id: "orc-2024", name: "Orc", source: "2024" },
  { id: "aasimar-2024", name: "Aasimar", source: "2024" },
];
