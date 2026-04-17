import Fuse from "fuse.js";
import { normalizeForSearch } from "@/lib/srd/normalize-query";

/**
 * S3.3 (beta-4 Wave 2 Track β) — covers the normalizeForSearch helper and a
 * minimal contract check for Fuse with `ignoreDiacritics: true` + threshold 0.4.
 */

describe("normalizeForSearch", () => {
  it("is case-insensitive for plain ASCII", () => {
    expect(normalizeForSearch("Velociraptor")).toBe(normalizeForSearch("velociraptor"));
    expect(normalizeForSearch("VELOCIRAPTOR")).toBe(normalizeForSearch("velociraptor"));
  });

  it("folds Portuguese diacritics (ã, â, á, é, ê, í, ó, ô, õ, ú, ç)", () => {
    expect(normalizeForSearch("Dragão")).toBe("dragao");
    expect(normalizeForSearch("Velociráptor")).toBe(normalizeForSearch("velociraptor"));
    expect(normalizeForSearch("Rêmora")).toBe("remora");
    expect(normalizeForSearch("Coração")).toBe(normalizeForSearch("coracao"));
  });

  it("returns empty string for empty / null / undefined inputs", () => {
    expect(normalizeForSearch("")).toBe("");
    expect(normalizeForSearch(null)).toBe("");
    expect(normalizeForSearch(undefined)).toBe("");
  });

  it("preserves unicode letters beyond Latin-1 (CJK, Arabic)", () => {
    // Chinese characters survive the NFD+strip pass (they're letters, not diacritic combining marks)
    expect(normalizeForSearch("火龙")).toBe("火龙");
    // Arabic: also preserved
    expect(normalizeForSearch("تنين")).toBe("تنين");
  });

  it("strips punctuation and hyphens but preserves interior spaces", () => {
    expect(normalizeForSearch("Owl-Bear")).toBe("owl bear");
    expect(normalizeForSearch("Half-Elf, Noble!")).toBe("half elf noble");
  });

  it("does NOT accidentally make unrelated names match (Owlbear vs urso coruja)", () => {
    // Different lexemes shouldn't collide after fold — protects against over-aggressive stripping.
    expect(normalizeForSearch("Owlbear").includes(normalizeForSearch("urso coruja"))).toBe(false);
    expect(normalizeForSearch("urso coruja").includes(normalizeForSearch("Owlbear"))).toBe(false);
  });

  it("collapses whitespace runs to single spaces", () => {
    expect(normalizeForSearch("Red   Dragon\t\nAncient")).toBe("red dragon ancient");
  });

  it("is idempotent (f(f(x)) === f(x))", () => {
    const inputs = ["Dragão", "Velociráptor", "Owl-Bear", "Rêmora", " multi  space  "];
    for (const s of inputs) {
      expect(normalizeForSearch(normalizeForSearch(s))).toBe(normalizeForSearch(s));
    }
  });
});

describe("Fuse with ignoreDiacritics + threshold 0.4", () => {
  type Item = { name: string; name_pt?: string };
  const data: Item[] = [
    { name: "Velociraptor", name_pt: "Velociráptor" },
    { name: "Red Dragon", name_pt: "Dragão Vermelho" },
    { name: "Owlbear", name_pt: "Urso-Coruja" },
    { name: "Ogre", name_pt: "Ogro" },
    { name: "Dog", name_pt: "Cão" },
    { name: "Remora", name_pt: "Rêmora" },
  ];

  const fuse = new Fuse(data, {
    keys: [
      { name: "name", weight: 0.5 },
      { name: "name_pt", weight: 0.5 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    ignoreDiacritics: true,
    includeScore: true,
    minMatchCharLength: 2,
  });

  it("retrieves 'Velociraptor' for prefix 'velocir' (no accent query)", () => {
    const results = fuse.search("velocir");
    const names = results.map((r) => r.item.name);
    expect(names).toContain("Velociraptor");
  });

  it("retrieves 'Rêmora' for query 'remora' (no accent)", () => {
    const results = fuse.search("remora");
    const names = results.map((r) => r.item.name);
    expect(names).toContain("Remora");
  });

  it("retrieves 'Dragão Vermelho' for query 'dragao'", () => {
    const results = fuse.search("dragao");
    const names = results.map((r) => r.item.name);
    expect(names).toContain("Red Dragon");
  });

  it("ranks 'Ogre' above 'Dog' for query 'ogr' at threshold 0.4 (over-fuzzy sanity)", () => {
    // Spec goal: a 3-letter query shouldn't let 'Dog' outrank 'Ogre'. With
    // threshold 0.4 Fuse may still surface 'Dog' as a weak match on tiny
    // toy datasets, but 'Ogre' must come first (better score = lower number).
    const results = fuse.search("ogr");
    const names = results.map((r) => r.item.name);
    expect(names[0]).toBe("Ogre");
    const ogre = results.find((r) => r.item.name === "Ogre");
    const dog = results.find((r) => r.item.name === "Dog");
    if (dog) {
      expect(ogre!.score!).toBeLessThan(dog.score!);
    }
  });

  it("caller-side: PlayerCompendiumBrowser-style filter matches PT names when typed without accents", () => {
    // Simulates the filter lambda in PlayerCompendiumBrowser.tsx: normalize both sides.
    const needle = normalizeForSearch("dragao vermelho");
    const matches = data.filter(
      (m) =>
        normalizeForSearch(m.name).includes(needle) ||
        normalizeForSearch(m.name_pt).includes(needle)
    );
    expect(matches.map((m) => m.name)).toEqual(["Red Dragon"]);
  });
});
