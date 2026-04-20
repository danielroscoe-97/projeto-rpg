/**
 * @jest-environment jsdom
 *
 * S5.2 — PlayerCompendiumBrowser × Favorites tab integration tests.
 *
 * Covers:
 *   - Flag OFF → Favoritos tab NOT rendered (legacy UX).
 *   - Flag ON + 0 favorites → tab rendered, "all" remains default-active.
 *   - Flag ON + ≥1 favorite → tab rendered AND default-active on open.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { setFeatureFlagOverrideForTests } from "@/lib/flags";
import { __resetForTests, addFavorite } from "@/lib/favorites/local-store";

// ── Heavy-module mocks ──────────────────────────────────────────────────────
// The compendium pulls in the SRD store, srd-content-filter hook, and several
// card renderers that are irrelevant to the tab-bar behaviour. Replace them
// with minimal fakes so the test stays focused on favorites wiring.

// Force guest/anon path in useFavorites (skip Supabase).
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));

jest.mock("@/lib/stores/srd-store", () => ({
  useSrdStore: (selector: (s: unknown) => unknown) =>
    selector({
      spells: [],
      monsters: [],
      items: [],
      feats: [],
      races: [],
      backgrounds: [],
      is_loading: false,
    }),
}));

jest.mock("@/lib/hooks/use-srd-content-filter", () => ({
  useSrdContentFilter: <T,>(items: T[]) => ({ filtered: items }),
}));

jest.mock("@/lib/srd/srd-search", () => ({
  getCoreConditions: () => [],
  getAllFeats: () => [],
}));

// Renderers we don't care about in this test — stub them out.
jest.mock("@/components/oracle/SpellCard", () => ({ SpellCard: () => null }));
jest.mock("@/components/oracle/MonsterStatBlock", () => ({ MonsterStatBlock: () => null }));
jest.mock("@/components/oracle/ItemCard", () => ({ ItemCard: () => null }));
jest.mock("@/components/player/CompendiumLoginNudge", () => ({
  CompendiumLoginNudge: () => null,
}));

// Silence analytics.
jest.mock("@/lib/analytics/track", () => ({ trackEvent: jest.fn() }));

// Stub Radix Dialog so DialogContent always renders its children (no portal
// behaviour to test here — we just want DOM presence when `open=true`).
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Import AFTER mocks are registered.
const { PlayerCompendiumBrowser } = require("./PlayerCompendiumBrowser") as typeof import("./PlayerCompendiumBrowser");

function renderBrowser() {
  return render(
    <PlayerCompendiumBrowser open onOpenChange={() => {}} mode="guest" />,
  );
}

describe("PlayerCompendiumBrowser — Favoritos tab (ff_favorites_v1)", () => {
  beforeEach(() => {
    __resetForTests();
    setFeatureFlagOverrideForTests("ff_favorites_v1", undefined);
  });

  it("flag OFF: Favoritos tab is NOT rendered (legacy UX preserved)", async () => {
    setFeatureFlagOverrideForTests("ff_favorites_v1", false);
    renderBrowser();
    // Tab labels from the i18n stub resolve to "<namespace>.<key>". The
    // favorites tab uses useTranslations("favorites") and tab_label.
    await waitFor(() => {
      expect(screen.queryByText("favorites.tab_label")).toBeNull();
    });
    // Other tabs still render.
    expect(screen.getByText("combat.compendium_tab_all")).toBeInTheDocument();
  });

  it("flag ON + 0 favorites: tab rendered but 'All' remains default-active", async () => {
    setFeatureFlagOverrideForTests("ff_favorites_v1", true);
    renderBrowser();
    // Tab visible
    expect(await screen.findByText("favorites.tab_label")).toBeInTheDocument();
    // No favorites panel mounted (default active is "all", not "favorites")
    expect(screen.queryByTestId("compendium-favorites-panel")).toBeNull();
  });

  it("flag ON + ≥1 favorite: Favoritos tab is default-active on open", async () => {
    // Seed localStorage before render so the hook picks it up via localGet().
    addFavorite("monster", "goblin");

    setFeatureFlagOverrideForTests("ff_favorites_v1", true);
    renderBrowser();

    // Tab visible
    expect(await screen.findByText("favorites.tab_label")).toBeInTheDocument();

    // Favorites panel should mount because it's the default-active tab.
    await waitFor(() => {
      expect(screen.getByTestId("compendium-favorites-panel")).toBeInTheDocument();
    });
  });
});
