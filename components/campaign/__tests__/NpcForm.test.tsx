import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NpcForm } from "../NpcForm";

// Mock radix dialog to render inline
jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog");
  return {
    ...actual,
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div>{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Title: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    Close: () => null,
  };
});

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  campaignId: "campaign-1",
  onSave: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NpcForm", () => {
  it("renders form fields", () => {
    render(<NpcForm {...defaultProps} />);
    expect(screen.getByTestId("npc-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("npc-description-input")).toBeInTheDocument();
    expect(screen.getByTestId("npc-hp-input")).toBeInTheDocument();
    expect(screen.getByTestId("npc-ac-input")).toBeInTheDocument();
    expect(screen.getByTestId("npc-cr-input")).toBeInTheDocument();
    expect(screen.getByTestId("npc-visible-toggle")).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(<NpcForm {...defaultProps} />);
    await user.click(screen.getByTestId("npc-submit"));
    expect(screen.getByTestId("npc-name-error")).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with correct data on submit", async () => {
    const user = userEvent.setup();
    render(<NpcForm {...defaultProps} />);

    await user.type(screen.getByTestId("npc-name-input"), "Goblin King");
    await user.type(screen.getByTestId("npc-hp-input"), "45");
    await user.type(screen.getByTestId("npc-ac-input"), "16");
    await user.type(screen.getByTestId("npc-cr-input"), "3");
    await user.click(screen.getByTestId("npc-submit"));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: "campaign-1",
          name: "Goblin King",
          stats: expect.objectContaining({
            hp: 45,
            ac: 16,
            cr: "3",
          }),
        })
      );
    });
  });

  it("pre-fills fields when editing an existing NPC", () => {
    const npc = {
      id: "npc-1",
      campaign_id: "campaign-1",
      name: "Old Wizard",
      description: "Very old",
      stats: { hp: 50, ac: 12, cr: "2" },
      avatar_url: null,
      is_visible_to_players: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    render(<NpcForm {...defaultProps} npc={npc} />);
    expect(screen.getByTestId("npc-name-input")).toHaveValue("Old Wizard");
    expect(screen.getByTestId("npc-hp-input")).toHaveValue(50);
    expect(screen.getByTestId("npc-ac-input")).toHaveValue(12);
  });

  it("toggles visibility switch", async () => {
    const user = userEvent.setup();
    render(<NpcForm {...defaultProps} />);
    const toggle = screen.getByTestId("npc-visible-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
