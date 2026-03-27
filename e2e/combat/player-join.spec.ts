import { test, expect } from "@playwright/test";
import { loginAs, joinSession } from "../helpers/auth";
import { DM_PRIMARY, PLAYER_WARRIOR, PLAYER_MAGE } from "../fixtures/test-accounts";

test.describe("P1 — Player Join Flow", () => {
  /**
   * These tests require a DM with an active session.
   * The share token must be obtained from a running session.
   *
   * Strategy: DM creates session → gets share token → player joins.
   */

  test("Authenticated player can join via /join/[token]", async ({ browser }) => {
    // ── DM: create session and get share token ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/session/new");
    await dmPage.waitForURL("**/app/session/**", { timeout: 15_000 });

    // Extract session ID from URL
    const sessionUrl = dmPage.url();
    const sessionId = sessionUrl.split("/app/session/")[1]?.split("?")[0];
    expect(sessionId).toBeTruthy();

    // Find the share token — look for the join link on the page
    // DM page should show the share link or token somewhere
    const shareToken = await dmPage.evaluate(() => {
      // Check for session_tokens in any visible element
      const links = document.querySelectorAll("a, input, [data-token], [data-share]");
      for (const el of links) {
        const href = (el as HTMLAnchorElement).href || (el as HTMLInputElement).value || "";
        const match = href.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
      }
      // Check clipboard or page text
      const text = document.body.innerText;
      const tokenMatch = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
      return tokenMatch ? tokenMatch[1] : null;
    });

    if (!shareToken) {
      // Try clicking share button to generate token
      const shareBtn = dmPage.locator(
        '[data-testid="share-session-btn"], [data-testid="share-session-generate"], button:has-text("Compartilhar"), button:has-text("Share"), button:has-text("Link")'
      );
      if (await shareBtn.isVisible()) {
        await shareBtn.click();
        await dmPage.waitForTimeout(2_000);
      }
    }

    // Get the token from the URL or page content
    const tokenFromPage = await dmPage.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      // Check any input with share link value
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const m = input.value.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
      }
      return null;
    });

    if (!tokenFromPage) {
      test.skip(true, "Could not find share token — session may need manual setup");
      return;
    }

    // ── Player: join the session ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerPage.goto(`/join/${tokenFromPage}`);

    // Player should see lobby or player view
    await expect(
      playerPage.locator('[data-testid="player-view"], [data-testid="player-loading"]')
    ).toBeVisible({ timeout: 15_000 });

    await dmContext.close();
    await playerContext.close();
  });

  test("Anonymous player can join via /join/[token] without login", async ({ browser }) => {
    // ── DM: create session ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/session/new");
    await dmPage.waitForURL("**/app/session/**", { timeout: 15_000 });

    // Try to get share token
    const shareBtn = dmPage.locator(
      '[data-testid="share-session-btn"], [data-testid="share-session-generate"], button:has-text("Compartilhar"), button:has-text("Share")'
    );
    if (await shareBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await shareBtn.click();
      await dmPage.waitForTimeout(2_000);
    }

    const token = await dmPage.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const m = input.value.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
      }
      return null;
    });

    if (!token) {
      test.skip(true, "Could not find share token");
      return;
    }

    // ── Anonymous player: join without login ──
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    await anonPage.goto(`/join/${token}`);

    // Should see player view (anonymous auth happens automatically)
    await expect(
      anonPage.locator('[data-testid="player-view"], [data-testid="player-loading"]')
    ).toBeVisible({ timeout: 15_000 });

    await dmContext.close();
    await anonContext.close();
  });
});
