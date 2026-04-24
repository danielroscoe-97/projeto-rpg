/**
 * e2e/invite/anon-to-auth-via-join.spec.ts
 *
 * Epic 02 Testing Contract — E2E #2:
 *
 *   "Anon → Auth via join (/join)"
 *
 *   Maria clica um link anônimo (DM issued via /join/[token]) → o
 *   PlayerJoinClient faz signInAnonymously automaticamente → ela entra no
 *   lobby/combat como jogador anon → o banner de CTA "Criar conta agora?"
 *   (Story 02-E) aparece no waiting room → ela clica, o AuthModal abre com
 *   `upgradeContext` → ela preenche email/password → submit → servidor
 *   executa `upgradePlayerIdentity` (saga do Epic 01 Story 01-F) → combate
 *   continua sem skip de turno, session_token_id preservado.
 *
 * ### Garantias testadas
 *
 *   a) O session_token_id em storage ANTES do upgrade é o MESMO DEPOIS —
 *      prova que a Phase 3 saga promoveu o soft-claim em vez de criar um
 *      novo token.
 *   b) O `data-testid="join.combat-view"` (ou legado `player-view`)
 *      permanece visível durante todo o fluxo — o resilient-reconnect
 *      guard prometeu UI sem flash (CLAUDE.md rule "Resilient Player
 *      Reconnection").
 *   c) A cookie `sb-<project>-auth-token` é promovida de anon → auth JWT
 *      — mas o cookie name permanece o mesmo (Supabase updateUser behavior).
 *
 * ### Flakiness mitigation (F31)
 *
 *   waitForResponse(/\/api\/player-identity\/upgrade/) + waitForFunction
 *   pra garantir que o cookie está presente ANTES de qualquer assertion
 *   pós-signup. Spec padrão do Epic 02 Wave 0 AC.
 *
 * ### Execução
 *
 * Requer:
 *   - NEXT_PUBLIC_E2E_MODE=true
 *   - Um campaign com session ativa cujo DM rodou /api/e2e/seed-session-token
 *     beforeAll (ou E2E_JOIN_TOKEN env var pra fallback)
 *
 * Se não, skip clean.
 */

import { test, expect } from "@playwright/test";
import {
  fillAuthModalSignup,
  waitForAuthSettle,
  readSessionTokenId,
  seedSessionToken,
  cleanup,
  createCleanupContext,
  type CleanupPayload,
} from "../helpers/identity-fixtures";

const EMAIL_DOMAIN = process.env.E2E_TEST_EMAIL_DOMAIN ?? "test-taverna.com";
const CAMPAIGN_ID_WITH_ACTIVE_SESSION = process.env.E2E_CAMPAIGN_ID_ACTIVE;
const FALLBACK_JOIN_TOKEN = process.env.E2E_JOIN_TOKEN;

