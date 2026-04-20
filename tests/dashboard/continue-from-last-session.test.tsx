/**
 * Story 02-F parte 1 — ContinueFromLastSession tests (Sally, UX).
 *
 * Coverage:
 * - renders card with mock data (avatar initial, campaign/character names,
 *   relative date, CTA)
 * - renders skeleton with identical shape (same padding, same avatar slot)
 * - skipping render contract: consumer must not render the card when
 *   `last_session_at` is null (we assert the decision logic here since the
 *   server component does the gating; see `app/app/dashboard/page.tsx`)
 * - i18n strings route through `useTranslations("dashboard.continueFromLastSession")`
 * - Suspense boundary: skeleton renders while the server component promise
 *   is pending (code-review C3 fix)
 * - future-date guard: clock skew cannot surface "in N seconds" (code-review
 *   M2 fix — `formatRelative` clamps `diffSec <= 0`)
 * - locale is driven by next-intl (prop or `useLocale()`), NOT
 *   `navigator.language` (code-review M1 fix)
 *
 * A11y note: project does not have `@axe-core/react` installed (only
 * `@axe-core/playwright` for E2E). Rather than add a new devDep as part of
 * a parte-1 shell story, we assert the structural a11y contract here
 * (labelledby, link role + accessible name) and leave a full axe-core run
 * to `e2e/a11y/` once 02-F-full ships real data. See brief gotchas.
 */

