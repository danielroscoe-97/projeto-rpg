/**
 * Data-integrity tests for the generated monster JSON files.
 * Validates the output of fetch-5etools-bestiary.ts — especially
 * the fallback token assignment logic (100% coverage guarantee).
 */
import { readFileSync } from "fs";
import { join } from "path";

interface SrdMonster {
  id: string;
  name: string;
  cr: string;
  type: string;
  hit_points: number;
  armor_class: number;
  ruleset_version: "2014" | "2024";
  source?: string;
  token_url?: string;
  fallback_token_url?: string;
}

const DATA_DIR = join(__dirname, "../../public/srd");

let monsters2014: SrdMonster[];
let monsters2024: SrdMonster[];
let allMonsters: SrdMonster[];

beforeAll(() => {
  monsters2014 = JSON.parse(readFileSync(join(DATA_DIR, "monsters-2014.json"), "utf8"));
  monsters2024 = JSON.parse(readFileSync(join(DATA_DIR, "monsters-2024.json"), "utf8"));
  allMonsters = [...monsters2014, ...monsters2024];
});

describe("Monster JSON data integrity", () => {
  it("has non-zero monsters in both rulesets", () => {
    expect(monsters2014.length).toBeGreaterThan(100);
    expect(monsters2024.length).toBeGreaterThan(10);
  });

  it("every monster has required fields", () => {
    for (const m of allMonsters) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.type).toBeTruthy();
      expect(m.cr).toBeDefined();
      expect(typeof m.hit_points).toBe("number");
      expect(typeof m.armor_class).toBe("number");
      expect(["2014", "2024"]).toContain(m.ruleset_version);
    }
  });

  it("every monster has a token_url", () => {
    const missing = allMonsters.filter((m) => !m.token_url);
    expect(missing).toEqual([]);
  });

  it("all token_url values are valid HTTPS URLs ending in .webp", () => {
    for (const m of allMonsters) {
      expect(m.token_url).toMatch(/^https:\/\/.+\.webp$/);
    }
  });
});

describe("Fallback token coverage (100% guarantee)", () => {
  it("every monster has a fallback_token_url", () => {
    const missing = allMonsters.filter((m) => !m.fallback_token_url);
    if (missing.length > 0) {
      const names = missing.slice(0, 10).map((m) => `${m.name} (${m.source})`);
      fail(`${missing.length} monsters without fallback: ${names.join(", ")}`);
    }
  });

  it("fallback_token_url is never the same as token_url", () => {
    const same = allMonsters.filter((m) => m.fallback_token_url === m.token_url);
    if (same.length > 0) {
      const names = same.slice(0, 5).map((m) => `${m.name} (${m.source})`);
      fail(`${same.length} monsters with fallback === primary: ${names.join(", ")}`);
    }
  });

  it("all fallback_token_url values are valid HTTPS URLs ending in .webp", () => {
    for (const m of allMonsters) {
      if (m.fallback_token_url) {
        expect(m.fallback_token_url).toMatch(/^https:\/\/.+\.webp$/);
      }
    }
  });
});

describe("Cross-version fallback strategy", () => {
  it("monsters with the same name across rulesets have cross-version fallbacks", () => {
    const names2014 = new Map(monsters2014.map((m) => [m.name.toLowerCase(), m.token_url]));
    const names2024 = new Map(monsters2024.map((m) => [m.name.toLowerCase(), m.token_url]));

    // Check a sample of 2024 monsters that share names with 2014
    for (const m of monsters2024) {
      const crossUrl = names2014.get(m.name.toLowerCase());
      if (crossUrl && crossUrl !== m.token_url) {
        // This monster should have its 2014 counterpart as fallback
        expect(m.fallback_token_url).toBe(crossUrl);
      }
    }
  });
});

describe("parseCRValue consistency", () => {
  it("all CR values are parseable or explicitly Unknown", () => {
    const validCRs = new Set([
      "0", "1/8", "1/4", "1/2", "Unknown",
      ...Array.from({ length: 31 }, (_, i) => String(i)),
    ]);

    for (const m of allMonsters) {
      const cr = m.cr;
      if (!validCRs.has(cr)) {
        // Allow any numeric string
        expect(parseFloat(cr)).not.toBeNaN();
      }
    }
  });
});

describe("No duplicate IDs within a ruleset", () => {
  it("2014 monsters have unique IDs", () => {
    const ids = monsters2014.map((m) => m.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("2024 monsters have unique IDs", () => {
    const ids = monsters2024.map((m) => m.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });
});
