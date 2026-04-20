import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CharacterPickerModal,
  type CharacterPickerResult,
} from "@/components/character/CharacterPickerModal";
import { listClaimableClient } from "@/lib/character/list-claimable-client";
import { listMineCharacters } from "@/lib/character/list-mine";

// Radix mock (same shape as the sibling picker test) so assertions don't need
// to worry about portals / focus traps in jsdom.
jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog");
  return {
    ...actual,
    Root: ({
      children,
      open,
    }: {
      children: React.ReactNode;
      open: boolean;
    }) => (open ? <div data-testid="mock-dialog-root">{children}</div> : null),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <div role="dialog" aria-modal="true" {...props}>
        {children}
      </div>
    ),
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Close: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  };
});

// Wizard mock — not exercised in this file but imported by the modal.
jest.mock("@/components/character/wizard/CharacterWizard", () => ({
  CharacterWizard: () => <div data-testid="wizard-mock" />,
}));

// Mock the list wrappers so we can control pagination deterministically.
jest.mock("@/lib/character/list-claimable-client");
jest.mock("@/lib/character/list-mine");

const listClaimableMock = listClaimableClient as jest.MockedFunction<
  typeof listClaimableClient
>;
const listMineMock = listMineCharacters as jest.MockedFunction<
  typeof listMineCharacters
>;

type PC = {
  id: string;
  name: string;
  max_hp: number;
  ac: number;
  campaign_id: string | null;
  user_id: string | null;
  claimed_by_session_token: string | null;
  current_hp: number;
  hp_temp: number;
  speed: null;
  initiative_bonus: null;
  inspiration: boolean;
  conditions: string[];
  spell_save_dc: null;
  dm_notes: string;
  race: null;
  class: null;
  level: null;
  subrace: null;
  subclass: null;
  background: null;
  alignment: null;
  notes: null;
  token_url: null;
  spell_slots: null;
  str: null;
  dex: null;
  con: null;
  int_score: null;
  wis: null;
  cha_score: null;
  traits: null;
  proficiencies: Record<string, unknown>;
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  created_at: string;
  updated_at: string;
};

function makeChar(id: string, name: string): PC {
  return {
    id,
    name,
    max_hp: 30,
    ac: 14,
    campaign_id: "camp-1",
    user_id: null,
    claimed_by_session_token: null,
    current_hp: 30,
    hp_temp: 0,
    speed: null,
    initiative_bonus: null,
    inspiration: false,
    conditions: [],
    spell_save_dc: null,
    dm_notes: "",
    race: null,
    class: null,
    level: null,
    subrace: null,
    subclass: null,
    background: null,
    alignment: null,
    notes: null,
    token_url: null,
    spell_slots: null,
    str: null,
    dex: null,
    con: null,
    int_score: null,
    wis: null,
    cha_score: null,
    traits: null,
    proficiencies: {} as Record<string, unknown>,
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

const baseProps = {
  campaignId: "camp-1",
  playerIdentity: { userId: "user-1" },
  open: true,
  onOpenChange: jest.fn(),
  onSelect: jest.fn<Promise<void>, [CharacterPickerResult]>(),
  // NOTE: arrays intentionally undefined → paginated mode activates.
  campaignName: "Test Campaign",
  dmName: "DM",
};

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure "mine" tab is empty by default so it doesn't race with claim tab
  // when mounted.
  listMineMock.mockResolvedValue({
    characters: [],
    total: 0,
    hasMore: false,
    offset: 0,
    limit: 20,
  });
});

