import {
  buildMonsterIndex,
  buildSpellIndex,
  buildItemIndex,
  buildFeatIndex,
  buildBackgroundIndex,
  setConditionData,
  searchMonsters,
  searchSpells,
  searchItems,
  searchFeats,
  searchBackgrounds,
  findCondition,
  getAllConditions,
  getMonsterById,
  getSpellById,
  getItemById,
  getFeatById,
  getAllBackgrounds,
  injectTranslationsAndRebuild,
  resetSrdIndexes,
  type SrdFeatEntry,
  type SrdBackgroundEntry,
} from "./srd-search";
import type { SrdMonster, SrdSpell, SrdCondition, SrdItem } from "./srd-loader";

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

// --- injectTranslationsAndRebuild — slug fallback (S3.6 fix) ---
//
// Repro context: `data/srd/*-descriptions-pt.json` is keyed by `toSlug(entity.name)`
// (no source suffix), but SRD ids include source suffixes like `-mm`, `-tce`, `-phb`.
// Before the fix, lookup by `entity.id` returned undefined for ~100% of monsters/
// spells and ~93% of items, so the Fuse index never got PT-BR name tokens.

const SUFFIXED_MONSTERS: SrdMonster[] = [
  // Source-suffixed id (most common case)
  { id: "velociraptor-mm", name: "Velociraptor", cr: "1/4", type: "beast", hit_points: 10, armor_class: 13, ruleset_version: "2014" },
  { id: "owlbear-mm", name: "Owlbear", cr: "3", type: "monstrosity", hit_points: 59, armor_class: 13, ruleset_version: "2014" },
  // Id without suffix (legacy / SRD-only data — backwards compat path)
  { id: "goblin", name: "Goblin", cr: "1/4", type: "humanoid", hit_points: 7, armor_class: 15, ruleset_version: "2014" },
];

const SUFFIXED_SPELLS: SrdSpell[] = [
  {
    id: "fireball-phb",
    name: "Fireball",
    ruleset_version: "2014",
    level: 3, school: "Evocation",
    casting_time: "1 action", range: "150 feet",
    components: "V, S, M", duration: "Instantaneous",
    description: "…", higher_levels: null,
    classes: ["Sorcerer", "Wizard"],
    ritual: false, concentration: false,
  },
  {
    id: "cure-wounds",
    name: "Cure Wounds",
    ruleset_version: "2014",
    level: 1, school: "Evocation",
    casting_time: "1 action", range: "Touch",
    components: "V, S", duration: "Instantaneous",
    description: "…", higher_levels: null,
    classes: ["Cleric"],
    ritual: false, concentration: false,
  },
];

const SUFFIXED_ITEMS: SrdItem[] = [
  // Suffixed id (non-SRD items — the bulk of the 2707 items)
  {
    id: "1-rod-of-the-pact-keeper-dmg",
    name: "+1 Rod of the Pact Keeper",
    source: "DMG", type: "R", rarity: "uncommon", isMagic: true, entries: [],
  },
  {
    id: "astral-shard-tce",
    name: "Astral Shard",
    source: "TCE", type: "OTH", rarity: "rare", isMagic: true, entries: [],
  },
  // Id without suffix → exercises id-first branch (backwards compat)
  {
    id: "potion-of-healing",
    name: "Potion of Healing",
    source: "DMG", type: "P", rarity: "common", isMagic: true, entries: [],
  },
];

const SUFFIXED_FEATS: SrdFeatEntry[] = [
  { id: "aberrant-dragonmark-efa", name: "Aberrant Dragonmark", description: "", prerequisite: null, source: "EFA", ruleset_version: "2014" },
  { id: "actor-phb", name: "Actor", description: "", prerequisite: null, source: "PHB", ruleset_version: "2014" },
];

const SUFFIXED_BACKGROUNDS: SrdBackgroundEntry[] = [
  { id: "acolyte-phb", name: "Acolyte", description: "", source: "PHB", skill_proficiencies: ["Insight", "Religion"], feature_name: null, feature_description: null },
  { id: "anthropologist-toa", name: "Anthropologist", description: "", source: "TOA", skill_proficiencies: ["Insight", "Religion"], feature_name: null, feature_description: null },
];