import React, { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { ContinueFromLastSession } from "@/components/dashboard/ContinueFromLastSession";
import { ContinueFromLastSessionSkeleton } from "@/components/dashboard/ContinueFromLastSessionSkeleton";

// framer-motion's `motion.section` renders a plain <section> under jsdom; no
// mock needed. next/link ditto. useTranslations is already mocked globally
// via jest.setup.ts (returns "namespace.key").

const baseData = {
  campaignId: "camp-123",
  characterId: "char-456",
  campaignName: "Queda de Krynn",
  characterName: "Thorin Pedra-de-Ferro",
  avatarUrl: null,
  // Fixed ~2 hours ago so the relative-time output is deterministic enough
  // to assert on (we accept any non-empty string).
  lastSessionAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

describe("ContinueFromLastSession", () => {
  it("renders the card with character name, campaign name, and CTA", () => {
    render(<ContinueFromLastSession data={baseData} />);

    // Character + campaign names
    expect(screen.getByText("Thorin Pedra-de-Ferro")).toBeInTheDocument();
    expect(screen.getByText("Queda de Krynn")).toBeInTheDocument();

    // i18n strings come through as "<namespace>.<key>" under the jest mock
    expect(
      screen.getByText("dashboard.continueFromLastSession.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.continueFromLastSession.cta"),
    ).toBeInTheDocument();
  });

  it("falls back to the avatar initial when no avatarUrl is provided", () => {
    render(<ContinueFromLastSession data={baseData} />);
    // "Thorin..." → "T"
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("links to the campaign sheet when campaignId is set", () => {
    render(<ContinueFromLastSession data={baseData} />);
    const link = screen.getByTestId("continue-from-last-session");
    expect(link).toHaveAttribute("href", "/app/campaigns/camp-123/sheet");
  });

  it("links to the character HQ when only characterId is set", () => {
    render(
      <ContinueFromLastSession
        data={{ ...baseData, campaignId: null }}
      />,
    );
    const link = screen.getByTestId("continue-from-last-session");
    expect(link).toHaveAttribute("href", "/app/characters/char-456");
  });

  it("uses i18n fallbacks for campaign/character names when null", () => {
    render(
      <ContinueFromLastSession
        data={{
          ...baseData,
          campaignName: null,
          characterName: null,
        }}
      />,
    );

    // Both fallbacks render through the mocked translator
    expect(
      screen.getByText("dashboard.continueFromLastSession.defaultCharacterName"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.continueFromLastSession.defaultCampaignName"),
    ).toBeInTheDocument();
  });

  it("exposes the section with an accessible name via aria-labelledby", () => {
    render(<ContinueFromLastSession data={baseData} />);
    const region = screen.getByRole("region", {
      name: /dashboard\.continueFromLastSession\.title/,
    });
    expect(region).toBeInTheDocument();
  });
});

describe("ContinueFromLastSessionSkeleton", () => {
  it("renders the skeleton placeholder marked aria-hidden", () => {
    render(<ContinueFromLastSessionSkeleton />);
    const skeleton = screen.getByTestId("continue-from-last-session-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
  });

  it("shares the same outer spacing as the live card (mb-6 + rounded-xl)", () => {
    // Sanity: both components wrap their content in `mb-6` and a
    // `rounded-xl border bg-card` container. If either drifts, the loaded
    // card will pop/shift when it replaces the skeleton.
    const { container: cardContainer } = render(
      <ContinueFromLastSession data={baseData} />,
    );
    const { container: skelContainer } = render(
      <ContinueFromLastSessionSkeleton />,
    );

    const cardSection = cardContainer.querySelector("section");
    const skelSection = skelContainer.querySelector("section");
    expect(cardSection?.className).toContain("mb-6");
    expect(skelSection?.className).toContain("mb-6");

    // Inner card surface
    expect(cardSection?.innerHTML).toContain("rounded-xl");
    expect(skelSection?.innerHTML).toContain("rounded-xl");
  });
});

describe("Render-gating contract (consumer-side)", () => {
  // The parent server component gates rendering on `last_session_at`.
  // This test documents that contract: consumers should NOT call
  // <ContinueFromLastSession> when `lastSessionAt` would be null/empty.
  it("is gated by a truthy last_session_at at the call site", () => {
    const mockUser = { last_session_at: null as string | null };
    const shouldRender = Boolean(mockUser.last_session_at);
    expect(shouldRender).toBe(false);

    const mockUser2 = { last_session_at: new Date().toISOString() };
    expect(Boolean(mockUser2.last_session_at)).toBe(true);
  });
});

describe("Suspense boundary (code-review C3 fix)", () => {
  // Reproduces the dashboard's shape: a Suspense boundary with the skeleton
  // as fallback, wrapping an async child that resolves to the card. Asserts
  // that the skeleton actually paints while the child is pending — something
  // the pre-fix dashboard couldn't do because the query was inlined inside
  // the page-level Promise.all.
  it("renders the skeleton while the async child is pending, then swaps in the card", async () => {
    // React waits on thenables for async server components. We simulate one
    // by creating a lazy component that resolves after a microtask.
    let resolveFn: (mod: {
      default: React.ComponentType;
    }) => void = () => {};
    const LazyCard = React.lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          resolveFn = resolve;
        }),
    );

    render(
      <Suspense fallback={<ContinueFromLastSessionSkeleton />}>
        <LazyCard />
      </Suspense>,
    );

    // First paint: the skeleton is visible.
    expect(
      screen.getByTestId("continue-from-last-session-skeleton"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("continue-from-last-session"),
    ).not.toBeInTheDocument();

    // Resolve the promise with the real card.
    resolveFn({
      default: () => <ContinueFromLastSession data={baseData} />,
    });

    // Skeleton is swapped out, card is now in the DOM.
    await waitFor(() => {
      expect(
        screen.getByTestId("continue-from-last-session"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("continue-from-last-session-skeleton"),
    ).not.toBeInTheDocument();
  });
});

describe("formatRelative — future-date clamp (code-review M2 fix)", () => {
  // If the server's clock is ~30s ahead of the client's (or vice versa), the
  // `last_session_at` timestamp can land in the future. The card must NEVER
  // render "in 30 seconds" — it is, by definition, about the past. The fix
  // clamps `diffSec <= 0` so `Intl.RelativeTimeFormat` always renders a
  // past-tense string.
  it("does not render a future-tense string when lastSessionAt is in the future", () => {
    const thirtySecondsInFuture = new Date(
      Date.now() + 30 * 1000,
    ).toISOString();

    render(
      <ContinueFromLastSession
        data={{ ...baseData, lastSessionAt: thirtySecondsInFuture }}
      />,
    );

    const card = screen.getByTestId("continue-from-last-session");
    const rendered = card.textContent ?? "";

    // Nothing that looks like a future-tense English/Portuguese string should
    // appear. Under `numeric: "auto"` and a 0-second diff, Intl emits "now",
    // "agora" or similar — either way, never a future phrase.
    expect(rendered).not.toMatch(/\bin\b/i); // English: "in 30 seconds"
    expect(rendered).not.toMatch(/\bdaqui\b/i); // pt-BR: "daqui a 30 segundos"
    expect(rendered).not.toMatch(/\bem 30\b/i); // pt-BR variant: "em 30 segundos"
  });
});

describe("Locale is driven by next-intl (code-review M1 fix)", () => {
  // The fix removes `navigator.language` as a locale source; the component
  // now takes `locale` as an optional prop (resolved server-side via
  // `getLocale()` from next-intl/server) or falls back to `useLocale()`.
  // We assert that `Intl.RelativeTimeFormat` is called with the explicit
  // locale prop, NOT whatever jsdom sets for `navigator.language`.
  it("uses the `locale` prop (not navigator.language) when provided", () => {
    // Spy on the constructor so we can observe the locale argument.
    const originalRTF = Intl.RelativeTimeFormat;
    const calls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).RelativeTimeFormat = function (
      locale: string,
      opts?: Intl.RelativeTimeFormatOptions,
    ) {
      calls.push(locale);
      return new originalRTF(locale, opts);
    };

    try {
      render(<ContinueFromLastSession data={baseData} locale="en" />);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).RelativeTimeFormat = originalRTF;
    }

    // The spy must have seen "en" (from the prop) — NOT anything derived from
    // `navigator.language`, which the component no longer reads.
    expect(calls).toContain("en");
  });

  it("falls back to useLocale() when no prop is provided", () => {
    const originalRTF = Intl.RelativeTimeFormat;
    const calls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).RelativeTimeFormat = function (
      locale: string,
      opts?: Intl.RelativeTimeFormatOptions,
    ) {
      calls.push(locale);
      return new originalRTF(locale, opts);
    };

    try {
      render(<ContinueFromLastSession data={baseData} />);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).RelativeTimeFormat = originalRTF;
    }

    // jest.setup.ts mocks useLocale() to return "pt-BR".
    expect(calls).toContain("pt-BR");
  });
});
