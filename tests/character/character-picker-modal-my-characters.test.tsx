import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CharacterPickerModal,
  type CharacterPickerResult,
} from "@/components/character/CharacterPickerModal";
import { listClaimableClient } from "@/lib/character/list-claimable-client";
import {
  listMineCharacters,
  type MyCharacterSummary,
} from "@/lib/character/list-mine";

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

jest.mock("@/components/character/wizard/CharacterWizard", () => ({
  CharacterWizard: () => <div data-testid="wizard-mock" />,
}));

jest.mock("@/lib/character/list-claimable-client");
jest.mock("@/lib/character/list-mine");

const listClaimableMock = listClaimableClient as jest.MockedFunction<
  typeof listClaimableClient
>;
const listMineMock = listMineCharacters as jest.MockedFunction<
  typeof listMineCharacters
>;

function makeMine(
  id: string,
  name: string,
  level = 5,
): MyCharacterSummary {
  return {
    id,
    name,
    race: "Elf",
    class: "Ranger",
    level,
    max_hp: 40,
    ac: 15,
    token_url: null,
    created_at: "2026-01-01",
  };
}

const basePropsAuth = {
  campaignId: "camp-1",
  playerIdentity: { userId: "user-1" },
  open: true,
  onOpenChange: jest.fn(),
  onSelect: jest.fn<Promise<void>, [CharacterPickerResult]>(),
  campaignName: "Campaign",
  dmName: "DM",
};

beforeEach(() => {
  jest.clearAllMocks();
  // Claim tab always empty in this suite so nothing races.
  listClaimableMock.mockResolvedValue({
    characters: [],
    total: 0,
    hasMore: false,
    offset: 0,
    limit: 20,
  });
});

describe("CharacterPickerModal — Meus personagens tab (auth gating)", () => {
  it("hides the 'Meus personagens' tab for anonymous users (no userId)", async () => {
    render(
      <CharacterPickerModal
        {...basePropsAuth}
        playerIdentity={{ sessionTokenId: "anon-1" }}
      />,
    );

    // Wait for claim-tab effect to settle so we don't race with the render.
    await waitFor(() => {
      expect(listClaimableMock).toHaveBeenCalled();
    });

    expect(
      screen.queryByTestId("invite.picker.tab-my-characters"),
    ).not.toBeInTheDocument();
    // And we must NOT have fetched the auth-only endpoint.
    expect(listMineMock).not.toHaveBeenCalled();
  });

  it("shows the 'Meus personagens' tab for authenticated users", async () => {
    listMineMock.mockResolvedValue({
      characters: [],
      total: 0,
      hasMore: false,
      offset: 0,
      limit: 20,
    });

    render(<CharacterPickerModal {...basePropsAuth} />);

    expect(
      screen.getByTestId("invite.picker.tab-my-characters"),
    ).toBeInTheDocument();
  });

  it("fetches and renders the player's standalone characters when tab is opened", async () => {
    listMineMock.mockResolvedValueOnce({
      characters: [makeMine("m1", "Aragorn"), makeMine("m2", "Legolas")],
      total: 2,
      hasMore: false,
      offset: 0,
      limit: 20,
    });

    const user = userEvent.setup();
    render(<CharacterPickerModal {...basePropsAuth} />);

    await user.click(screen.getByTestId("invite.picker.tab-my-characters"));

    await waitFor(() => {
      expect(
        screen.getByTestId("invite.picker.character-card-m1"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("invite.picker.character-card-m2"),
    ).toBeInTheDocument();

    expect(listMineMock).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 20 }),
    );
  });

  it("shows empty-state when the user has no standalone characters", async () => {
    listMineMock.mockResolvedValueOnce({
      characters: [],
      total: 0,
      hasMore: false,
      offset: 0,
      limit: 20,
    });

    const user = userEvent.setup();
    render(<CharacterPickerModal {...basePropsAuth} />);

    await user.click(screen.getByTestId("invite.picker.tab-my-characters"));

    await waitFor(() => {
      expect(
        screen.getByTestId("invite.picker.empty-state-my-characters"),
      ).toBeInTheDocument();
    });
  });

  it("appends next page when load-more clicked in 'Meus personagens' tab", async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      makeMine(`p${i}`, `Char ${i}`),
    );
    const secondPage = [makeMine("p99", "Overflow")];

    listMineMock
      .mockResolvedValueOnce({
        characters: firstPage,
        total: 21,
        hasMore: true,
        offset: 0,
        limit: 20,
      })
      .mockResolvedValueOnce({
        characters: secondPage,
        total: 21,
        hasMore: false,
        offset: 20,
        limit: 20,
      });

    const user = userEvent.setup();
    render(<CharacterPickerModal {...basePropsAuth} />);

    await user.click(screen.getByTestId("invite.picker.tab-my-characters"));

    await waitFor(() => {
      expect(
        screen.getByTestId("invite.picker.character-card-p0"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("invite.picker.load-more-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("invite.picker.character-card-p99"),
      ).toBeInTheDocument();
    });

    expect(listMineMock).toHaveBeenCalledTimes(2);
  });

  it("shows error state when fetching mine fails", async () => {
    listMineMock.mockRejectedValueOnce(new Error("401 Unauthorized"));

    const user = userEvent.setup();
    render(<CharacterPickerModal {...basePropsAuth} />);

    await user.click(screen.getByTestId("invite.picker.tab-my-characters"));

    await waitFor(() => {
      expect(screen.getByTestId("invite.picker.error")).toBeInTheDocument();
    });
  });
});