describe("injectTranslationsAndRebuild — slug fallback (S3.6)", () => {
  // Deep-clone fixtures every test — injectTranslationsAndRebuild mutates entries
  // in place for zero-copy efficiency, which would leak state across test cases
  // if the module-level fixture arrays were reused.
  const cloneMonsters = () => SUFFIXED_MONSTERS.map((m) => ({ ...m }));
  const cloneSpells = () => SUFFIXED_SPELLS.map((s) => ({ ...s, classes: [...s.classes] }));
  const cloneItems = () => SUFFIXED_ITEMS.map((i) => ({ ...i, entries: [...i.entries] }));
  const cloneFeats = () => SUFFIXED_FEATS.map((f) => ({ ...f }));
  const cloneBackgrounds = () =>
    SUFFIXED_BACKGROUNDS.map((b) => ({ ...b, skill_proficiencies: [...b.skill_proficiencies] }));

  beforeEach(() => {
    resetSrdIndexes();
  });

  afterEach(() => {
    resetSrdIndexes();
  });

  describe("monsters", () => {
    it("injects name_pt via toSlug(name) when id has source suffix", () => {
      buildMonsterIndex(cloneMonsters());
      injectTranslationsAndRebuild({
        monsters: { velociraptor: "Velociraptor", owlbear: "Urso-coruja" },
      });
      const velo = getMonsterById("velociraptor-mm", "2014");
      const owl = getMonsterById("owlbear-mm", "2014");
      expect(velo?.name_pt).toBe("Velociraptor");
      expect(owl?.name_pt).toBe("Urso-coruja");
    });

    it("does not crash and leaves name_pt undefined when no translation matches", () => {
      buildMonsterIndex(cloneMonsters());
      injectTranslationsAndRebuild({ monsters: { "something-else": "N/A" } });
      const velo = getMonsterById("velociraptor-mm", "2014");
      expect(velo).toBeDefined();
      expect(velo?.name_pt).toBeUndefined();
    });

    it("preserves id-first lookup for legacy data keyed by raw id", () => {
      buildMonsterIndex(cloneMonsters());
      injectTranslationsAndRebuild({ monsters: { goblin: "Goblin" } });
      expect(getMonsterById("goblin", "2014")?.name_pt).toBe("Goblin");
    });

    it("makes the PT-BR name searchable via Fuse after rebuild", () => {
      buildMonsterIndex(cloneMonsters());
      injectTranslationsAndRebuild({
        monsters: { owlbear: "Urso-coruja" },
      });
      const results = searchMonsters("Urso-coruja");
      expect(results.some((r) => r.item.id === "owlbear-mm")).toBe(true);
    });

    it("is idempotent — second call with same map yields same injected names", () => {
      buildMonsterIndex(cloneMonsters());
      const map = { velociraptor: "Velociraptor" };
      injectTranslationsAndRebuild({ monsters: map });
      const firstPt = getMonsterById("velociraptor-mm", "2014")?.name_pt;
      injectTranslationsAndRebuild({ monsters: map });
      const secondPt = getMonsterById("velociraptor-mm", "2014")?.name_pt;
      expect(firstPt).toBe("Velociraptor");
      expect(secondPt).toBe("Velociraptor");
    });
  });

  describe("spells", () => {
    it("injects name_pt via toSlug(name) when id has source suffix", () => {
      buildSpellIndex(cloneSpells());
      injectTranslationsAndRebuild({
        spells: { fireball: "Bola de Fogo" },
      });
      expect(getSpellById("fireball-phb", "2014")?.name_pt).toBe("Bola de Fogo");
    });

    it("preserves id-first lookup for spells keyed by raw id", () => {
      buildSpellIndex(cloneSpells());
      injectTranslationsAndRebuild({
        spells: { "cure-wounds": "Curar Ferimentos" },
      });
      expect(getSpellById("cure-wounds", "2014")?.name_pt).toBe("Curar Ferimentos");
    });

    it("makes the PT-BR name searchable via Fuse after rebuild", () => {
      buildSpellIndex(cloneSpells());
      injectTranslationsAndRebuild({
        spells: { fireball: "Bola de Fogo" },
      });
      const results = searchSpells("Bola de Fogo");
      expect(results.some((r) => r.item.id === "fireball-phb")).toBe(true);
    });
  });

  describe("items", () => {
    it("injects name_pt via toSlug(name) when id has source suffix", () => {
      buildItemIndex(cloneItems());
      injectTranslationsAndRebuild({
        items: {
          "1-rod-of-the-pact-keeper": "Bastão do Selo de Pacto +1",
          "astral-shard": "Fragmento Astral",
        },
      });
      expect(getItemById("1-rod-of-the-pact-keeper-dmg")?.name_pt)
        .toBe("Bastão do Selo de Pacto +1");
      expect(getItemById("astral-shard-tce")?.name_pt).toBe("Fragmento Astral");
    });

    it("preserves id-first lookup for items keyed by raw id", () => {
      buildItemIndex(cloneItems());
      injectTranslationsAndRebuild({
        items: { "potion-of-healing": "Poção de Cura" },
      });
      expect(getItemById("potion-of-healing")?.name_pt).toBe("Poção de Cura");
    });

    it("does not crash when translation map lacks both id and slug", () => {
      buildItemIndex(cloneItems());
      injectTranslationsAndRebuild({ items: { "some-other-slug": "X" } });
      expect(getItemById("1-rod-of-the-pact-keeper-dmg")?.name_pt).toBeUndefined();
      expect(getItemById("astral-shard-tce")?.name_pt).toBeUndefined();
    });

    it("makes the PT-BR name searchable via Fuse after rebuild", () => {
      buildItemIndex(cloneItems());
      injectTranslationsAndRebuild({
        items: { "astral-shard": "Fragmento Astral" },
      });
      const results = searchItems("Fragmento Astral");
      expect(results.some((r) => r.item.id === "astral-shard-tce")).toBe(true);
    });

    it("is idempotent — second call with same map yields same injected names", () => {
      buildItemIndex(cloneItems());
      const map = { "astral-shard": "Fragmento Astral" };
      injectTranslationsAndRebuild({ items: map });
      const first = getItemById("astral-shard-tce")?.name_pt;
      injectTranslationsAndRebuild({ items: map });
      const second = getItemById("astral-shard-tce")?.name_pt;
      expect(first).toBe("Fragmento Astral");
      expect(second).toBe("Fragmento Astral");
    });
  });

  describe("feats and backgrounds", () => {
    it("injects feat name_pt via toSlug(name) when id has source suffix", () => {
      buildFeatIndex(cloneFeats());
      injectTranslationsAndRebuild({
        feats: { actor: "Ator", "aberrant-dragonmark": "Marca Draconiana Aberrante" },
      });
      expect(getFeatById("actor-phb")?.name_pt).toBe("Ator");
      expect(getFeatById("aberrant-dragonmark-efa")?.name_pt)
        .toBe("Marca Draconiana Aberrante");
    });

    it("injects background name_pt via toSlug(name) when id has source suffix", () => {
      buildBackgroundIndex(cloneBackgrounds());
      injectTranslationsAndRebuild({
        backgrounds: { acolyte: "Acólito" },
      });
      const all = getAllBackgrounds();
      const acolyte = all.find((b) => b.id === "acolyte-phb");
      expect(acolyte?.name_pt).toBe("Acólito");
    });

    it("feats & backgrounds Fuse index finds entries by PT-BR name after rebuild", () => {
      buildFeatIndex(cloneFeats());
      buildBackgroundIndex(cloneBackgrounds());
      injectTranslationsAndRebuild({
        feats: { actor: "Ator" },
        backgrounds: { acolyte: "Acólito" },
      });
      expect(searchFeats("Ator").some((r) => r.item.id === "actor-phb")).toBe(true);
      expect(searchBackgrounds("Acólito").some((r) => r.item.id === "acolyte-phb")).toBe(true);
    });
  });
});