describe("CharacterPickerModal — pagination (Disponíveis tab)", () => {
  it("loads the initial page of 20 and renders each card", async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      makeChar(`c${i}`, `Char ${i}`),
    );
    listClaimableMock.mockResolvedValueOnce({
      characters: firstPage,
      total: 35,
      hasMore: true,
      offset: 0,
      limit: 20,
    });

    render(<CharacterPickerModal {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.claim-card-c0")).toBeInTheDocument();
    });

    expect(screen.getByTestId("invite.picker.claim-card-c19")).toBeInTheDocument();
    expect(screen.queryByTestId("invite.picker.claim-card-c20")).not.toBeInTheDocument();

    // Load-more button is visible because hasMore=true.
    expect(
      screen.getByTestId("invite.picker.load-more-button"),
    ).toBeInTheDocument();
  });

  it("appends the next page when load-more is clicked", async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      makeChar(`a${i}`, `A ${i}`),
    );
    const secondPage = Array.from({ length: 15 }, (_, i) =>
      makeChar(`b${i}`, `B ${i}`),
    );

    listClaimableMock
      .mockResolvedValueOnce({
        characters: firstPage,
        total: 35,
        hasMore: true,
        offset: 0,
        limit: 20,
      })
      .mockResolvedValueOnce({
        characters: secondPage,
        total: 35,
        hasMore: false,
        offset: 20,
        limit: 20,
      });

    const user = userEvent.setup();
    render(<CharacterPickerModal {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.claim-card-a0")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("invite.picker.load-more-button"));

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.claim-card-b0")).toBeInTheDocument();
    });

    // First page should still be present (appended, not replaced).
    expect(screen.getByTestId("invite.picker.claim-card-a0")).toBeInTheDocument();

    // hasMore=false → load-more disappears.
    expect(
      screen.queryByTestId("invite.picker.load-more-button"),
    ).not.toBeInTheDocument();

    expect(listClaimableMock).toHaveBeenCalledTimes(2);
    expect(listClaimableMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      campaignId: "camp-1",
      offset: 0,
      limit: 20,
    }));
    expect(listClaimableMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      campaignId: "camp-1",
      offset: 20,
      limit: 20,
    }));
  });

  it("shows empty-state when total is 0", async () => {
    listClaimableMock.mockResolvedValueOnce({
      characters: [],
      total: 0,
      hasMore: false,
      offset: 0,
      limit: 20,
    });

    render(<CharacterPickerModal {...baseProps} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("invite.picker.empty-state-available"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("invite.picker.load-more-button"),
    ).not.toBeInTheDocument();
  });

  it("shows loading state before the first page resolves", async () => {
    let resolvePromise: (v: {
      characters: PC[];
      total: number;
      hasMore: boolean;
      offset: number;
      limit: number;
    }) => void = () => {};
    listClaimableMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    render(<CharacterPickerModal {...baseProps} />);

    // Loading indicator should appear immediately.
    expect(await screen.findByTestId("invite.picker.loading")).toBeInTheDocument();

    // Resolve the promise to cleanup (prevents open handles).
    resolvePromise({
      characters: [],
      total: 0,
      hasMore: false,
      offset: 0,
      limit: 20,
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("invite.picker.empty-state-available"),
      ).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails and does not render cards", async () => {
    listClaimableMock.mockRejectedValueOnce(new Error("Network down"));

    render(<CharacterPickerModal {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.error")).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("invite.picker.empty-state-available"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("invite.picker.load-more-button"),
    ).not.toBeInTheDocument();
  });

  it("respects a custom pageSize prop", async () => {
    const smallPage = Array.from({ length: 5 }, (_, i) =>
      makeChar(`s${i}`, `S${i}`),
    );
    listClaimableMock.mockResolvedValueOnce({
      characters: smallPage,
      total: 5,
      hasMore: false,
      offset: 0,
      limit: 5,
    });

    render(<CharacterPickerModal {...baseProps} pageSize={5} />);

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.claim-card-s0")).toBeInTheDocument();
    });

    expect(listClaimableMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });

  it("does not fetch when the modal is closed (open=false)", () => {
    render(<CharacterPickerModal {...baseProps} open={false} />);
    expect(listClaimableMock).not.toHaveBeenCalled();
  });

  // M3 (code review fix) — rapid double-click on load-more MUST NOT fire two
  // concurrent fetches. The useRef-based inflight guard collapses the second
  // click until the first page resolves.
  it("M3: rapid double-click on load-more only fires one fetch (inflight guard)", async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      makeChar(`a${i}`, `A ${i}`),
    );
    const secondPage = Array.from({ length: 10 }, (_, i) =>
      makeChar(`b${i}`, `B ${i}`),
    );

    // First call resolves immediately so the initial render populates the
    // 20-item page. Second call is a slow promise we control.
    let resolveSecond: (v: {
      characters: PC[];
      total: number;
      hasMore: boolean;
      offset: number;
      limit: number;
    }) => void = () => {};
    listClaimableMock
      .mockResolvedValueOnce({
        characters: firstPage,
        total: 30,
        hasMore: true,
        offset: 0,
        limit: 20,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const user = userEvent.setup();
    render(<CharacterPickerModal {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.claim-card-a0")).toBeInTheDocument();
    });

    // Only the initial fetch should have happened so far.
    expect(listClaimableMock).toHaveBeenCalledTimes(1);

    const loadMoreBtn = screen.getByTestId("invite.picker.load-more-button");
    // Rapid double-click — BEFORE resolving the inflight fetch.
    await user.click(loadMoreBtn);
    await user.click(loadMoreBtn);
    await user.click(loadMoreBtn);

    // The inflight guard must have collapsed the extra clicks: exactly one
    // additional fetch is in-flight, so the mock count is 2 (initial + one
    // load-more), NOT 4.
    expect(listClaimableMock).toHaveBeenCalledTimes(2);

    // Offset of the in-flight call must be the size of the first page.
    expect(listClaimableMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ offset: 20 }),
    );

    // Resolve the second page and verify data appends correctly.
    resolveSecond({
      characters: secondPage,
      total: 30,
      hasMore: false,
      offset: 20,
      limit: 20,
    });

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.claim-card-b0")).toBeInTheDocument();
    });

    // Post-resolution: still exactly 2 total fetches (the swallowed clicks
    // never turned into fetches).
    expect(listClaimableMock).toHaveBeenCalledTimes(2);
  });
});
