import {
  buildMonsterIndex,
  buildSpellIndex,
  setConditionData,
  searchMonsters,
  searchSpells,
  findCondition,
  getAllConditions,
  getMonsterById,
  getSpellById,
  resetSrdIndexes,
} from "./srd-search";
import type { SrdMonster, SrdSpell, SrdCondition } from "./srd-loader";

const MONSTERS: SrdMonster[] = [
  { id: "goblin", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 7, armor_class: 15, ruleset_version: "2014" },
  { id: "orc", name: "Orc", cr: "1/2", type: "humanoid", hit_points: 15, armor_class: 13, ruleset_version: "2014" },
  { id: "wolf", name: "Wolf", cr: "1/4", type: "beast", hit_points: 11, armor_class: 13, ruleset_version: "2014" },
  { id: "goblin-2024", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 10, armor_class: 15, ruleset_version: "2024" },
  { id: "orc-2024", name: "Orc", cr: "1", type: "humanoid", hit_points: 42, armor_class: 13, ruleset_version: "2024" },
];

const SPELLS: SrdSpell[] = [
  {
    id: "fireball",
    name: "Fireball",
    ruleset_version: "2014",
    level: 3,
    school: "Evocation",
    casting_time: "1 action",
    range: "150 feet",
    components: "V, S, M",
    duration: "Instantaneous",
    description: "A bright streak...",
    higher_levels: null,
    classes: ["Sorcerer", "Wizard"],
    ritual: false,
    concentration: false,
  },
  {
    id: "cure-wounds",
    name: "Cure Wounds",
    ruleset_version: "2014",
    level: 1,
    school: "Evocation",
    casting_time: "1 action",
    range: "Touch",
    components: "V, S",
    duration: "Instantaneous",
    description: "A creature you touch regains...",
    higher_levels: null,
    classes: ["Cleric", "Druid"],
    ritual: false,
    concentration: false,
  },
  {
    id: "fireball-2024",
    name: "Fireball",
    ruleset_version: "2024",
    level: 3,
    school: "Evocation",
    casting_time: "1 action",
    range: "150 feet",
    components: "V, S, M",
    duration: "Instantaneous",
    description: "A bright streak (2024)...",
    higher_levels: null,
    classes: ["Sorcerer", "Wizard"],
    ritual: false,
    concentration: false,
  },
];

const CONDITIONS: SrdCondition[] = [
  { id: "blinded", name: "Blinded", description: "A blinded creature can't see..." },
  { id: "stunned", name: "Stunned", description: "A stunned creature is incapacitated..." },
  { id: "poisoned", name: "Poisoned", description: "A poisoned creature has disadvantage..." },
];

beforeEach(() => {
  resetSrdIndexes();
  buildMonsterIndex(MONSTERS);
  buildSpellIndex(SPELLS);
  setConditionData(CONDITIONS);
});

afterEach(() => {
  resetSrdIndexes();
});

// --- Monster search ---

describe("searchMonsters", () => {
  it("returns empty array when query is empty", () => {
    const results = searchMonsters("");
    expect(results).toHaveLength(0);
  });

  it("finds a monster by exact name", () => {
    const results = searchMonsters("Goblin");
    expect(results.some((r) => r.item.name === "Goblin")).toBe(true);
  });

  it("finds a monster by partial name (fuzzy)", () => {
    const results = searchMonsters("gob");
    expect(results.some((r) => r.item.name === "Goblin")).toBe(true);
  });

  it("finds monsters by type", () => {
    const results = searchMonsters("beast");
    expect(results.every((r) => r.item.type === "beast")).toBe(true);
  });

  it("filters by version when provided", () => {
    const results = searchMonsters("Goblin", "2024");
    expect(results.every((r) => r.item.ruleset_version === "2024")).toBe(true);
  });

  it("returns results from both versions when no version filter", () => {
    const results = searchMonsters("Goblin");
    const versions = results.map((r) => r.item.ruleset_version);
    expect(versions).toContain("2014");
    expect(versions).toContain("2024");
  });

  it("returns empty array for query with no matches", () => {
    const results = searchMonsters("xyzzy");
    expect(results).toHaveLength(0);
  });

  it("returns empty array when index not built", () => {
    resetSrdIndexes();
    const results = searchMonsters("Goblin");
    expect(results).toHaveLength(0);
  });
});

// --- Spell search ---

