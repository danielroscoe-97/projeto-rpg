/**
 * Unit tests for `lib/flags/player-hq-v2.ts` — Sprint 1 Track B (EP-INFRA.2).
 *
 * Verifies strict-compare semantics: only the exact string `"true"` flips
 * the flag. Any other value (including truthy-ish strings like "1" or "yes",
 * empty string, undefined, or a typo) MUST resolve to `false`. Strict compare
 * protects prod — a typo like `NEXT_PUBLIC_PLAYER_HQ_V2=tru` can never flip
 * the V2 surface on accidentally.
 */

import { PLAYER_HQ_V2_FLAG, isPlayerHqV2Enabled } from "./player-hq-v2";

describe("lib/flags/player-hq-v2 — PLAYER_HQ_V2_FLAG", () => {
  test("exports the canonical env var name", () => {
    expect(PLAYER_HQ_V2_FLAG).toBe("NEXT_PUBLIC_PLAYER_HQ_V2");
  });
});

describe("lib/flags/player-hq-v2 — isPlayerHqV2Enabled", () => {
  const ENV_KEY = "NEXT_PUBLIC_PLAYER_HQ_V2";
  const envRef = process.env as Record<string, string | undefined>;
  const originalValue = envRef[ENV_KEY];

  afterEach(() => {
    if (originalValue === undefined) {
      delete envRef[ENV_KEY];
    } else {
      envRef[ENV_KEY] = originalValue;
    }
  });

  test("returns false when env var is undefined", () => {
    delete envRef[ENV_KEY];
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false when env var is empty string", () => {
    envRef[ENV_KEY] = "";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns true ONLY for exact string 'true'", () => {
    envRef[ENV_KEY] = "true";
    expect(isPlayerHqV2Enabled()).toBe(true);
  });

  test("returns false for 'True' (case-sensitive strict compare)", () => {
    envRef[ENV_KEY] = "True";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false for 'TRUE' (case-sensitive strict compare)", () => {
    envRef[ENV_KEY] = "TRUE";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false for '1' (strict compare — not truthy-ish)", () => {
    envRef[ENV_KEY] = "1";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false for 'yes' (strict compare — not truthy-ish)", () => {
    envRef[ENV_KEY] = "yes";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false for 'false'", () => {
    envRef[ENV_KEY] = "false";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false for arbitrary typo 'tru'", () => {
    envRef[ENV_KEY] = "tru";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });

  test("returns false for trailing-whitespace variant ' true '", () => {
    envRef[ENV_KEY] = " true ";
    expect(isPlayerHqV2Enabled()).toBe(false);
  });
});
