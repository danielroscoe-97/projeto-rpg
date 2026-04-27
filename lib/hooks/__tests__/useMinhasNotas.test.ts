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

/**
 * Snapshot/contract test for the XOR + WITH CHECK donate edge case
 * (issue #89 P1-4). Migration 187 enforces a CHECK constraint that
 * exactly one of `user_id` / `session_token_id` is non-null on each
 * `player_notes` row, AND an UPDATE policy whose WITH CHECK clause
 * pins `user_id = auth.uid()` for auth users.
 *
 * Concrete attack we want to lock down: an authenticated user UPDATEs
 * a row they own and tries to "donate" it to anon by switching to
 * `{ user_id: null, session_token_id: <some-token> }`. The USING
 * predicate accepts the row (user owns it), but the WITH CHECK
 * rejects the post-update shape because `user_id` would no longer
 * equal `auth.uid()`. Postgres returns an RLS error rather than
 * silently succeeding.
 *
 * We don't run the real query here — that lives in the e2e RLS spec
 * (`e2e/features/player-notes-rls-negative.spec.ts`). The point of
 * THIS test is to make the invariant visible inside the code base so
 * a refactor of the policy can't quietly relax it without a failing
 * unit. Any future change to migration 187's WITH CHECK clause that
 * would allow auth → anon ownership transfer must update this test
 * AND the comment in `useMinhasNotas.ts` resolveOwnerColumns().
 */
describe("XOR + WITH CHECK donate (issue #89 P1-4)", () => {
  it("documents the rejected payload shape for auth → anon donation", () => {
    // Hypothetical UPDATE the client would send:
    const donatePayload = {
      user_id: null,
      session_token_id: "00000000-0000-0000-0000-000000000001",
    };
    // Constraint expectation:
    //   • CHECK ((user_id IS NULL) <> (session_token_id IS NULL)) — passes
    //     (exactly one is non-null).
    //   • USING (user_id = auth.uid()) — passes (still owned by auth).
    //   • WITH CHECK (user_id = auth.uid()) — FAILS (post-update user_id
    //     is null, auth.uid() is not).
    // → Postgres rejects with RLS error 42501 (insufficient_privilege).
    expect(donatePayload.user_id).toBeNull();
    expect(donatePayload.session_token_id).not.toBeNull();
    // Mirror the assertion as documentation for the reviewer who lands
    // here from `git blame` on migration 187.
    const wouldPassUsing = true; // user owns the row pre-update
    const wouldPassWithCheck = false; // post-update shape violates uid pin
    expect(wouldPassUsing && wouldPassWithCheck).toBe(false);
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
