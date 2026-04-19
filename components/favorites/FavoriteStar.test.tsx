/**
 * @jest-environment jsdom
 *
 * S5.2 — FavoriteStar component tests.
 *
 * Covers:
 *   - Flag OFF → returns null (zero visual regression)
 *   - Flag ON + not favorited → renders with aria-pressed="false"
 *   - Click toggles state and stops propagation to parent (card click safety)
 *   - Click when already favorited removes + fires onToggle(false)
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FavoriteStar } from "./FavoriteStar";
import { __resetForTests } from "@/lib/favorites/local-store";
import { setFeatureFlagOverrideForTests } from "@/lib/flags";

// Force guest/anon path in useFavorites so the hook doesn't try to call Supabase.
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  }),
}));

// Silence analytics during tests.
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

describe("FavoriteStar (ff_favorites_v1)", () => {
  beforeEach(() => {
    __resetForTests();
    setFeatureFlagOverrideForTests("ff_favorites_v1", undefined);
  });

  it("returns null when ff_favorites_v1 is OFF (legacy UX preserved)", () => {
    setFeatureFlagOverrideForTests("ff_favorites_v1", false);
    const { container } = render(
      <FavoriteStar kind="monster" slug="goblin" name="Goblin" />
    );
    expect(container.querySelector('[data-testid="favorite-star"]')).toBeNull();
  });

  it("renders with aria-pressed='false' when flag ON and not favorited", async () => {
    setFeatureFlagOverrideForTests("ff_favorites_v1", true);
    render(<FavoriteStar kind="monster" slug="goblin" name="Goblin" />);
    const btn = await screen.findByTestId("favorite-star");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    // jest.setup.ts interpolates {name} → "Goblin" in the mocked useTranslations.
    // But next-intl's mock may pass through the raw key when params is absent
    // in prefix form. Accept either format for robustness against i18n-harness drift.
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Goblin|favorite_aria/);
  });

  it("click toggles aria-pressed AND does NOT propagate to parent onClick", async () => {
    setFeatureFlagOverrideForTests("ff_favorites_v1", true);
    const parentClick = jest.fn();

    render(
      <div data-testid="row" onClick={parentClick}>
        <FavoriteStar kind="monster" slug="goblin" name="Goblin" />
      </div>
    );

    const btn = await screen.findByTestId("favorite-star");
    expect(btn).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      fireEvent.click(btn);
    });

    // Click should NOT bubble up (the compendium card row must not open detail).
    expect(parentClick).not.toHaveBeenCalled();

    // State should flip to favorited.
    const after = await screen.findByTestId("favorite-star");
    expect(after).toHaveAttribute("aria-pressed", "true");
  });

  it("click when already favorited removes and updates aria-pressed", async () => {
    setFeatureFlagOverrideForTests("ff_favorites_v1", true);
    const onToggle = jest.fn();
    render(<FavoriteStar kind="monster" slug="goblin" name="Goblin" onToggle={onToggle} />);

    const btn = await screen.findByTestId("favorite-star");
    // First click → favorite.
    await act(async () => { fireEvent.click(btn); });
    expect(onToggle).toHaveBeenLastCalledWith(true);
    // Second click → unfavorite.
    await act(async () => { fireEvent.click(btn); });
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});
