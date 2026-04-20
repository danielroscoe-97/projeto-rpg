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

// Seed a handful of monsters so the source-filter test can assert DOM rows.
// Keep SrdMonster fields minimal — the browser only reads a few of them.
const _seededMonsters = [
  {
    id: "goblin-2014",
    name: "Goblin",
    cr: "1/4",
    type: "humanoid",
    size: "Small",
    ruleset_version: "2014",
    hit_points: 7,
    armor_class: 15,
    is_srd: true,
    source: "MM",
  },
  {
    id: "goblin-2024",
    name: "Goblin Warrior",
    cr: "1/4",
    type: "humanoid",
    size: "Small",
    ruleset_version: "2024",
    hit_points: 7,
    armor_class: 15,
    is_srd: true,
    source: "XMM",
  },
];

jest.mock("@/lib/stores/srd-store", () => ({
  useSrdStore: (selector: (s: unknown) => unknown) =>
    selector({
      spells: [],
      monsters: _seededMonsters,
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

// Stub out useContentAccess — we only care about its shape, not the Supabase
// calls underneath.
jest.mock("@/lib/hooks/use-content-access", () => ({
  useContentAccess: () => ({
    canAccess: false,
    isWhitelisted: false,
    hasAgreed: false,
    isAuthenticated: false,
    isLoading: false,
    requestGate: () => {},
    onGateCompleted: () => {},
  }),
}));

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

describe("PlayerCompendiumBrowser — D2 monster source filter", () => {
  const { fireEvent } = require("@testing-library/react") as typeof import("@testing-library/react");
  beforeEach(() => {
    __resetForTests();
    setFeatureFlagOverrideForTests("ff_favorites_v1", false);
    // Always start with filter persisted as "all" so each test has a clean baseline.
    try {
      window.localStorage.removeItem("compendium.monsters.filter.v1");
    } catch {
      /* jsdom always has localStorage, but be defensive */
    }
  });

  it("renders the 4 visible chips (all / srd_2014 / srd_2024 / mad) for guest", async () => {
    renderBrowser();
    // Navigate to monsters tab
    const monstersTab = await screen.findByText("combat.compendium_tab_monsters");
    fireEvent.click(monstersTab);

    // All 4 guest-visible chips present
    expect(await screen.findByTestId("compendium-monster-source-all")).toBeInTheDocument();
    expect(screen.getByTestId("compendium-monster-source-srd_2014")).toBeInTheDocument();
    expect(screen.getByTestId("compendium-monster-source-srd_2024")).toBeInTheDocument();
    expect(screen.getByTestId("compendium-monster-source-mad")).toBeInTheDocument();
    // non-SRD chip hidden for guest (canAccess=false from mock)
    expect(screen.queryByTestId("compendium-monster-source-nonsrd")).toBeNull();
  });

  it("clicking SRD 2024 hides the 2014 goblin from the list", async () => {
    renderBrowser();
    const monstersTab = await screen.findByText("combat.compendium_tab_monsters");
    fireEvent.click(monstersTab);

    // Both seeded monsters visible with "all" default.
    expect(await screen.findByText("Goblin")).toBeInTheDocument();
    expect(screen.getByText("Goblin Warrior")).toBeInTheDocument();

    // Flip to SRD 2024 — only the 2024 entry should remain.
    fireEvent.click(screen.getByTestId("compendium-monster-source-srd_2024"));

    await waitFor(() => {
      expect(screen.queryByText("Goblin")).toBeNull();
    });
    expect(screen.getByText("Goblin Warrior")).toBeInTheDocument();

    // And the choice is persisted to localStorage for next open.
    expect(window.localStorage.getItem("compendium.monsters.filter.v1")).toBe("srd_2024");
  });
});
