export interface RaceOption {
  id: string;
  name: string;
  source: "2014" | "2024";
}

export const SRD_RACES: RaceOption[] = [
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
