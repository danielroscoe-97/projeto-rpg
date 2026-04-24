/**
 * Unit coverage for `resolvePostCombatRedirect` — Sprint 2 A6 (decision #43).
 *
 * The hook + PostCombatBanner + RecapCtaCard + GuestRecapFlow +
 * GuestUpsellModal all delegate to this resolver so the lock-in stays
 * asserted in a single place.
 */

import {
  DEFAULT_POST_COMBAT_WINDOW_MS,
  POST_COMBAT_DASHBOARD_PATH,
  buildHeroiSheetPath,
  postCombatWindowMs,
  resolvePostCombatRedirect,
} from "@/lib/player-hq/post-combat-redirect";

describe("resolvePostCombatRedirect", () => {
  it("always returns /app/dashboard for Guest, regardless of flag + campaignId", () => {
    expect(
      resolvePostCombatRedirect({ mode: "guest", flagEnabled: false }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
    expect(
      resolvePostCombatRedirect({ mode: "guest", flagEnabled: true }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
    expect(
      resolvePostCombatRedirect({
        mode: "guest",
        flagEnabled: true,
        campaignId: "abc-123",
      }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
  });

  it("returns /app/dashboard for Anon + Auth when flag is OFF", () => {
    expect(
      resolvePostCombatRedirect({
        mode: "anon",
        flagEnabled: false,
        campaignId: "c1",
      }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
    expect(
      resolvePostCombatRedirect({
        mode: "auth",
        flagEnabled: false,
        campaignId: "c1",
      }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
  });

  it("returns /sheet?tab=heroi for Anon + Auth when flag is ON and campaignId is present", () => {
    expect(
      resolvePostCombatRedirect({
        mode: "anon",
        flagEnabled: true,
        campaignId: "c1",
      }),
    ).toBe("/app/campaigns/c1/sheet?tab=heroi");
    expect(
      resolvePostCombatRedirect({
        mode: "auth",
        flagEnabled: true,
        campaignId: "c1",
      }),
    ).toBe("/app/campaigns/c1/sheet?tab=heroi");
  });

  it("falls back to /app/dashboard when flag is ON but campaignId is missing", () => {
    expect(
      resolvePostCombatRedirect({ mode: "anon", flagEnabled: true }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
    expect(
      resolvePostCombatRedirect({
        mode: "auth",
        flagEnabled: true,
        campaignId: null,
      }),
    ).toBe(POST_COMBAT_DASHBOARD_PATH);
  });

  it("honors override regardless of flag or mode", () => {
    expect(
      resolvePostCombatRedirect({
        mode: "guest",
        flagEnabled: true,
        override: "/override-target",
      }),
    ).toBe("/override-target");
    expect(
      resolvePostCombatRedirect({
        mode: "auth",
        flagEnabled: false,
        override: "/preview-branch",
      }),
    ).toBe("/preview-branch");
  });
});

describe("buildHeroiSheetPath", () => {
  it("composes the canonical Hero tab path", () => {
    expect(buildHeroiSheetPath("abc-123")).toBe(
      "/app/campaigns/abc-123/sheet?tab=heroi",
    );
  });
});

describe("postCombatWindowMs", () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS;
    } else {
      process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS = originalEnv;
    }
  });

  it("returns the production default when env var is unset", () => {
    delete process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS;
    expect(postCombatWindowMs()).toBe(DEFAULT_POST_COMBAT_WINDOW_MS);
  });

  it("honors NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS when set to a positive integer", () => {
    process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS = "500";
    expect(postCombatWindowMs()).toBe(500);
  });

  it("falls back to default when env var is not a positive integer", () => {
    process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS = "not-a-number";
    expect(postCombatWindowMs()).toBe(DEFAULT_POST_COMBAT_WINDOW_MS);
    process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS = "-42";
    expect(postCombatWindowMs()).toBe(DEFAULT_POST_COMBAT_WINDOW_MS);
  });
});
