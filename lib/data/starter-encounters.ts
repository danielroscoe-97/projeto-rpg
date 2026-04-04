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

// ── Encounter Builder Starter Packs ──────────────────────────────────────────

export interface BuilderStarterEncounter {
  id: string;
  nameKey: string;
  descriptionKey: string;
  difficulty: "easy" | "medium" | "hard" | "deadly";
  levelRange: [number, number];
  creatures: Array<{
    slug: string;
    name: string;
    cr: string;
    quantity: number;
    source: "srd" | "srd-2024";
  }>;
}

export const BUILDER_STARTER_ENCOUNTERS: BuilderStarterEncounter[] = [
  {
    id: "starter-goblin-ambush",
    nameKey: "starter.goblin_ambush",
    descriptionKey: "starter.goblin_ambush_desc",
    difficulty: "easy",
    levelRange: [1, 3],
    creatures: [
      { slug: "goblin", name: "Goblin", cr: "1/4", quantity: 4, source: "srd" },
      { slug: "goblin-boss", name: "Goblin Boss", cr: "1", quantity: 1, source: "srd" },
    ],
  },
  {
    id: "starter-undead-crypt",
    nameKey: "starter.undead_crypt",
    descriptionKey: "starter.undead_crypt_desc",
    difficulty: "medium",
    levelRange: [3, 5],
    creatures: [
      { slug: "skeleton", name: "Skeleton", cr: "1/4", quantity: 6, source: "srd" },
      { slug: "zombie", name: "Zombie", cr: "1/4", quantity: 2, source: "srd" },
      { slug: "ghoul", name: "Ghoul", cr: "1", quantity: 1, source: "srd" },
    ],
  },
  {
    id: "starter-bandit-camp",
    nameKey: "starter.bandit_camp",
    descriptionKey: "starter.bandit_camp_desc",
    difficulty: "medium",
    levelRange: [2, 4],
    creatures: [
      { slug: "bandit", name: "Bandit", cr: "1/8", quantity: 4, source: "srd" },
      { slug: "bandit-captain", name: "Bandit Captain", cr: "2", quantity: 1, source: "srd" },
    ],
  },
  {
    id: "starter-dragons-lair",
    nameKey: "starter.dragons_lair",
    descriptionKey: "starter.dragons_lair_desc",
    difficulty: "hard",
    levelRange: [5, 8],
    creatures: [
      { slug: "young-red-dragon", name: "Young Red Dragon", cr: "10", quantity: 1, source: "srd" },
    ],
  },
  {
    id: "starter-forest-ambush",
    nameKey: "starter.forest_ambush",
    descriptionKey: "starter.forest_ambush_desc",
    difficulty: "easy",
    levelRange: [1, 3],
    creatures: [
      { slug: "wolf", name: "Wolf", cr: "1/4", quantity: 2, source: "srd" },
      { slug: "dire-wolf", name: "Dire Wolf", cr: "1", quantity: 1, source: "srd" },
    ],
  },
  {
    id: "starter-cultist-hideout",
    nameKey: "starter.cultist_hideout",
    descriptionKey: "starter.cultist_hideout_desc",
    difficulty: "medium",
    levelRange: [3, 6],
    creatures: [
      { slug: "cultist", name: "Cultist", cr: "1/8", quantity: 3, source: "srd" },
      { slug: "cult-fanatic", name: "Cult Fanatic", cr: "2", quantity: 1, source: "srd" },
    ],
  },
  {
    id: "starter-giants-den",
    nameKey: "starter.giants_den",
    descriptionKey: "starter.giants_den_desc",
    difficulty: "hard",
    levelRange: [7, 10],
    creatures: [
      { slug: "hill-giant", name: "Hill Giant", cr: "5", quantity: 1, source: "srd" },
      { slug: "ogre", name: "Ogre", cr: "2", quantity: 2, source: "srd" },
    ],
  },
  {
    id: "starter-lichs-sanctum",
    nameKey: "starter.lichs_sanctum",
    descriptionKey: "starter.lichs_sanctum_desc",
    difficulty: "deadly",
    levelRange: [15, 20],
    creatures: [
      { slug: "lich", name: "Lich", cr: "21", quantity: 1, source: "srd" },
      { slug: "skeleton", name: "Skeleton", cr: "1/4", quantity: 4, source: "srd" },
      { slug: "zombie", name: "Zombie", cr: "1/4", quantity: 2, source: "srd" },
    ],
  },
];
