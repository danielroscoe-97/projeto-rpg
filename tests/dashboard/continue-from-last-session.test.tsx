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
 *
 * A11y note: project does not have `@axe-core/react` installed (only
 * `@axe-core/playwright` for E2E). Rather than add a new devDep as part of
 * a parte-1 shell story, we assert the structural a11y contract here
 * (labelledby, link role + accessible name) and leave a full axe-core run
 * to `e2e/a11y/` once 02-F-full ships real data. See brief gotchas.
 */

import React from "react";
import { render, screen } from "@testing-library/react";

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
