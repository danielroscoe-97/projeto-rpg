/**
 * Pre-built encounter presets for the /try guest experience.
 * Loaded when the DM clicks "Load encounter" in the empty setup screen.
 */

export interface StarterPlayer {
  name: string;
  hp: number;
  ac: number;
}

export interface StarterMonster {
  /** SRD monster ID (from public/srd/monsters-*.json) */
  monsterId: string;
  /** Ruleset version to load the monster from */
  ruleset: "2014" | "2024";
  count: number;
}

export interface StarterEncounterPreset {
  /** i18n key for the encounter name */
  nameKey: string;
  players: StarterPlayer[];
  monsters: StarterMonster[];
}

export const STARTER_ENCOUNTER: StarterEncounterPreset = {
  nameKey: "preset_goblin_ambush",
  players: [
    { name: "Thorin", hp: 45, ac: 18 },
    { name: "Elara", hp: 32, ac: 15 },
    { name: "Grimjaw", hp: 38, ac: 16 },
    { name: "Luna", hp: 28, ac: 12 },
  ],
  monsters: [
    { monsterId: "goblin-mm", ruleset: "2014", count: 3 },
  ],
};
