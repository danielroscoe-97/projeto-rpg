import { loadMonsters, loadSpells, loadConditions, _clearMonsterCache } from "./srd-loader";

const mockJson = jest.fn();

beforeEach(() => {
  mockJson.mockReset();
  _clearMonsterCache();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: mockJson,
  } as unknown as Response);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("loadMonsters", () => {
  it("fetches the 2014 monster bundle at the correct URL", async () => {
    mockJson.mockResolvedValue([]);
    await loadMonsters("2014");
    expect(global.fetch).toHaveBeenCalledWith("/srd/monsters-2014.json");
  });

  it("fetches the 2024 monster bundle at the correct URL", async () => {
    mockJson.mockResolvedValue([]);
    await loadMonsters("2024");
    expect(global.fetch).toHaveBeenCalledWith("/srd/monsters-2024.json");
  });

  it("returns parsed JSON data", async () => {
    const data = [{ id: "goblin", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 7, armor_class: 15, ruleset_version: "2014" as const }];
    mockJson.mockResolvedValue(data);
    const result = await loadMonsters("2014");
    expect(result).toEqual(data);
  });

  it("throws when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(loadMonsters("2014")).rejects.toThrow("Failed to load SRD monsters (2014): 404");
  });
});

describe("loadSpells", () => {
  it("fetches the 2014 spell bundle at the correct URL", async () => {
    mockJson.mockResolvedValue([]);
    await loadSpells("2014");
    expect(global.fetch).toHaveBeenCalledWith("/srd/spells-2014.json");
  });

  it("fetches the 2024 spell bundle at the correct URL", async () => {
    mockJson.mockResolvedValue([]);
    await loadSpells("2024");
    expect(global.fetch).toHaveBeenCalledWith("/srd/spells-2024.json");
  });

  it("returns parsed JSON data", async () => {
    const data = [{ id: "fireball", name: "Fireball", ruleset_version: "2014" as const }];
    mockJson.mockResolvedValue(data);
    const result = await loadSpells("2014");
    expect(result).toEqual(data);
  });

  it("throws when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(loadSpells("2014")).rejects.toThrow("Failed to load SRD spells (2014): 404");
  });
});

describe("loadConditions", () => {
  it("fetches the conditions bundle at the correct URL", async () => {
    mockJson.mockResolvedValue([]);
    await loadConditions();
    expect(global.fetch).toHaveBeenCalledWith("/srd/conditions.json");
  });

  it("returns parsed JSON data", async () => {
    const data = [{ id: "blinded", name: "Blinded", description: "Can't see." }];
    mockJson.mockResolvedValue(data);
    const result = await loadConditions();
    expect(result).toEqual(data);
  });

  it("throws when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(loadConditions()).rejects.toThrow("Failed to load SRD conditions: 500");
  });
});
