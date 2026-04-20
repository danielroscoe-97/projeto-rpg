import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CharacterPickerModal,
  type CharacterPickerResult,
} from "@/components/character/CharacterPickerModal";
import { CharacterWizard } from "@/components/character/wizard/CharacterWizard";
import { listClaimableClient } from "@/lib/character/list-claimable-client";
import { listMineCharacters } from "@/lib/character/list-mine";

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

// Replace the real wizard with a minimal spy we can drive deterministically.
jest.mock("@/components/character/wizard/CharacterWizard", () => ({
  CharacterWizard: jest.fn(
    ({
      onComplete,
      onCancel,
      mode,
      campaignId,
      campaignName,
    }: {
      onComplete: (data: {
        name: string;
        characterClass: string | null;
        race: string | null;
        level: number;
        maxHp: number | null;
        ac: number | null;
        spellSaveDc: number | null;
      }) => Promise<void>;
      onCancel: () => void;
      mode?: string;
      campaignId?: string | null;
      campaignName?: string;
    }) => (
      <div
        data-testid="wizard-mock"
        data-wizard-mode={mode}
        data-wizard-campaign-id={campaignId}
        data-wizard-campaign-name={campaignName}
      >
        <button
          type="button"
          data-testid="wizard-mock-complete"
          onClick={() =>
            void onComplete({
              name: "Boromir",
              characterClass: "fighter",
              race: "Human",
              level: 3,
              maxHp: 32,
              ac: 17,
              spellSaveDc: null,
            })
          }
        >
          complete
        </button>
        <button
          type="button"
          data-testid="wizard-mock-cancel"
          onClick={onCancel}
        >
          cancel
        </button>
      </div>
    ),
  ),
}));

jest.mock("@/lib/character/list-claimable-client");
jest.mock("@/lib/character/list-mine");

const listClaimableMock = listClaimableClient as jest.MockedFunction<
  typeof listClaimableClient
>;
const listMineMock = listMineCharacters as jest.MockedFunction<
  typeof listMineCharacters
>;

const wizardMock = CharacterWizard as unknown as jest.Mock;

const baseProps = {
  campaignId: "camp-42",
  playerIdentity: { userId: "user-1" },
  open: true,
  onOpenChange: jest.fn(),
  onSelect: jest.fn<Promise<void>, [CharacterPickerResult]>(),
  campaignName: "The Lost Mines",
  dmName: "DM-Bob",
};

beforeEach(() => {
  jest.clearAllMocks();
  listClaimableMock.mockResolvedValue({
    characters: [],
    total: 0,
    hasMore: false,
    offset: 0,
    limit: 20,
  });
  listMineMock.mockResolvedValue({
    characters: [],
    total: 0,
    hasMore: false,
    offset: 0,
    limit: 20,
  });
});

describe("CharacterPickerModal — CharacterWizard embed (create tab)", () => {
  it("renders the wizard inside the create tab panel", async () => {
    const user = userEvent.setup();
    render(<CharacterPickerModal {...baseProps} />);
    await user.click(screen.getByTestId("invite.picker.tab-create"));

    expect(
      screen.getByTestId("invite.picker.tab-panel-create"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("wizard-mock")).toBeInTheDocument();
    // All 3 wizard-step wrapper testids are present (contract §3.3).
    expect(
      screen.getByTestId("invite.picker.create-wizard-step-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("invite.picker.create-wizard-step-2"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("invite.picker.create-wizard-step-3"),
    ).toBeInTheDocument();
  });

  it("passes campaignId, campaignName and mode='auth' to the wizard", async () => {
    const user = userEvent.setup();
    render(<CharacterPickerModal {...baseProps} />);
    await user.click(screen.getByTestId("invite.picker.tab-create"));

    const wizard = screen.getByTestId("wizard-mock");
    expect(wizard).toHaveAttribute("data-wizard-mode", "auth");
    expect(wizard).toHaveAttribute("data-wizard-campaign-id", "camp-42");
    expect(wizard).toHaveAttribute("data-wizard-campaign-name", "The Lost Mines");
  });

  it("passes mode='anon' when playerIdentity has no userId", async () => {
    const user = userEvent.setup();
    render(
      <CharacterPickerModal
        {...baseProps}
        playerIdentity={{ sessionTokenId: "anon-1" }}
      />,
    );
    await user.click(screen.getByTestId("invite.picker.tab-create"));

    const wizard = screen.getByTestId("wizard-mock");
    expect(wizard).toHaveAttribute("data-wizard-mode", "anon");
  });

  it("propagates onComplete data to onSelect with mode='created'", async () => {
    const user = userEvent.setup();
    render(<CharacterPickerModal {...baseProps} />);
    await user.click(screen.getByTestId("invite.picker.tab-create"));
    await user.click(screen.getByTestId("wizard-mock-complete"));

    expect(baseProps.onSelect).toHaveBeenCalledTimes(1);
    expect(baseProps.onSelect).toHaveBeenCalledWith({
      mode: "created",
      characterData: {
        name: "Boromir",
        maxHp: 32,
        currentHp: 32,
        ac: 17,
        spellSaveDc: null,
        race: "Human",
        class: "fighter",
        level: 3,
      },
    });
  });

  it("defaults HP and AC to 10 when the wizard returns null (skipped stats)", async () => {
    // Override wizard mock for this test — simulate a user who skipped stats.
    wizardMock.mockImplementationOnce(
      ({
        onComplete,
      }: {
        onComplete: (data: {
          name: string;
          characterClass: string | null;
          race: string | null;
          level: number;
          maxHp: number | null;
          ac: number | null;
          spellSaveDc: number | null;
        }) => Promise<void>;
      }) => (
        <button
          type="button"
          data-testid="wizard-mock-skipped-submit"
          onClick={() =>
            void onComplete({
              name: "Sam",
              characterClass: null,
              race: null,
              level: 1,
              maxHp: null,
              ac: null,
              spellSaveDc: null,
            })
          }
        >
          submit
        </button>
      ),
    );

    const user = userEvent.setup();
    render(<CharacterPickerModal {...baseProps} />);
    await user.click(screen.getByTestId("invite.picker.tab-create"));
    await user.click(screen.getByTestId("wizard-mock-skipped-submit"));

    expect(baseProps.onSelect).toHaveBeenCalledWith({
      mode: "created",
      characterData: expect.objectContaining({
        name: "Sam",
        maxHp: 10,
        currentHp: 10,
        ac: 10,
      }),
    });
  });

  it("wizard onCancel routes back to claim tab when available", async () => {
    const user = userEvent.setup();
    // Provide a static unlinked char so claim tab is active.
    render(
      <CharacterPickerModal
        {...baseProps}
        unlinkedCharacters={[
          { id: "u1", name: "Thorin", max_hp: 50, ac: 17 },
        ]}
      />,
    );
    await user.click(screen.getByTestId("invite.picker.tab-create"));
    expect(screen.getByTestId("wizard-mock")).toBeInTheDocument();

    await user.click(screen.getByTestId("wizard-mock-cancel"));

    // After cancel, the claim tab panel should be visible again.
    expect(
      screen.getByTestId("invite.picker.tab-panel-available"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("wizard-mock")).not.toBeInTheDocument();
  });
});
