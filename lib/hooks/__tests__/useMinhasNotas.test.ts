/**
 * Unit coverage for the pure helpers exported by `useMinhasNotas`
 * (Wave 3c D2). The hook itself depends on a live Supabase client and is
 * exercised end-to-end via Playwright (see e2e/features/player-notes-*.spec.ts).
 *
 * Here we lock down:
 *  1. `searchMinhasNotas` — multi-token AND across title + tags.
 *  2. `getAutosaveDebounceMs` — env override + safe fallback.
 */

import {
  getAutosaveDebounceMs,
  searchMinhasNotas,
  type MinhaNota,
} from "@/lib/hooks/useMinhasNotas";

const mkNote = (overrides: Partial<MinhaNota>): MinhaNota => ({
  id: overrides.id ?? "n",
  campaign_id: "c1",
  user_id: "u1",
  session_token_id: null,
  title: overrides.title ?? null,
  content_md: overrides.content_md ?? "",
  tags: overrides.tags ?? [],
  created_at: "2026-04-26T00:00:00Z",
  updated_at: "2026-04-26T00:00:00Z",
  ...overrides,
});

describe("searchMinhasNotas", () => {
  const notas: MinhaNota[] = [
    mkNote({ id: "1", title: "Observações sobre Grolda", tags: ["suspeita"] }),
    mkNote({ id: "2", title: "Sessão 11 — primeira vez", tags: ["loot"] }),
    mkNote({ id: "3", title: "Combate Kobolds", tags: ["combate", "lucy"] }),
    mkNote({ id: "4", title: null, tags: ["roleplay"] }),
  ];

  it("returns the input list when the query is empty", () => {
    expect(searchMinhasNotas(notas, "").map((n) => n.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(searchMinhasNotas(notas, "   ").map((n) => n.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("matches title (case-insensitive)", () => {
    expect(searchMinhasNotas(notas, "GROLDA").map((n) => n.id)).toEqual(["1"]);
    expect(searchMinhasNotas(notas, "sessão").map((n) => n.id)).toEqual(["2"]);
  });

  it("matches a tag chip", () => {
    expect(searchMinhasNotas(notas, "loot").map((n) => n.id)).toEqual(["2"]);
    expect(searchMinhasNotas(notas, "roleplay").map((n) => n.id)).toEqual([
      "4",
    ]);
  });

  it("requires every token to match (AND semantics)", () => {
    expect(
      searchMinhasNotas(notas, "kobolds combate").map((n) => n.id),
    ).toEqual(["3"]);
    // No single note has both "grolda" and "loot" — empty result.
    expect(searchMinhasNotas(notas, "grolda loot")).toEqual([]);
  });

  it("ignores notes whose title is null when the token is title-only", () => {
    expect(
      searchMinhasNotas(notas, "primeira").map((n) => n.id),
    ).toEqual(["2"]);
  });
});

describe("getAutosaveDebounceMs", () => {
  const ORIG = process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS;

  afterEach(() => {
    if (ORIG === undefined) {
      delete process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS;
    } else {
      process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS = ORIG;
    }
  });

  it("falls back to 30 000 ms when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS;
    expect(getAutosaveDebounceMs()).toBe(30_000);
  });

  it("respects a positive integer override", () => {
    process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS = "2000";
    expect(getAutosaveDebounceMs()).toBe(2000);
  });

  it("falls back when the env var is unparseable or non-positive", () => {
    process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS = "abc";
    expect(getAutosaveDebounceMs()).toBe(30_000);
    process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS = "0";
    expect(getAutosaveDebounceMs()).toBe(30_000);
    process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS = "-5";
    expect(getAutosaveDebounceMs()).toBe(30_000);
  });
});