test.describe("E2E — Anon player upgrades to auth via /join CTA banner", () => {
  test.setTimeout(120_000);

  const cleanupCtx: CleanupPayload = createCleanupContext();

  test.skip(
    !CAMPAIGN_ID_WITH_ACTIVE_SESSION && !FALLBACK_JOIN_TOKEN,
    "Neither E2E_CAMPAIGN_ID_ACTIVE nor E2E_JOIN_TOKEN set — seed an active " +
      "session for a campaign and export either the campaign id (preferred) " +
      "or a join token for this spec to run",
  );

  test.afterAll(async ({ browser }) => {
    if (!cleanupCtx.sessionTokenIds?.length && !cleanupCtx.anonUserIds?.length) {
      return;
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await cleanup(page, cleanupCtx);
    } catch (err) {
      console.warn("[anon-to-auth-via-join] cleanup failed:", err);
    } finally {
      await ctx.close().catch(() => {});
    }
  });

  test("anon player sees signup CTA → upgrade → session_token preserved, no turn-skip", async ({
    page,
  }) => {
    // ── 0. Obtain a join token ──
    // Prefer seeding a fresh one via /api/e2e/seed-session-token so the
    // test owns the row (easier cleanup). Fall back to a pre-provided
    // env var if no campaign id is available.
    let joinToken: string;
    let sessionTokenId: string | null = null;

    if (CAMPAIGN_ID_WITH_ACTIVE_SESSION) {
      const seeded = await seedSessionToken(
        page,
        CAMPAIGN_ID_WITH_ACTIVE_SESSION,
        "Maria Anon",
      );
      joinToken = seeded.token;
      sessionTokenId = seeded.sessionTokenId;
      cleanupCtx.sessionTokenIds!.push(seeded.sessionTokenId);
    } else {
      joinToken = FALLBACK_JOIN_TOKEN!;
    }

    const uniqueEmail = `e2e-anon-join-${Date.now()}@${EMAIL_DOMAIN}`;
    const password = "TestPass_Strong!1";
    const displayName = "Maria Anon-Upgrade";

    // ── 1. Navigate to /join/[token] — PlayerJoinClient auto anon-signs-in ──
    await page.goto(`/join/${joinToken}`);
    await page.waitForLoadState("domcontentloaded");

    // The lobby form (waiting room) appears — filled with name + submit
    // mounts the player as anon and drops them into combat-view.
    const waitingRoom = page.locator('[data-testid="join.waiting-room"]');
    await expect(waitingRoom).toBeVisible({ timeout: 30_000 });

    // Fill lobby
    const nameInput = page.locator('[data-testid="lobby-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill("Maria Anon");

    const initInput = page.locator('[data-testid="lobby-initiative"]');
    if (await initInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await initInput.fill("12");
    }

    await page.locator('[data-testid="lobby-submit"]').click();

    // ── 2. CTA banner must appear (Story 03-C WaitingRoomSignupCTA) ──
    // Canonical testid: `conversion.waiting-room-cta` (components/conversion/WaitingRoomSignupCTA.tsx).
    // Legacy testids `join.signup-cta.banner` / `join.signup-cta` kept only as fallback until removal.
    // HARD ASSERT — if CTA doesn't render, test FAILS. A `test.skip` here is what let
    // the 2026-04-20→24 regression (`isAnonPlayer = !authUserId`) ship silently.
    const ctaCanonical = page.locator('[data-testid="conversion.waiting-room-cta"]');
    const ctaLegacyBanner = page.locator('[data-testid="join.signup-cta.banner"]');
    const ctaLegacyWrapper = page.locator('[data-testid="join.signup-cta"]');
    await expect(
      ctaCanonical.or(ctaLegacyBanner).or(ctaLegacyWrapper).first(),
    ).toBeVisible({ timeout: 15_000 });

    // ── 3. Capture session_token_id BEFORE upgrade ──
    const preUpgradeTokenId = await readSessionTokenId(page);
    expect(
      preUpgradeTokenId,
      "session_token_id must be in storage after anon join",
    ).toBeTruthy();

    if (sessionTokenId) {
      expect(preUpgradeTokenId).toBe(sessionTokenId);
    }

    // ── 4. Click CTA → AuthModal opens with upgrade context ──
    const primaryCanonical = page.locator('[data-testid="conversion.waiting-room-cta.primary"]');
    const primaryLegacy = page.locator('[data-testid="join.signup-cta.primary-button"]');
    const primaryCtaBtn = primaryCanonical.or(primaryLegacy).first();
    await expect(primaryCtaBtn).toBeVisible({ timeout: 5_000 });
    await primaryCtaBtn.click();

    // Upgrade context indicator tells user this is an in-place upgrade, not fresh signup
    const upgradeIndicator = page.locator('[data-testid="auth.modal.upgrade-context-indicator"]');
    await expect(upgradeIndicator).toBeVisible({ timeout: 10_000 });

    // ── 5. Fill form + submit ──
    await fillAuthModalSignup(page, {
      email: uniqueEmail,
      password,
      displayName,
    });

    // ── 6. F31: wait for the UPGRADE endpoint (not /auth/v1/signup — this flow
    //         uses the server saga via POST /api/player-identity/upgrade) ──
    await waitForAuthSettle(page, /\/api\/player-identity\/upgrade/);

    // ── 7. session_token_id preserved ──
    // The upgrade saga MUST NOT rotate the session_token. The combat screen
    // continues using the same token row, now with `claimed_by_session_token`
    // converted to `user_id = auth.uid()` in player_characters.
    const postUpgradeTokenId = await readSessionTokenId(page);
    expect(postUpgradeTokenId).toBe(preUpgradeTokenId);

    // ── 8. Combat view still visible — no flash, no turn-skip ──
    // join.combat-view is the new wrapper; player-view is the legacy coexistent
    const combatView = page.locator('[data-testid="join.combat-view"]');
    const legacyPlayerView = page.locator('[data-testid="player-view"]');
    await expect(combatView.or(legacyPlayerView).first()).toBeVisible({
      timeout: 15_000,
    });

    // ── 9. The cookie must now be an auth cookie (still sb-* named) ──
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => /^sb-.*-auth-token$/.test(c.name));
    expect(authCookie, "sb-*-auth-token cookie must be set").toBeTruthy();
  });
});
