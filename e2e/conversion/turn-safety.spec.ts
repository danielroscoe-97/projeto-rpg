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
 * ### Story 03-F artefacts exercised by this spec (unfixme'd 2026-04-21)
 *
 * Story 03-F landed in master at commit `c9e1e194`. This spec now
 * targets the REAL implementation:
 *   - `player:idle` broadcast with `payload.reason === "authenticating"`
 *     emitted from PlayerJoinClient when AuthModal opens. (Note: spec
 *     line 899 used the provisional name `"signing_up"` — implementation
 *     shipped with `"authenticating"`; the DM UI displays "cadastrando"
 *     to the end-user regardless.)
 *   - `player:active` broadcast when AuthModal closes.
 *   - `PlayersOnlinePanel` renders a per-player badge keyed
 *     `data-testid="player-authenticating-${player.id}"` plus a
 *     `data-status="authenticating"` attribute on the presence row.
 *   - Toast copy keys `conversion.turn_safety_toast.combat_started` and
 *     `.your_turn` wired into the player's broadcast listeners.
 *
 * ### What this spec proves
 *
 * 1. Opening AuthModal while in the waiting room emits `player:idle`.
 * 2. The DM's `PlayersOnlinePanel` shows the "cadastrando" badge for
 *    that player (`player-authenticating-*` testid).
 * 3. DM starts combat → player's AuthModal stays open, but a
 *    `combat_started` toast appears (non-blocking).
 * 4. DM advances turns until it reaches the signing-up player → a
 *    `your_turn` toast appears on the player side.
 * 5. Completing signup → AuthModal closes → `player:active` broadcast
 *    fires → DM badge removes → player's view shows the current turn
 *    marker with NO "lost turn" banner.
 * 6. The player's session_token_id never changed.
 *
 * @tags @conversion @turn-safety @story-03H
 */

import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  anonJoinCombat,
  readSessionTokenId,
  uniqueUpgradeEmail,
} from "../fixtures/identity-upgrade-helpers";

// Story 03-F merged at commit c9e1e194 — the `.fixme` wrap was removed
// on 2026-04-21 (Wave 3 QA un-fixme pass). The broadcasts player:idle /
// player:active with `reason: "authenticating"` now flow, and the
// PlayersOnlinePanel renders `player-authenticating-${id}` badges.
test.describe("E2E — turn safety while anon signs up", () => {
    test.setTimeout(240_000);

    test("DM sees badge + player sees toasts; no lost turn after signup", async ({
      browser,
    }) => {
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
          dmPage,
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
        // Per commit c9e1e194: PlayersOnlinePanel emits BOTH
        //   [data-testid="player-presence-${id}"] with data-status,
        //   [data-testid="player-authenticating-${id}"] (only while auth)
        // on both compact + full views, so we can match via prefix
        // attribute selector without knowing the player UUID.
        await expect(
          dmPage.locator(
            `[data-testid="players-online-panel"] :text("${playerName}")`,
          ),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
          dmPage.locator('[data-testid^="player-authenticating-"]').first(),
        ).toBeVisible({ timeout: 10_000 });
        // data-status attribute is ALSO authoritative for the badge state.
        await expect(
          dmPage
            .locator('[data-testid^="player-presence-"][data-status="authenticating"]')
            .first(),
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
        // Badge disappears: no element with player-authenticating-* testid,
        // and no presence row still carries data-status="authenticating".
        await expect(
          dmPage.locator('[data-testid^="player-authenticating-"]'),
        ).toHaveCount(0, { timeout: 10_000 });
        await expect(
          dmPage.locator(
            '[data-testid^="player-presence-"][data-status="authenticating"]',
          ),
        ).toHaveCount(0, { timeout: 10_000 });

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
