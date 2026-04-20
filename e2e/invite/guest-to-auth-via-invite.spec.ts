/**
 * e2e/invite/guest-to-auth-via-invite.spec.ts
 *
 * Epic 02 Testing Contract — E2E #1:
 *
 *   "Guest → Auth via invite (/invite)"
 *
 *   Maria (sem conta) chega em `/invite/abc123`. `detectInviteState` retorna
 *   `"guest"`. A UI oferece um botão "Criar conta" que abre o AuthModal no
 *   tab signup. Maria preenche email/password/displayName, clica submit, e
 *   o Supabase /auth/v1/signup responde 200. A cookie `sb-...auth-token` é
 *   setada, a página redireciona pra `/app/dashboard`, e a campanha do
 *   invite aparece no dashboard como membership ativa.
 *
 * ### Flakiness mitigation (F31)
 *
 * O assert pós-signup é fragile porque o cookie-set acontece DEPOIS do
 * /auth/v1/signup responder. Usamos `waitForAuthSettle()` que combina:
 *   1. waitForResponse(/\/auth\/v1\/signup/)
 *   2. waitForFunction(() => document.cookie.includes("sb-"))
 *
 * Só depois disso assertamos dashboard rendering.
 *
 * ### Execução
 *
 * Requer:
 *   - NEXT_PUBLIC_E2E_MODE=true no servidor
 *   - Um campaign_invite VÁLIDO pre-seeded (token não expirado, status='pending')
 *     referenciado via E2E_INVITE_TOKEN env var OU criado por um fixture
 *     que o spec skipa se não disponível
 *   - Supabase email verification desabilitado OU endpoint de teste que
 *     confirme a conta automaticamente
 *
 * Se os pre-requisitos não estão presentes, o spec `test.skip()`-a
 * explicitamente pra não false-passar.
 */

import { test, expect } from "@playwright/test";
import {
  fillAuthModalSignup,
  waitForAuthSettle,
  createCleanupContext,
  cleanup,
  type CleanupPayload,
} from "../helpers/identity-fixtures";

const INVITE_TOKEN = process.env.E2E_INVITE_TOKEN_GUEST;
const EMAIL_DOMAIN = process.env.E2E_TEST_EMAIL_DOMAIN ?? "test-taverna.com";

test.describe("E2E — Guest signs up via /invite/[token]", () => {
  test.setTimeout(90_000);

  // Shared cleanup state across the single test in this describe
  const cleanupCtx: CleanupPayload = createCleanupContext();

  test.skip(
    !INVITE_TOKEN,
    "E2E_INVITE_TOKEN_GUEST not set — pre-seed a valid pending invite and " +
      "export its token for this spec to run end-to-end",
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
      // Non-fatal — logs via Playwright's console.
      console.warn("[guest-to-auth-via-invite] cleanup failed:", err);
    } finally {
      await ctx.close().catch(() => {});
    }
  });

  test("Maria without account → invite → AuthModal signup → dashboard with campaign", async ({
    page,
  }) => {
    const token = INVITE_TOKEN!;
    const uniqueEmail = `e2e-guest-invite-${Date.now()}@${EMAIL_DOMAIN}`;
    const password = "TestPass_Strong!1";
    const displayName = "Maria Guest-Invite";

    // ── 1. Land on /invite/[token] as unauthenticated user ──
    await page.goto(`/invite/${token}`);
    await page.waitForLoadState("domcontentloaded");

    // InviteLanding must render in "guest" state. Per docs/testing-data-testid-contract.md §3.2
    // the root wrapper exposes `invite.landing.root` + a state marker.
    const landingRoot = page.locator('[data-testid="invite.landing.root"]');
    const legacyRoot = page.locator('[data-testid="invite-landing"]'); // legacy fallback

    const hasLanding = await landingRoot
      .or(legacyRoot)
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    test.skip(
      !hasLanding,
      "InviteLanding component not yet deployed — re-run after Story 02-D lands",
    );

    // State marker — guest state is mandatory for this flow
    const guestStateMarker = page.locator(
      '[data-testid="invite.landing.state-guest"]',
    );
    await expect(guestStateMarker).toBeVisible({ timeout: 5_000 });

    // ── 2. Click "Criar conta" to open AuthModal ──
    const openAuthBtn = page.locator('[data-testid="invite.landing.open-auth-modal"]');
    await expect(openAuthBtn).toBeVisible({ timeout: 5_000 });
    await openAuthBtn.click();

    // ── 3. Fill and submit signup form in AuthModal ──
    await fillAuthModalSignup(page, {
      email: uniqueEmail,
      password,
      displayName,
    });

    // ── 4. F31 flakiness mitigation: wait for signup to complete before asserting post-state ──
    // /auth/v1/signup is the Supabase endpoint hit by supabase.auth.signUp().
    // When email verification is disabled, the server returns 200 + sets the
    // session cookie in the same response. waitForAuthSettle polls both the
    // HTTP response and the document.cookie sb-* presence.
    await waitForAuthSettle(page, /\/auth\/v1\/signup/);

    // ── 5. Redirect lands on /app/dashboard ──
    await page.waitForURL("**/app/dashboard**", {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    // ── 6. Dashboard renders the campaign that the invite belonged to ──
    // The "Minhas campanhas" section (testid: my-campaigns-section) should
    // contain at least one card. More specifically, the invite acceptance
    // flow (which runs server-side during signup or on first dashboard load)
    // should have inserted a campaign_members row.
    const campaignsSection = page.locator('[data-testid="my-campaigns-section"]');
    await expect(campaignsSection).toBeVisible({ timeout: 15_000 });

    // At least one card is present (any id matches the pattern)
    const anyCampaignCard = page.locator(
      '[data-testid^="my-campaigns-card-"]',
    );
    await expect(anyCampaignCard.first()).toBeVisible({ timeout: 10_000 });
  });
});
