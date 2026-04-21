/**
 * e2e/conversion/turn-safety.spec.ts
 *
 * Epic 03 "Conversion Moments" — Story 03-H, Area 4 (turn safety).
 *
 * Scenario (from spec line 897):
 *   "2 browsers; DM inicia sessão; player anon abre AuthModal no waiting
 *    room; DM inicia combate (toast `combat_started` visível no player);
 *    DM avança turno para o player (toast `your_turn` visível); validar
 *    badge 'cadastrando' no DM view; player completa signup; player vê
 *    turno atual; sem 'lost turn' banner"
 *
 * ### Dependency on Story 03-F
 *
 * This spec depends on Story 03-F artefacts that are NOT merged yet
 * (commit a46fc074 master tip at dispatch time):
 *   - `player:idle` broadcast with `payload.reason === "signing_up"`
 *     emitted from PlayerJoinClient when AuthModal opens.
 *   - `player:active` broadcast when AuthModal closes.
 *   - `PlayersOnlinePanel` renders a "cadastrando" badge when the
 *     player's status is `"authenticating"`.
 *   - Toast copy keys `conversion.turn_safety_toast.combat_started` and
 *     `.your_turn` wired into the player's broadcast listeners.
 *
 * When 03-F merges, REMOVE the `test.fixme` + the `describe.fixme` wrap
 * below and run the full body.
 *
 * ### What this spec will prove (once 03-F lands)
 *
 * 1. Opening AuthModal while in the waiting room emits a `player:idle`
 *    broadcast carrying `reason: "signing_up"`.
 * 2. The DM's `PlayersOnlinePanel` shows the "cadastrando" badge for
 *    that player.
 * 3. DM starts combat → player's AuthModal stays open, but a
 *    `combat_started` toast appears (non-blocking).
 * 4. DM advances turns until it reaches the signing-up player → a
 *    `your_turn` toast appears on the player side.
 * 5. Completing signup → AuthModal closes → `player:active` broadcast
 *    fires → DM badge removes → player's view shows the current turn
 *    marker with NO "lost turn" banner.
 * 6. The player's session_token_id never changed.
 *
 * @tags @conversion @turn-safety @story-03H @blocked-03F
 */

import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  anonJoinCombat,
  readSessionTokenId,
  uniqueUpgradeEmail,
} from "../fixtures/identity-upgrade-helpers";

// NOTE: Wrapping the entire describe in `.fixme` makes the whole block
// report as expected-failure without running. Another agent/session will
// remove `.fixme` once Story 03-F lands in master and the broadcast +
// badge contracts are stable.
test.describe.fixme(
  "E2E — turn safety while anon signs up (BLOCKED: needs Story 03-F)",
  () => {
    test.setTimeout(240_000);

    test("DM sees badge + player sees toasts; no lost turn after signup", async ({
      browser,
    }) => {
      // TODO(03-F): enable when Story 03-F merges. Once 03-F lands, the
      // broadcasts player:idle / player:active with reason:"signing_up"
      // will flow and the PlayersOnlinePanel will render the
      // "cadastrando" badge — at that point the assertions below are
      // meaningful.
      //
      // Until then this spec is marked `.fixme` and is not executed.

      const dmContext = await browser.newContext();
      const dmPage = await dmContext.newPage();
      const playerContext = await browser.newContext();
      const playerPage = await playerContext.newPage();

      try {
        const shareToken = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
          { name: "Training Dummy", hp: "10", ac: "10", init: "5" },
        ]);
        expect(shareToken).toBeTruthy();

        const playerName = "TurnSafetyPlayer";
        await anonJoinCombat(playerPage, shareToken!, playerName, {
          initiative: "20",
          hp: "30",
          ac: "16",
        });

        const preTokenId = await readSessionTokenId(playerPage);
        expect(preTokenId).toBeTruthy();

        // ── Open AuthModal from the waiting room (auth-cta button) ──
        await playerPage
          .locator('[data-testid="join.waiting-room.auth-cta"]')
          .click();
        await expect(
          playerPage.locator('[data-testid="auth.modal.root"]'),
        ).toBeVisible({ timeout: 10_000 });

        // ── DM sees "cadastrando" badge (Story 03-F artefact) ──
        // Expected testid TBD by Story 03-F; using a likely shape.
        await expect(
          dmPage.locator(
            `[data-testid="players-online-panel"] :text("${playerName}")`,
          ),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
          dmPage.locator('[data-testid="player-badge-authenticating"]').first(),
        ).toBeVisible({ timeout: 10_000 });

        // ── DM starts combat ──
        // dmSetupCombatSession already started it for us, so this is a
        // no-op in the current helper. Story 03-F may change the setup
        // flow to leave combat pending — adjust at that point.

        // Player toast 1 — combat_started (PT-BR default).
        await expect(
          playerPage
            .locator("[data-sonner-toaster]")
            .filter({ hasText: /Combate começou|Combat started/i }),
        ).toBeVisible({ timeout: 10_000 });

        // DM advances turn until it's the player's turn. We loop up to
        // 10 times — long enough for any realistic initiative order.
        for (let i = 0; i < 10; i++) {
          const nextBtn = dmPage.locator('[data-testid="next-turn-btn"]');
          if (await nextBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
            await nextBtn.click({ force: true });
          }
          const yourTurnToast = playerPage
            .locator("[data-sonner-toaster]")
            .filter({ hasText: /É seu turno|your turn/i });
          if (
            await yourTurnToast.isVisible({ timeout: 2_000 }).catch(() => false)
          ) {
            break;
          }
        }

        await expect(
          playerPage
            .locator("[data-sonner-toaster]")
            .filter({ hasText: /É seu turno|your turn/i }),
        ).toBeVisible({ timeout: 15_000 });

        // ── Complete signup ──
        const email = uniqueUpgradeEmail("turn-safety");
        const password = "TurnSafety!1";
        await playerPage
          .locator('[data-testid="auth.modal.tab-signup"]')
          .click();
        await playerPage
          .locator('[data-testid="auth.modal.email-input"]')
          .fill(email);
        const displayName = playerPage.locator(
          '[data-testid="auth.modal.display-name-input"]',
        );
        if (
          await displayName.isVisible({ timeout: 1_000 }).catch(() => false)
        ) {
          await displayName.fill(playerName);
        }
        await playerPage
          .locator('[data-testid="auth.modal.password-input"]')
          .fill(password);

        const upgradeResponsePromise = playerPage.waitForResponse(
          (resp) =>
            resp.url().includes("/api/player-identity/upgrade") &&
            resp.request().method() === "POST",
          { timeout: 45_000 },
        );
        await playerPage
          .locator('[data-testid="auth.modal.submit-button"]')
          .click();
        await upgradeResponsePromise;

        // ── Modal closes → DM badge goes away ──
        await expect(
          playerPage.locator('[data-testid="auth.modal.root"]'),
        ).toBeHidden({ timeout: 10_000 });
        await expect(
          dmPage.locator('[data-testid="player-badge-authenticating"]'),
        ).toBeHidden({ timeout: 10_000 });

        // ── Player sees current turn, no "lost turn" banner ──
        await expect(
          playerPage.locator('[data-testid="player-view"]'),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
          playerPage.locator('[data-testid="lost-turn-banner"]'),
        ).toHaveCount(0);

        // session_token_id preserved.
        const postTokenId = await readSessionTokenId(playerPage);
        expect(postTokenId).toBe(preTokenId);
      } finally {
        await playerContext.close().catch(() => {});
        await dmContext.close().catch(() => {});
      }
    });
  },
);
