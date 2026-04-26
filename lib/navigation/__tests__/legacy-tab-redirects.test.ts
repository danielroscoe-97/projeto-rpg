import {
  LEGACY_TAB_REDIRECTS,
  buildRedirectTarget,
  resolveTabParam,
} from "../legacy-tab-redirects";

describe("LEGACY_TAB_REDIRECTS", () => {
  it("covers all 7 legacy tab keys per spec §B3", () => {
    expect(Object.keys(LEGACY_TAB_REDIRECTS).sort()).toEqual(
      [
        "ficha",
        "habilidades",
        "inventario",
        "map",
        "notas",
        "quests",
        "recursos",
      ].sort(),
    );
  });

  it.each([
    ["ficha", { tab: "heroi" }],
    ["recursos", { tab: "heroi", section: "recursos" }],
    ["habilidades", { tab: "arsenal", section: "habilidades" }],
    ["inventario", { tab: "arsenal" }],
    ["notas", { tab: "diario", section: "notas" }],
    ["quests", { tab: "diario", section: "quests" }],
    ["map", { tab: "mapa" }],
  ] as const)("maps %s correctly", (legacy, expected) => {
    expect(LEGACY_TAB_REDIRECTS[legacy]).toEqual(expected);
  });

  it("does not include any V2 canonical key (no redirect loop risk)", () => {
    const v2Tabs = ["heroi", "arsenal", "diario", "mapa"];
    for (const v2 of v2Tabs) {
      expect(LEGACY_TAB_REDIRECTS).not.toHaveProperty(v2);
    }
  });
});

describe("resolveTabParam", () => {
  it("returns the string value when tab is a single string", () => {
    expect(resolveTabParam({ tab: "ficha" })).toBe("ficha");
  });

  it("returns the first value when tab is an array", () => {
    expect(resolveTabParam({ tab: ["ficha", "recursos"] })).toBe("ficha");
  });

  it("returns undefined when tab is missing", () => {
    expect(resolveTabParam({})).toBeUndefined();
    expect(resolveTabParam(undefined)).toBeUndefined();
  });

  it("returns undefined when tab is explicitly undefined", () => {
    expect(resolveTabParam({ tab: undefined })).toBeUndefined();
  });
});

describe("buildRedirectTarget", () => {
  const cid = "abc-123";

  it("builds a basic /sheet URL with tab only", () => {
    const url = buildRedirectTarget(cid, { tab: "heroi" }, {});
    expect(url).toBe(`/app/campaigns/${cid}/sheet?tab=heroi`);
  });

  it("includes section when mapping defines one", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "heroi", section: "recursos" },
      {},
    );
    expect(url).toBe(`/app/campaigns/${cid}/sheet?tab=heroi&section=recursos`);
  });

  it("preserves other query params (e.g. utm_source, debug)", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "heroi" },
      { tab: "ficha", utm_source: "recap", debug: "true" },
    );
    // URLSearchParams.toString preserves insertion order — we set non-tab
    // params first, then tab, then optional section.
    expect(url).toContain("utm_source=recap");
    expect(url).toContain("debug=true");
    expect(url).toContain("tab=heroi");
    expect(url).not.toContain("tab=ficha");
  });

  it("strips the legacy tab and overwrites with mapping.tab", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "arsenal" },
      { tab: "habilidades" },
    );
    expect(url).toContain("tab=arsenal");
    expect(url).not.toContain("tab=habilidades");
  });

  it("overwrites incoming section when mapping defines one", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "diario", section: "quests" },
      { tab: "quests", section: "stale-value" },
    );
    expect(url).toContain("section=quests");
    expect(url).not.toContain("section=stale-value");
  });

  it("does NOT inject section when mapping omits it (drops incoming section too)", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "arsenal" },
      { tab: "inventario", section: "leftover" },
    );
    expect(url).not.toContain("section=");
  });

  it("URL-encodes preserved param values", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "diario" },
      { tab: "notas", note: "hello world" },
    );
    expect(url).toContain("note=hello+world");
  });

  it("collapses array-valued preserved params to first value", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "arsenal" },
      { tab: "habilidades", filter: ["a", "b"] },
    );
    expect(url).toContain("filter=a");
    expect(url).not.toContain("filter=b");
  });

  it("ignores undefined-valued preserved params", () => {
    const url = buildRedirectTarget(
      cid,
      { tab: "heroi" },
      { tab: "ficha", missing: undefined },
    );
    expect(url).not.toContain("missing=");
  });
});
