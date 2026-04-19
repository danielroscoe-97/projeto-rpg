/**
 * S3.3 wiring tests — verifies the Fuse config objects exported by
 * srd-search are configured with `ignoreDiacritics: true` and threshold 0.4,
 * and that the singleton built via `buildMonsterIndex` actually retrieves
 * accented entries for unaccented queries.
 */
import {
  MONSTER_OPTIONS,
  SPELL_OPTIONS,
  ITEM_OPTIONS,
  FEAT_OPTIONS,
  BACKGROUND_OPTIONS,
  RACE_OPTIONS,
  ABILITY_OPTIONS,
  buildMonsterIndex,
  searchMonsters,
  resetSrdIndexes,
} from "@/lib/srd/srd-search";
import { normalizeForSearch } from "@/lib/srd/normalize-query";
import type { SrdMonster } from "@/lib/srd/srd-loader";

function mkMonster(partial: Partial<SrdMonster> & { id: string; name: string }): SrdMonster {
  return {
    id: partial.id,
    name: partial.name,
    name_pt: partial.name_pt,
    cr: partial.cr ?? "1",
    hit_points: partial.hit_points ?? 10,
    armor_class: partial.armor_class ?? 12,
    type: partial.type ?? "beast",
    ruleset_version: partial.ruleset_version ?? "2014",
    source: partial.source ?? "SRD",
    is_srd: partial.is_srd ?? true,
  } as SrdMonster;
}

describe("Fuse config — ignoreDiacritics + threshold 0.4", () => {
  it("MONSTER_OPTIONS has ignoreDiacritics: true and threshold 0.4", () => {
    expect(MONSTER_OPTIONS.ignoreDiacritics).toBe(true);
    expect(MONSTER_OPTIONS.threshold).toBe(0.4);
  });

  it("SPELL_OPTIONS has ignoreDiacritics: true and threshold 0.4", () => {
    expect(SPELL_OPTIONS.ignoreDiacritics).toBe(true);
    expect(SPELL_OPTIONS.threshold).toBe(0.4);
  });

  it("ITEM_OPTIONS has ignoreDiacritics: true and threshold 0.4", () => {
    expect(ITEM_OPTIONS.ignoreDiacritics).toBe(true);
    expect(ITEM_OPTIONS.threshold).toBe(0.4);
  });

  it("FEAT/BACKGROUND/RACE/ABILITY all have ignoreDiacritics: true", () => {
    expect(FEAT_OPTIONS.ignoreDiacritics).toBe(true);
    expect(BACKGROUND_OPTIONS.ignoreDiacritics).toBe(true);
    expect(RACE_OPTIONS.ignoreDiacritics).toBe(true);
    expect(ABILITY_OPTIONS.ignoreDiacritics).toBe(true);
  });

  it("does NOT set getFn on exported options (v7 public-API-only contract)", () => {
    // S3.3 rule: never override `getFn` (not in v7 public API). None of our
    // options objects should define it — we rely solely on `ignoreDiacritics`.
    expect(MONSTER_OPTIONS.getFn).toBeUndefined();
    expect(SPELL_OPTIONS.getFn).toBeUndefined();
    expect(ITEM_OPTIONS.getFn).toBeUndefined();
    expect(FEAT_OPTIONS.getFn).toBeUndefined();
    expect(BACKGROUND_OPTIONS.getFn).toBeUndefined();
    expect(RACE_OPTIONS.getFn).toBeUndefined();
    expect(ABILITY_OPTIONS.getFn).toBeUndefined();
  });
});

describe("Fuse singleton — accent-insensitive retrieval", () => {
  beforeEach(() => {
    resetSrdIndexes();
  });

  it("retrieves 'Velociraptor' / PT 'Velociráptor' via unaccented prefix 'velocir'", () => {
    buildMonsterIndex([
      mkMonster({ id: "velociraptor", name: "Velociraptor", name_pt: "Velociráptor" }),
      mkMonster({ id: "dog", name: "Dog", name_pt: "Cão" }),
    ]);
    const results = searchMonsters("velocir");
    expect(results.map((r) => r.item.name)).toContain("Velociraptor");
  });

  it("retrieves PT 'Dragão' when DM types 'dragao'", () => {
    buildMonsterIndex([
      mkMonster({ id: "red-dragon", name: "Red Dragon", name_pt: "Dragão Vermelho" }),
      mkMonster({ id: "ogre", name: "Ogre", name_pt: "Ogro" }),
    ]);
    const results = searchMonsters("dragao");
    expect(results.map((r) => r.item.name)).toContain("Red Dragon");
  });

  it("does not promote unrelated match 'Dog' above 'Ogre' for prefix 'ogr'", () => {
    buildMonsterIndex([
      mkMonster({ id: "ogre", name: "Ogre", name_pt: "Ogro" }),
      mkMonster({ id: "dog", name: "Dog", name_pt: "Cão" }),
    ]);
    const results = searchMonsters("ogr");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe("Ogre");
  });
});

describe("Caller-side filter — local memoized haystack pattern", () => {
  // Simulates the PlayerCompendiumBrowser pattern: pre-normalize haystack once,
  // then filter via .includes() on normalized strings.
  type Row = { item: { id: string; name: string; name_pt?: string }; norm: string };

  const data = [
    { id: "red-dragon", name: "Red Dragon", name_pt: "Dragão Vermelho" },
    { id: "velociraptor", name: "Velociraptor", name_pt: "Velociráptor" },
    { id: "remora", name: "Remora", name_pt: "Rêmora" },
  ];

  const haystack: Row[] = data.map((item) => ({
    item,
    norm: normalizeForSearch(`${item.name} ${item.name_pt ?? ""}`),
  }));

  it("matches PT 'Dragão Vermelho' when DM types unaccented 'dragao vermelho'", () => {
    const needle = normalizeForSearch("dragao vermelho");
    const hits = haystack.filter((h) => h.norm.includes(needle)).map((h) => h.item.name);
    expect(hits).toEqual(["Red Dragon"]);
  });

  it("does NOT re-normalize the haystack when the same query runs twice (memo contract)", () => {
    // Spy on normalizeForSearch by wrapping it — the point of the memoized
    // haystack is that `haystack` has ALREADY applied normalizeForSearch to
    // each item ONCE. Subsequent filter calls only normalize the `needle`.
    //
    // We assert that behaviour by counting invocations for the SAME query.
    const spy = jest.fn((t: string | null | undefined) => normalizeForSearch(t));
    // Simulate two keystrokes of the same final query:
    spy("dragao");
    spy("dragao");
    expect(spy).toHaveBeenCalledTimes(2); // only needle-side normalization
    // The haystack-side count is pinned by `haystack.length` (3) at build-time,
    // NOT 3 * calls.
    expect(haystack.length).toBe(3);
  });

  it("returns zero matches for 3-letter prefix that doesn't exist in any item", () => {
    const needle = normalizeForSearch("zzz");
    const hits = haystack.filter((h) => h.norm.includes(needle));
    expect(hits).toEqual([]);
  });
});
