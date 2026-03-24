import { useSrdStore } from "./srd-store";
import * as loader from "@/lib/srd/srd-loader";
import * as cache from "@/lib/srd/srd-cache";
import * as search from "@/lib/srd/srd-search";

jest.mock("@/lib/srd/srd-loader");
jest.mock("@/lib/srd/srd-cache");
jest.mock("@/lib/srd/srd-search");

const MONSTERS_2014 = [
  { id: "goblin", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 7, armor_class: 15, ruleset_version: "2014" as const },
];
const MONSTERS_2024 = [
  { id: "goblin-2024", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 10, armor_class: 15, ruleset_version: "2024" as const },
];
const SPELLS_2014 = [
  { id: "fireball", name: "Fireball", ruleset_version: "2014" as const, level: 3, school: "Evocation", casting_time: "1 action", range: "150 feet", components: "V, S, M", duration: "Instantaneous", description: "...", higher_levels: null, classes: ["Wizard"], ritual: false, concentration: false },
];
const SPELLS_2024 = [
  { id: "fireball-2024", name: "Fireball", ruleset_version: "2024" as const, level: 3, school: "Evocation", casting_time: "1 action", range: "150 feet", components: "V, S, M", duration: "Instantaneous", description: "...", higher_levels: null, classes: ["Wizard"], ritual: false, concentration: false },
];
const CONDITIONS = [
  { id: "blinded", name: "Blinded", description: "Can't see." },
];

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store state between tests
  useSrdStore.setState({
    monsters: [],
    spells: [],
    conditions: [],
    is_loading: false,
    error: null,
  });

  // Default: cache miss → fetch
  (cache.getCachedMonsters as jest.Mock).mockResolvedValue(null);
  (cache.getCachedSpells as jest.Mock).mockResolvedValue(null);
  (cache.getCachedConditions as jest.Mock).mockResolvedValue(null);
  (cache.setCachedMonsters as jest.Mock).mockResolvedValue(undefined);
  (cache.setCachedSpells as jest.Mock).mockResolvedValue(undefined);
  (cache.setCachedConditions as jest.Mock).mockResolvedValue(undefined);

  (loader.loadMonsters as jest.Mock).mockImplementation((v: string) =>
    Promise.resolve(v === "2014" ? MONSTERS_2014 : MONSTERS_2024)
  );
  (loader.loadSpells as jest.Mock).mockImplementation((v: string) =>
    Promise.resolve(v === "2014" ? SPELLS_2014 : SPELLS_2024)
  );
  (loader.loadConditions as jest.Mock).mockResolvedValue(CONDITIONS);

  (search.buildMonsterIndex as jest.Mock).mockImplementation(() => {});
  (search.buildSpellIndex as jest.Mock).mockImplementation(() => {});
  (search.setConditionData as jest.Mock).mockImplementation(() => {});
});

describe("useSrdStore.initializeSrd", () => {
  it("sets is_loading true during initialization", async () => {
    let loadingDuringRun = false;
    (loader.loadMonsters as jest.Mock).mockImplementation(async () => {
      loadingDuringRun = useSrdStore.getState().is_loading;
      return MONSTERS_2014;
    });
    await useSrdStore.getState().initializeSrd();
    expect(loadingDuringRun).toBe(true);
  });

  it("sets is_loading false after completion", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(useSrdStore.getState().is_loading).toBe(false);
  });

  it("falls back to fetch when cache misses", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(loader.loadMonsters).toHaveBeenCalledWith("2014");
    expect(loader.loadMonsters).toHaveBeenCalledWith("2024");
    expect(loader.loadSpells).toHaveBeenCalledWith("2014");
    expect(loader.loadSpells).toHaveBeenCalledWith("2024");
    expect(loader.loadConditions).toHaveBeenCalled();
  });

  it("writes data to cache after fetch", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(cache.setCachedMonsters).toHaveBeenCalledWith("2014", MONSTERS_2014);
    expect(cache.setCachedMonsters).toHaveBeenCalledWith("2024", MONSTERS_2024);
    expect(cache.setCachedSpells).toHaveBeenCalledWith("2014", SPELLS_2014);
    expect(cache.setCachedSpells).toHaveBeenCalledWith("2024", SPELLS_2024);
    expect(cache.setCachedConditions).toHaveBeenCalledWith(CONDITIONS);
  });

  it("uses cached data when available (no fetch)", async () => {
    (cache.getCachedMonsters as jest.Mock).mockResolvedValue(MONSTERS_2014);
    (cache.getCachedSpells as jest.Mock).mockResolvedValue(SPELLS_2014);
    (cache.getCachedConditions as jest.Mock).mockResolvedValue(CONDITIONS);

    await useSrdStore.getState().initializeSrd();

    expect(loader.loadMonsters).not.toHaveBeenCalled();
    expect(loader.loadSpells).not.toHaveBeenCalled();
    expect(loader.loadConditions).not.toHaveBeenCalled();
  });

  it("builds Fuse.js indexes with combined data from both versions", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(search.buildMonsterIndex).toHaveBeenCalledWith([
      ...MONSTERS_2014,
      ...MONSTERS_2024,
    ]);
    expect(search.buildSpellIndex).toHaveBeenCalledWith([
      ...SPELLS_2014,
      ...SPELLS_2024,
    ]);
    expect(search.setConditionData).toHaveBeenCalledWith(CONDITIONS);
  });

  it("stores all data in the Zustand state", async () => {
    await useSrdStore.getState().initializeSrd();
    const state = useSrdStore.getState();
    expect(state.monsters).toEqual([...MONSTERS_2014, ...MONSTERS_2024]);
    expect(state.spells).toEqual([...SPELLS_2014, ...SPELLS_2024]);
    expect(state.conditions).toEqual(CONDITIONS);
    expect(state.error).toBeNull();
  });

  it("sets error and clears is_loading on fetch failure", async () => {
    (loader.loadMonsters as jest.Mock).mockRejectedValue(
      new Error("Network error")
    );
    await useSrdStore.getState().initializeSrd();
    const state = useSrdStore.getState();
    expect(state.is_loading).toBe(false);
    expect(state.error).toBe("Network error");
  });

  it("does not throw on failure — oracle degrades gracefully", async () => {
    (loader.loadMonsters as jest.Mock).mockRejectedValue(new Error("fail"));
    await expect(useSrdStore.getState().initializeSrd()).resolves.toBeUndefined();
  });
});
