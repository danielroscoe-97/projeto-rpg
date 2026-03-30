import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NpcList } from "../NpcList";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

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

const mockNpcs: CampaignNpc[] = [
  {
    id: "npc-1",
    campaign_id: "campaign-1",
    name: "Visible NPC",
    description: null,
    stats: { hp: 30, ac: 14 },
    avatar_url: null,
    is_visible_to_players: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "npc-2",
    campaign_id: "campaign-1",
    name: "Hidden NPC",
    description: "A secret enemy",
    stats: { hp: 50, ac: 18, cr: "5" },
    avatar_url: null,
    is_visible_to_players: false,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

jest.mock("@/lib/supabase/campaign-npcs", () => ({
  getNpcs: jest.fn(),
  createNpc: jest.fn(),
  updateNpc: jest.fn(),
  deleteNpc: jest.fn(),
  toggleNpcVisibility: jest.fn(),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getNpcs } = require("@/lib/supabase/campaign-npcs");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NpcList", () => {
  it("renders empty state when no NPCs exist", async () => {
    getNpcs.mockResolvedValue([]);
    render(<NpcList campaignId="campaign-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("npc-empty-state")).toBeInTheDocument();
    });
  });

  it("renders NPC cards when NPCs exist", async () => {
    getNpcs.mockResolvedValue(mockNpcs);
    render(<NpcList campaignId="campaign-1" />);
    await waitFor(() => {
      expect(screen.getByText("Visible NPC")).toBeInTheDocument();
      expect(screen.getByText("Hidden NPC")).toBeInTheDocument();
    });
  });

  it("filters to visible only", async () => {
    getNpcs.mockResolvedValue(mockNpcs);
    const user = userEvent.setup();
    render(<NpcList campaignId="campaign-1" />);

    await waitFor(() => {
      expect(screen.getByText("Visible NPC")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("npc-filter-visible"));
    expect(screen.getByText("Visible NPC")).toBeInTheDocument();
    expect(screen.queryByText("Hidden NPC")).not.toBeInTheDocument();
  });

  it("filters to hidden only", async () => {
    getNpcs.mockResolvedValue(mockNpcs);
    const user = userEvent.setup();
    render(<NpcList campaignId="campaign-1" />);

    await waitFor(() => {
      expect(screen.getByText("Hidden NPC")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("npc-filter-hidden"));
    expect(screen.queryByText("Visible NPC")).not.toBeInTheDocument();
    expect(screen.getByText("Hidden NPC")).toBeInTheDocument();
  });

  it("switches between grid and list view", async () => {
    getNpcs.mockResolvedValue(mockNpcs);
    const user = userEvent.setup();
    render(<NpcList campaignId="campaign-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("npc-container")).toBeInTheDocument();
    });

    // Default is grid
    expect(screen.getByTestId("npc-container").className).toContain("grid");

    // Switch to list
    await user.click(screen.getByTestId("npc-view-list"));
    expect(screen.getByTestId("npc-container").className).toContain("space-y");
  });

  it("shows add NPC button", async () => {
    getNpcs.mockResolvedValue(mockNpcs);
    render(<NpcList campaignId="campaign-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("npc-add-button")).toBeInTheDocument();
    });
  });
});
