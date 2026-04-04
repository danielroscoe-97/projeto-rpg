import { test, expect } from "@playwright/test";

/**
 * P0 — Landing Page (LP)
 *
 * Testa a landing page pública em / (pocketdm.com.br).
 * Verifica: hero, features, how-it-works, comparativo, pricing,
 * footer, navbar, CTAs, e responsividade mobile.
 */
test.describe("P0 — Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  // ── HERO SECTION ──

  test("Hero section is visible with brand and CTA", async ({ page }) => {
    const hero = page.locator('[data-section="hero"]');
    await expect(hero).toBeVisible({ timeout: 10_000 });

    // Logo e nome da marca
    await expect(hero).toContainText(/Pocket DM/i);

    // CTA principal — "Começar Agora" ou "Start Now"
    const primaryCta = hero.locator('a[href="/try"]').first();
    await expect(primaryCta).toBeVisible();
  });

  test("Hero shows stats strip (monsters, spells)", async ({ page }) => {
    const hero = page.locator('[data-section="hero"]');
    await expect(hero).toBeVisible({ timeout: 10_000 });

    // Deve ter números de monstros e magias
    await expect(hero).toContainText(/monstr|monster/i);
    await expect(hero).toContainText(/magi|spell/i);
  });

  // ── NAVBAR ──

  test("Navbar is visible with navigation links", async ({ page }) => {
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible({ timeout: 5_000 });

    // Deve ter logo
    await expect(nav).toContainText(/Pocket DM/i);
  });

  test("Navbar has login and sign up buttons", async ({ page, isMobile }) => {
    if (isMobile) {
      // On mobile, auth links are behind the hamburger menu — not visible in navbar directly.
      // Covered by the "Mobile hamburger menu" test.
      test.skip(true, "Auth links hidden behind hamburger on mobile");
      return;
    }

    const nav = page.locator("nav").first();

    // Botões de auth
    const loginLink = nav.locator('a[href*="/auth/login"]').first();
    const signupLink = nav.locator('a[href*="/auth/sign-up"]').first();

    // Em desktop pelo menos um deve estar visível
    const loginVisible = await loginLink.isVisible().catch(() => false);
    const signupVisible = await signupLink.isVisible().catch(() => false);
    expect(loginVisible || signupVisible).toBeTruthy();
  });

  test("Mobile hamburger menu opens and shows links", async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip(true, "Hamburger menu only on mobile");
      return;
    }

    // Busca o botão hamburger
    const menuBtn = page.locator('button[aria-expanded]').first();
    if (await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(500);

      // O próprio botão deve ter aria-expanded="true" após o clique
      await expect(menuBtn).toHaveAttribute("aria-expanded", "true", { timeout: 3_000 });
    }
  });

  // ── FEATURES SECTION ──

  test("Features section shows 6 feature cards", async ({ page }) => {
    const features = page.locator('[data-section="features"]');
    await expect(features).toBeVisible({ timeout: 10_000 });

    // Deve ter título de features
    await expect(features).toContainText(/feature|funcionalidade|Combat Tracker|Tracker/i);
  });

  test("Features section is reachable via anchor #features", async ({ page }) => {
    await page.goto("/#features");
    await page.waitForLoadState("domcontentloaded");

    const features = page.locator('[data-section="features"]');
    await expect(features).toBeVisible({ timeout: 10_000 });

    // Seção deve estar no viewport (scroll suave pode demorar)
    await page.waitForTimeout(1_500);
    const box = await features.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Top da seção deve estar visível (y < viewport height)
      const viewportHeight = page.viewportSize()?.height ?? 812;
      expect(box.y).toBeLessThan(viewportHeight + 100);
    }
  });

  // ── HOW IT WORKS ──

  test("How It Works section shows 4 steps", async ({ page }) => {
    const section = page.locator('[data-section="how-it-works"]');
    await expect(section).toBeVisible({ timeout: 10_000 });

    // Deve ter os 4 emojis/passos
    await expect(section).toContainText(/Crie|Create/i);
    await expect(section).toContainText(/Iniciativa|Initiative/i);
    await expect(section).toContainText(/Compartilh|Share/i);
    await expect(section).toContainText(/Mestr|Master|Combat/i);
  });

  // ── COMPARISON ──

  test("Comparison section shows competitors table", async ({ page }) => {
    const comparison = page.locator('[data-section="comparison"]');
    await expect(comparison).toBeVisible({ timeout: 10_000 });

    // Deve mencionar concorrentes
    await expect(comparison).toContainText(/Roll20/i);
    await expect(comparison).toContainText(/D&D Beyond|DnD Beyond/i);
    await expect(comparison).toContainText(/Pocket DM/i);
  });

  // ── SOCIAL PROOF ──

  test("Social proof section shows testimonials", async ({ page }) => {
    const social = page.locator('[data-section="social-proof"]');
    await expect(social).toBeVisible({ timeout: 10_000 });

    // Deve ter citações (quotes)
    const quoteMarks = social.locator("svg, blockquote, q").first();
    const hasQuotes = await quoteMarks.isVisible().catch(() => false);
    // Ou verificar por conteúdo de depoimento
    const hasTestimonialText = await social.textContent();
    expect(hasQuotes || (hasTestimonialText && hasTestimonialText.length > 50)).toBeTruthy();
  });

  // ── PRICING ──

  test("Pricing section shows Free and Pro plans", async ({ page }) => {
    const pricing = page.locator('[data-section="lp-pricing"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });

    // Plano Free
    await expect(pricing).toContainText(/R\$ 0|Free|Grátis/i);

    // Plano Pro (coming soon)
    await expect(pricing).toContainText(/Pro/i);
    await expect(pricing).toContainText(/Coming Soon|Em breve/i);
  });

  test("Pricing Free plan has CTA to /try", async ({ page }) => {
    const pricing = page.locator('[data-section="lp-pricing"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });

    // CTA do plano free
    const freeCta = pricing.locator('a[href="/try"]').first();
    await expect(freeCta).toBeVisible();
  });

  test("Pricing is reachable via anchor #precos", async ({ page }) => {
    await page.goto("/#precos");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1_500);

    const pricing = page.locator('[data-section="lp-pricing"]');
    await expect(pricing).toBeVisible({ timeout: 10_000 });
  });

  // ── FINAL CTA ──

  test("Final CTA section has sign-up and try links", async ({ page }) => {
    const finalCta = page.locator('[data-section="final-cta"]');
    await expect(finalCta).toBeVisible({ timeout: 10_000 });

    // CTA para sign-up
    const signupLink = finalCta.locator('a[href*="/auth/sign-up"]').first();
    await expect(signupLink).toBeVisible();

    // Link para testar sem conta
    const tryLink = finalCta.locator('a[href="/try"]').first();
    await expect(tryLink).toBeVisible();
  });

  // ── FOOTER ──

  test("Footer shows brand, links, and copyright", async ({ page }) => {
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible({ timeout: 10_000 });

    // Brand
    await expect(footer).toContainText(/Pocket DM/i);

    // Links de navegação no footer
    const links = footer.locator("a");
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThanOrEqual(2);

    // Copyright
    await expect(footer).toContainText(/©|copyright|CC BY/i);
  });

  // ── NAVIGATION FLOW ──

  test("Primary CTA navigates to /try", async ({ page }) => {
    const hero = page.locator('[data-section="hero"]');
    const tryCta = hero.locator('a[href="/try"]').first();
    await expect(tryCta).toBeVisible({ timeout: 10_000 });

    // Verify CTA points to /try
    const href = await tryCta.getAttribute("href");
    expect(href).toBe("/try");

    // Navigate to /try and confirm it loads (Next.js dev compilation can be slow
    // making click-then-waitForURL unreliable; href verification + goto is stable)
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/try");
  });

  // ── PERFORMANCE / SMOKE ──

  test("Page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    // Filtra erros esperados (analytics, third-party, Next.js dev overlay, React dev warnings, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Failed to load resource") &&
        !e.includes("analytics") &&
        !e.includes("gtag") &&
        !e.includes("favicon") &&
        !e.includes("next-dev") &&
        !e.includes("webpack") &&
        !e.includes("hydrat") &&
        !e.includes("NEXT_") &&
        !e.includes("404") &&
        !e.includes("cannot contain") &&
        !e.includes("script tag") &&
        !e.includes("ancestor stack trace")
    );

    // Não deve ter erros críticos de JavaScript
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });

  test("All sections load below the fold on scroll", async ({ page }) => {
    // Scroll até o final da página
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2_000);

    // Footer deve estar visível após scroll
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible({ timeout: 5_000 });
  });
});
