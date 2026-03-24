import { searchMonsters, resetSrdIndexes } from "./srd-search";
import type { SrdMonster } from "./srd-loader";

// Mock fetch to return our inline test data
const MONSTERS_2014: SrdMonster[] = [
  { id: "goblin", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 7, armor_class: 15, ruleset_version: "2014" },
  { id: "orc", name: "Orc", cr: "1/2", type: "humanoid", hit_points: 15, armor_class: 13, ruleset_version: "2014" },
  { id: "wolf", name: "Wolf", cr: "1/4", type: "beast", hit_points: 11, armor_class: 13, ruleset_version: "2014" },
  { id: "skeleton", name: "Skeleton", cr: "1/4", type: "undead", hit_points: 13, armor_class: 13, ruleset_version: "2014" },
  { id: "giant-spider", name: "Giant Spider", cr: "1", type: "beast", hit_points: 26, armor_class: 14, ruleset_version: "2014" },
];

const MONSTERS_2024: SrdMonster[] = [
  { id: "goblin-2024", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 10, armor_class: 15, ruleset_version: "2024" },
  { id: "orc-2024", name: "Orc", cr: "1", type: "humanoid", hit_points: 42, armor_class: 13, ruleset_version: "2024" },
];

beforeEach(() => {
  resetSrdIndexes();
  global.fetch = jest.fn((url: string | URL | Request) => {
    const urlStr = url.toString();
    const monsters = urlStr.includes("2024") ? MONSTERS_2024 : MONSTERS_2014;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(monsters),
    } as Response);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("searchMonsters", () => {
  it("returns all monsters when query is empty", async () => {
    const results = await searchMonsters("", "2014");
    expect(results).toHaveLength(MONSTERS_2014.length);
  });

  it("finds a monster by exact name", async () => {
    const results = await searchMonsters("Goblin", "2014");
    expect(results.some((m) => m.name === "Goblin")).toBe(true);
  });

  it("finds a monster by partial name (fuzzy)", async () => {
    const results = await searchMonsters("gob", "2014");
    expect(results.some((m) => m.name === "Goblin")).toBe(true);
  });

  it("finds monsters by type", async () => {
    const results = await searchMonsters("beast", "2014");
    expect(results.every((m) => m.type === "beast")).toBe(true);
  });

  it("returns correct monsters for 2024 ruleset", async () => {
    const results = await searchMonsters("Orc", "2024");
    expect(results).toHaveLength(1);
    expect(results[0].ruleset_version).toBe("2024");
    expect(results[0].hit_points).toBe(42);
  });

  it("returns empty array for a query with no matches", async () => {
    const results = await searchMonsters("xyzzy", "2014");
    expect(results).toHaveLength(0);
  });

  it("builds the index only once per version (fetch called once)", async () => {
    await searchMonsters("Goblin", "2014");
    await searchMonsters("Orc", "2014");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