describe("searchSpells", () => {
  it("returns empty array when query is empty", () => {
    const results = searchSpells("");
    expect(results).toHaveLength(0);
  });

  it("finds a spell by exact name", () => {
    const results = searchSpells("Fireball");
    expect(results.some((r) => r.item.name === "Fireball")).toBe(true);
  });

  it("finds a spell by partial name (fuzzy)", () => {
    const results = searchSpells("fire");
    expect(results.some((r) => r.item.name === "Fireball")).toBe(true);
  });

  it("finds spells by class", () => {
    const results = searchSpells("Cleric");
    expect(results.some((r) => r.item.classes.includes("Cleric"))).toBe(true);
  });

  it("filters by version when provided", () => {
    const results = searchSpells("Fireball", "2024");
    expect(results.every((r) => r.item.ruleset_version === "2024")).toBe(true);
    expect(results[0].item.id).toBe("fireball-2024");
  });

  it("returns empty array for query with no matches", () => {
    const results = searchSpells("xyzzy");
    expect(results).toHaveLength(0);
  });

  it("returns empty array when index not built", () => {
    resetSrdIndexes();
    const results = searchSpells("Fireball");
    expect(results).toHaveLength(0);
  });
});

// --- Condition lookup ---

describe("findCondition", () => {
  it("finds a condition by exact name", () => {
    const result = findCondition("Blinded");
    expect(result).toBeDefined();
    expect(result?.id).toBe("blinded");
  });

  it("is case-insensitive", () => {
    const result = findCondition("stunned");
    expect(result).toBeDefined();
    expect(result?.name).toBe("Stunned");
  });

  it("returns undefined for unknown condition", () => {
    const result = findCondition("NotACondition");
    expect(result).toBeUndefined();
  });
});

describe("getAllConditions", () => {
  it("returns all loaded conditions", () => {
    const all = getAllConditions();
    expect(all).toHaveLength(CONDITIONS.length);
  });

  it("returns empty array when no conditions loaded", () => {
    resetSrdIndexes();
    const all = getAllConditions();
    expect(all).toHaveLength(0);
  });
});

// --- Monster map lookup ---

describe("getMonsterById", () => {
  beforeEach(() => {
    resetSrdIndexes();
    buildMonsterIndex(MONSTERS);
  });

  it("returns the correct monster by id and version", () => {
    const m = getMonsterById("goblin", "2014");
    expect(m).toBeDefined();
    expect(m?.name).toBe("Goblin");
    expect(m?.ruleset_version).toBe("2014");
  });

  it("returns the 2024 variant when version is 2024", () => {
    const m = getMonsterById("goblin-2024", "2024");
    expect(m).toBeDefined();
    expect(m?.id).toBe("goblin-2024");
    expect(m?.ruleset_version).toBe("2024");
  });

  it("returns undefined for an unknown id", () => {
    const m = getMonsterById("dragon", "2014");
    expect(m).toBeUndefined();
  });

  it("returns undefined for wrong version", () => {
    const m = getMonsterById("goblin", "2024");
    expect(m).toBeUndefined();
  });

  it("returns undefined after resetSrdIndexes clears the map", () => {
    resetSrdIndexes();
    const m = getMonsterById("goblin", "2014");
    expect(m).toBeUndefined();
  });
});

// --- Spell map lookup ---

describe("getSpellById", () => {
  beforeEach(() => {
    resetSrdIndexes();
    buildSpellIndex(SPELLS);
  });

  it("returns the correct spell by id and version", () => {
    const s = getSpellById("fireball", "2014");
    expect(s).toBeDefined();
    expect(s?.name).toBe("Fireball");
    expect(s?.ruleset_version).toBe("2014");
  });

  it("returns the 2024 variant when version is 2024", () => {
    const s = getSpellById("fireball-2024", "2024");
    expect(s).toBeDefined();
    expect(s?.id).toBe("fireball-2024");
    expect(s?.ruleset_version).toBe("2024");
  });

  it("returns undefined for an unknown id", () => {
    const s = getSpellById("wish", "2014");
    expect(s).toBeUndefined();
  });

  it("returns undefined for wrong version", () => {
    const s = getSpellById("fireball", "2024");
    expect(s).toBeUndefined();
  });

  it("returns undefined after resetSrdIndexes clears the map", () => {
    resetSrdIndexes();
    const s = getSpellById("fireball", "2014");
    expect(s).toBeUndefined();
  });
});
