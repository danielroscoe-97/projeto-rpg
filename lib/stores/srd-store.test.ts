import { useSrdStore } from "./srd-store";
import * as loader from "@/lib/srd/srd-loader";
import * as cache from "@/lib/srd/srd-cache";
import * as fuseProvider from "@/lib/srd/fuse-search-provider";

jest.mock("@/lib/srd/srd-loader");
jest.mock("@/lib/srd/srd-cache");
jest.mock("@/lib/srd/fuse-search-provider", () => ({
  srdSearchProvider: {
    buildMonsterIndex: jest.fn(),
    buildSpellIndex: jest.fn(),
    buildItemIndex: jest.fn(),
    setConditionData: jest.fn(),
    mergeImportedMonsters: jest.fn(),
  },
}));

const provider = fuseProvider.srdSearchProvider;

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
const ITEMS = [
  { id: "longsword", name: "Longsword", source: "PHB", type: "melee-weapon" as const, rarity: "none" as const, isMagic: false, entries: ["A versatile weapon."] },
];

// Stub requestIdleCallback so deferred loads run synchronously in tests
let idleCallbacks: (() => void)[] = [];
(globalThis as Record<string, unknown>).requestIdleCallback = (cb: () => void) => {
  idleCallbacks.push(cb);
  return 0;
};

function flushIdleCallbacks() {
  const cbs = [...idleCallbacks];
  idleCallbacks = [];
  cbs.forEach((cb) => cb());
}

beforeEach(() => {
  jest.clearAllMocks();
  idleCallbacks = [];
  // Reset store state between tests
  useSrdStore.setState({
    monsters: [],
    spells: [],
    conditions: [],
    items: [],
    is_loading: false,
    loadedVersions: new Set(),
    error: null,
  });

  // Default: cache miss → fetch
  (cache.getCachedMonsters as jest.Mock).mockResolvedValue(null);
  (cache.getCachedSpells as jest.Mock).mockResolvedValue(null);
  (cache.getCachedConditions as jest.Mock).mockResolvedValue(null);
  (cache.getCachedItems as jest.Mock).mockResolvedValue(null);
  (cache.setCachedMonsters as jest.Mock).mockResolvedValue(undefined);
  (cache.setCachedSpells as jest.Mock).mockResolvedValue(undefined);
  (cache.setCachedConditions as jest.Mock).mockResolvedValue(undefined);
  (cache.setCachedItems as jest.Mock).mockResolvedValue(undefined);

  (loader.loadMonsters as jest.Mock).mockImplementation((v: string) =>
    Promise.resolve(v === "2014" ? MONSTERS_2014 : MONSTERS_2024)
  );
  (loader.loadSpells as jest.Mock).mockImplementation((v: string) =>
    Promise.resolve(v === "2014" ? SPELLS_2014 : SPELLS_2024)
  );
  (loader.loadConditions as jest.Mock).mockResolvedValue(CONDITIONS);
  (loader.loadItems as jest.Mock).mockResolvedValue(ITEMS);

  (provider.buildMonsterIndex as jest.Mock).mockImplementation(() => {});
  (provider.buildSpellIndex as jest.Mock).mockImplementation(() => {});
  (provider.buildItemIndex as jest.Mock).mockImplementation(() => {});
  (provider.setConditionData as jest.Mock).mockImplementation(() => {});
});

