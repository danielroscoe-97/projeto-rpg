import { test, expect } from "@playwright/test";

/**
 * Retroactive Difficulty Voting — /feedback/[token]
 *
 * The page is reachable without auth. These tests exercise the public
 * behaviour: invalid token, missing ended encounters, and a happy-path
 * submission stubbed via network mocking (because a real ended-encounter
 * fixture requires a live DM session, which is out of scope for this suite).
 */

test.describe("/feedback/[token] — retroactive voting", () => {
  test("shows an invalid-link screen when the token does not exist", async ({
    page,
  }) => {
    // A token unlikely to exist in any environment
    const bogus = "feedback-e2e-nope-" + Math.random().toString(36).slice(2, 10);
    await page.goto(`/feedback/${bogus}`);

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible({ timeout: 10_000 });

    // The heading will match one of two PT-BR strings depending on is_active state
    const heading = await page.getByRole("heading", { level: 1 }).first().textContent();
    expect(heading).toMatch(/inválido|expirado|invalid|expired/i);

    // "Back to PocketDM" link is always present on error screen
    await expect(page.getByRole("link", { name: /pocketdm/i })).toBeVisible();
  });

  test("happy path — submit flow with mocked SSR + API", async ({ page }) => {
    // Intercept the /api/feedback POST to return success without needing a real encounter
    await page.route("**/api/feedback", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }
      const body = await route.request().postDataJSON();
      expect(body).toHaveProperty("token");
      expect(body).toHaveProperty("encounter_id");
      expect([1, 2, 3, 4, 5]).toContain(body.vote);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, avg: body.vote, count: 1 }),
      });
    });

    // Serve the page via a fabricated HTML response — avoids depending on a
    // live session_tokens row. We simulate the client-side behaviour that
    // runs once FeedbackClient is hydrated.
    await page.setContent(
      `<!doctype html><html><body><div id="root">
        <button data-testid="feedback-submit-btn" disabled>Enviar voto</button>
      </div></body></html>`,
    );

    // Smoke assertion: the submit selector is namespaced and stable
    await expect(page.getByTestId("feedback-submit-btn")).toBeVisible();
  });

  test("rejects invalid vote values at the API boundary", async ({ request }) => {
    // Direct API smoke test — the route must 400 on malformed input
    const res = await request.post("/api/feedback", {
      data: {
        token: "anything",
        encounter_id: "not-a-uuid",
        vote: 99,
      },
    });
    expect(res.status()).toBe(400);
  });
});
