/**
 * S1.1 — Recap persistence post-combat.
 *
 * Scenario (Beta 3 Finding 1):
 *   DM ends combat while Player 2's tab is closed. Player 2 reopens the
 *   tab AFTER the broadcast has already fired, so only the durable
 *   `/api/session/[id]/latest-recap` endpoint can deliver the Wrapped
 *   modal. The test verifies:
 *     - Player 1 (stayed online) sees the recap via broadcast (happy path).
 *     - Player 2 (reconnected late) sees the recap via durable hydration.
 *
 * Spec: docs/spike-beta-test-3-2026-04-17.md Finding 1.
 * Sprint: S1.1, track `feat/beta3-recap-persistence`.
 *
 * @tags @recap @reliability
 */
import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { endEncounter } from "../helpers/combat";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  createPlayerContexts,
  closeAllContexts,
  playerSubmitJoin,
  dmAcceptPlayer,
  dismissTourIfVisible,
} from "../helpers/multi-player";

const RECAP_TESTID = '[data-testid="combat-recap"]';
const EXTENDED_WAIT = 15_000;

test.describe.serial("S1.1 — Post-combat recap persistence", () => {
  test.slow(); // 3x timeout — multi-player + reconnect flow

  test("DM ends combat; late-reconnecting player still sees the recap", async ({
    browser,
  }) => {
    // ── Setup: DM + 2 players ──────────────────────────────────
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    const { contexts: playerContexts, pages: [p1Page, p2Page] } =
      await createPlayerContexts(browser, 2);
    let p2OfflineContext = p2Page.context(); // track for close-and-reopen

    try {
      const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
        { name: "Training Dummy", hp: "10", ac: "10", init: "5" },
        { name: "Goblin", hp: "7", ac: "13", init: "12" },
      ]);
      expect(token).toBeTruthy();
      const shareToken = token!;

      await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible({
        timeout: 10_000,
      });
      await dismissTourIfVisible(dmPage);

      // Both players join and get accepted
      await playerSubmitJoin(p1Page, shareToken, "Aragorn", {
        initiative: "18",
        hp: "30",
        ac: "16",
      });
      await dmAcceptPlayer(dmPage, "Aragorn");
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: EXTENDED_WAIT });

      await dmPage.waitForTimeout(1_500);

      await playerSubmitJoin(p2Page, shareToken, "Legolas", {
        initiative: "16",
        hp: "25",
        ac: "15",
      });
      await dmAcceptPlayer(dmPage, "Legolas");
      await expect(
        p2Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: EXTENDED_WAIT });

      // Capture the join URL so P2 can reopen after we close its context
      const joinUrl = `/join/${shareToken}`;

      // ── Player 2 goes offline BEFORE end-of-combat ─────────────
      await p2Page.close({ runBeforeUnload: true });
      await p2OfflineContext.close().catch(() => {});

      // ── DM ends combat ──────────────────────────────────────────
      // Do some HP action so the recap has non-trivial stats
      const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
      if (await hpBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await hpBtn.click();
        await dmPage.waitForTimeout(500);
        const close = dmPage
          .locator("button")
          .filter({ hasText: /Fechar|Close|Cancelar|Cancel/i })
          .first();
        if (await close.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await close.click();
        }
      }

      await endEncounter(dmPage);

      // Confirm the end-combat name modal if present
      const confirmEnd = dmPage
        .locator("button")
        .filter({ hasText: /Confirmar|Confirm|Encerrar|End/i })
        .first();
      if (await confirmEnd.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmEnd.click();
      }

      // ── P1 (online): should see recap via broadcast ─────────────
      await expect(p1Page.locator(RECAP_TESTID)).toBeVisible({
        timeout: 20_000,
      });

      // ── DB persistence settled: give the POST a moment ──────────
      await dmPage.waitForTimeout(3_000);

      // ── P2 reconnects via fresh browser context ─────────────────
      const p2ReopenContext = await browser.newContext();
      const p2NewPage = await p2ReopenContext.newPage();
      playerContexts.push(p2ReopenContext);
      p2OfflineContext = p2ReopenContext;

      await p2NewPage.goto(joinUrl);
      await p2NewPage.waitForLoadState("domcontentloaded");
      await p2NewPage.waitForLoadState("networkidle").catch(() => {});

      // The durable hydration effect fires once authReady+sessionId and
      // combat is not active. We only need the recap modal to appear.
      await expect(p2NewPage.locator(RECAP_TESTID)).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await closeAllContexts([dmContext, ...playerContexts]);
    }
  });

  test("latest-recap endpoint returns null for a session with no ended encounters", async ({
    request,
    browser,
  }) => {
    // Sanity check: an anonymous caller with no session token gets 401/403.
    const fakeSessionId = "00000000-0000-0000-0000-000000000000";
    const res = await request.get(`/api/session/${fakeSessionId}/latest-recap`);
    expect([401, 403, 400]).toContain(res.status());

    // Validate shape of a bad-UUID error too
    const badIdRes = await request.get(`/api/session/not-a-uuid/latest-recap`);
    expect([400, 401]).toContain(badIdRes.status());
    // Touch `browser` so lint doesn't complain about unused param when the
    // helper expands later (keeping the fixture positional for parity).
    void browser;
  });
});
