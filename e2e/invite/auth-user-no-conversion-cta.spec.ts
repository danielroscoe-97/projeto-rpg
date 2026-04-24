/**
 * e2e/invite/auth-user-no-conversion-cta.spec.ts
 *
 * Negative invariant for the 2026-04-24 regression:
 *   `isAnonPlayer = !authUserId` → `isRealAuthUser === false`.
 *
 * This spec is the mirror of `anon-to-auth-via-join.spec.ts`:
 *
 *   An ALREADY-AUTHENTICATED player visits /join/[token] → PlayerJoinClient
 *   reuses the existing session (no signInAnonymously) → isRealAuthUser === true
 *   → isAnonPlayer === false → NO conversion CTAs render.
 *
 * Guards against the inverse regression — CTA showing up for real auth users,
 * which would be spammy and would also indicate the gate drifted again.
 *
 * Requires the same environment as the positive spec:
 *   - NEXT_PUBLIC_E2E_MODE=true
 *   - E2E_CAMPAIGN_ID_ACTIVE or E2E_JOIN_TOKEN
 *
 * Skips cleanly if env missing.
 */

import { test, expect } from "@playwright/test";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";
import { loginAs } from "../helpers/auth";
import { seedSessionToken, cleanup, createCleanupContext, type CleanupPayload } from "../helpers/identity-fixtures";

const CAMPAIGN_ID_WITH_ACTIVE_SESSION = process.env.E2E_CAMPAIGN_ID_ACTIVE;
const FALLBACK_JOIN_TOKEN = process.env.E2E_JOIN_TOKEN;

test.describe("E2E — Authenticated player on /join does NOT see conversion CTAs", () => {
  test.setTimeout(90_000);

  const cleanupCtx: CleanupPayload = createCleanupContext();

  test.skip(
    !CAMPAIGN_ID_WITH_ACTIVE_SESSION && !FALLBACK_JOIN_TOKEN,
    "Neither E2E_CAMPAIGN_ID_ACTIVE nor E2E_JOIN_TOKEN set",
  );

  test.afterAll(async ({ browser }) => {
    if (!cleanupCtx.sessionTokenIds?.length) return;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await cleanup(page, cleanupCtx);
    } catch (err) {
      console.warn("[auth-user-no-conversion-cta] cleanup failed:", err);
    } finally {
      await ctx.close().catch(() => {});
    }
  });

  test("real auth user joins session → no waiting-room CTA, no auth-cta button, no signup-hint", async ({
    page,
  }) => {
    // ── 1. Login as a real authenticated player BEFORE visiting /join ──
    await loginAs(page, PLAYER_WARRIOR);

    // ── 2. Obtain a join token (same seeding as positive spec) ──
    let joinToken: string;
    if (CAMPAIGN_ID_WITH_ACTIVE_SESSION) {
      const seeded = await seedSessionToken(
        page,
        CAMPAIGN_ID_WITH_ACTIVE_SESSION,
        "Auth Player Warrior",
      );
      joinToken = seeded.token;
      cleanupCtx.sessionTokenIds!.push(seeded.sessionTokenId);
    } else {
      joinToken = FALLBACK_JOIN_TOKEN!;
    }

    // ── 3. Navigate to /join/[token] ──
    await page.goto(`/join/${joinToken}`);
    await page.waitForLoadState("domcontentloaded");

    const waitingRoom = page.locator('[data-testid="join.waiting-room"]');
    await expect(waitingRoom).toBeVisible({ timeout: 30_000 });

    // ── 4. Fill lobby ──
    const nameInput = page.locator('[data-testid="lobby-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill("Auth Player Warrior");

    const initInput = page.locator('[data-testid="lobby-initiative"]');
    if (await initInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await initInput.fill("14");
    }

    await page.locator('[data-testid="lobby-submit"]').click();

    // ── 5. Give the UI ~3s to render any CTA that would have appeared ──
    await page.waitForTimeout(3_000);

    // ── 6. Hard assert: NONE of the three conversion surfaces are present ──
    await expect(
      page.locator('[data-testid="conversion.waiting-room-cta"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="join.waiting-room.auth-cta"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="join.signup-hint-banner"]'),
    ).toHaveCount(0);
  });
});