describe("useSrdStore.initializeSrd", () => {
  it("sets is_loading true during initialization", async () => {
    let loadingDuringRun = false;
    (loader.loadMonsters as jest.Mock).mockImplementation(async () => {
      loadingDuringRun = useSrdStore.getState().is_loading;
      return MONSTERS_2024;
    });
    await useSrdStore.getState().initializeSrd();
    expect(loadingDuringRun).toBe(true);
  });

  it("sets is_loading false after completion", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(useSrdStore.getState().is_loading).toBe(false);
  });

  it("loads only primary version (2024) on init, defers 2014", async () => {
    await useSrdStore.getState().initializeSrd();

    // Only 2024 loaded in critical path
    expect(loader.loadMonsters).toHaveBeenCalledWith("2024");
    expect(loader.loadSpells).toHaveBeenCalledWith("2024");
    expect(loader.loadMonsters).not.toHaveBeenCalledWith("2014");
    expect(loader.loadSpells).not.toHaveBeenCalledWith("2014");
    expect(loader.loadConditions).toHaveBeenCalled();
    expect(loader.loadItems).toHaveBeenCalled();
  });

  it("loads 2014 version in deferred idle callback", async () => {
    await useSrdStore.getState().initializeSrd();

    // Flush idle callbacks to trigger deferred load
    await Promise.resolve(); // let microtasks settle
    flushIdleCallbacks();
    await Promise.resolve(); // let loadVersionOnDemand settle

    expect(loader.loadMonsters).toHaveBeenCalledWith("2014");
    expect(loader.loadSpells).toHaveBeenCalledWith("2014");
  });

  it("writes data to cache after fetch", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(cache.setCachedMonsters).toHaveBeenCalledWith("2024", MONSTERS_2024);
    expect(cache.setCachedSpells).toHaveBeenCalledWith("2024", SPELLS_2024);
    expect(cache.setCachedConditions).toHaveBeenCalledWith(CONDITIONS);
    expect(cache.setCachedItems).toHaveBeenCalledWith(ITEMS);
  });

  it("uses cached data when available (no fetch)", async () => {
    (cache.getCachedMonsters as jest.Mock).mockResolvedValue(MONSTERS_2024);
    (cache.getCachedSpells as jest.Mock).mockResolvedValue(SPELLS_2024);
    (cache.getCachedConditions as jest.Mock).mockResolvedValue(CONDITIONS);
    (cache.getCachedItems as jest.Mock).mockResolvedValue(ITEMS);

    await useSrdStore.getState().initializeSrd();

    expect(loader.loadMonsters).not.toHaveBeenCalled();
    expect(loader.loadSpells).not.toHaveBeenCalled();
    expect(loader.loadConditions).not.toHaveBeenCalled();
    expect(loader.loadItems).not.toHaveBeenCalled();
  });

  it("builds Fuse.js indexes with primary version data on init", async () => {
    await useSrdStore.getState().initializeSrd();
    expect(provider.buildMonsterIndex).toHaveBeenCalledWith(MONSTERS_2024);
    expect(provider.buildSpellIndex).toHaveBeenCalledWith(SPELLS_2024);
    expect(provider.buildItemIndex).toHaveBeenCalledWith(ITEMS);
    expect(provider.setConditionData).toHaveBeenCalledWith(CONDITIONS);
  });

  it("stores primary version data in the Zustand state", async () => {
    await useSrdStore.getState().initializeSrd();
    const state = useSrdStore.getState();
    expect(state.monsters).toEqual(MONSTERS_2024);
    expect(state.spells).toEqual(SPELLS_2024);
    expect(state.conditions).toEqual(CONDITIONS);
    expect(state.items).toEqual(ITEMS);
    expect(state.loadedVersions.has("2024")).toBe(true);
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

describe("useSrdStore.loadVersionOnDemand", () => {
  it("loads and merges a new version into existing data", async () => {
    await useSrdStore.getState().initializeSrd();

    // Now load 2014 on demand
    await useSrdStore.getState().loadVersionOnDemand("2014");

    const state = useSrdStore.getState();
    expect(state.monsters).toEqual([...MONSTERS_2024, ...MONSTERS_2014]);
    expect(state.spells).toEqual([...SPELLS_2024, ...SPELLS_2014]);
    expect(state.loadedVersions.has("2014")).toBe(true);
    expect(state.loadedVersions.has("2024")).toBe(true);
  });

  it("rebuilds indexes after merging new version", async () => {
    await useSrdStore.getState().initializeSrd();
    jest.clearAllMocks();

    await useSrdStore.getState().loadVersionOnDemand("2014");

    expect(provider.buildMonsterIndex).toHaveBeenCalledWith([...MONSTERS_2024, ...MONSTERS_2014]);
    expect(provider.buildSpellIndex).toHaveBeenCalledWith([...SPELLS_2024, ...SPELLS_2014]);
  });

  it("skips if version already loaded", async () => {
    await useSrdStore.getState().initializeSrd();
    jest.clearAllMocks();

    await useSrdStore.getState().loadVersionOnDemand("2024");

    expect(loader.loadMonsters).not.toHaveBeenCalled();
    expect(loader.loadSpells).not.toHaveBeenCalled();
  });

  it("fails silently on error (non-critical)", async () => {
    await useSrdStore.getState().initializeSrd();
    (loader.loadMonsters as jest.Mock).mockRejectedValue(new Error("offline"));

    await expect(
      useSrdStore.getState().loadVersionOnDemand("2014")
    ).resolves.toBeUndefined();

    // State unchanged
    expect(useSrdStore.getState().loadedVersions.has("2014")).toBe(false);
  });
});
