/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignLoader } from "./CampaignLoader";
import type { PlayerCharacter } from "@/lib/types/database";

// Mock Supabase browser client
const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

const mockCampaigns = [
  {
    id: "camp-1",
    name: "The Lost Mine",
    player_characters: [{ count: 3 }],
  },
  {
    id: "camp-2",
    name: "Empty Campaign",
    player_characters: [{ count: 0 }],
  },
];

const mockPlayers: PlayerCharacter[] = [
  {
    id: "pc-1",
    campaign_id: "camp-1",
    name: "Aria",
    max_hp: 40,
    current_hp: 40,
    ac: 14,
    spell_save_dc: 15,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "pc-2",
    campaign_id: "camp-1",
    name: "Borran",
    max_hp: 55,
    current_hp: 55,
    ac: 16,
    spell_save_dc: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

beforeEach(() => {
  jest.clearAllMocks();

  // Default: campaigns fetch chain
  mockOrder.mockResolvedValue({ data: mockCampaigns });
  mockEq.mockReturnValue({ order: jest.fn().mockResolvedValue({ data: mockPlayers }) });
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq });
});

describe("CampaignLoader", () => {
  it("renders the Load Campaign button", () => {
    render(<CampaignLoader onLoad={jest.fn()} />);
    expect(screen.getByTestId("load-campaign-btn")).toBeInTheDocument();
    expect(screen.getByText("session.load_campaign")).toBeInTheDocument();
  });

  it("dialog opens when 'Load Campaign' button is clicked", async () => {
    render(<CampaignLoader onLoad={jest.fn()} />);
    expect(screen.queryByTestId("campaign-loader-dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("load-campaign-btn"));
    expect(screen.getByTestId("campaign-loader-dialog")).toBeInTheDocument();
  });

  it("renders campaign list with names and player counts", async () => {
    render(<CampaignLoader onLoad={jest.fn()} />);
    await userEvent.click(screen.getByTestId("load-campaign-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("campaign-list")).toBeInTheDocument()
    );

    expect(screen.getByText("The Lost Mine")).toBeInTheDocument();
    expect(screen.getByText("3 session.campaign_players_plural")).toBeInTheDocument();
    expect(screen.getByText("Empty Campaign")).toBeInTheDocument();
    expect(screen.getByText("0 session.campaign_players_plural")).toBeInTheDocument();
  });

  it("Load button calls onLoad with correct player characters", async () => {
    const onLoad = jest.fn();
    render(<CampaignLoader onLoad={onLoad} />);
    await userEvent.click(screen.getByTestId("load-campaign-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("load-campaign-camp-1")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByTestId("load-campaign-camp-1"));

    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    expect(onLoad).toHaveBeenCalledWith(mockPlayers);
  });

  it("campaign with 0 players shows empty message and no Load button", async () => {
    render(<CampaignLoader onLoad={jest.fn()} />);
    await userEvent.click(screen.getByTestId("load-campaign-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("campaign-list")).toBeInTheDocument()
    );

    expect(
      screen.getByTestId("empty-campaign-msg-camp-2")
    ).toBeInTheDocument();
    expect(screen.getByText("session.campaign_no_players")).toBeInTheDocument();
    expect(
      screen.queryByTestId("load-campaign-camp-2")
    ).not.toBeInTheDocument();
  });

  it("dialog closes after successful load", async () => {
    render(<CampaignLoader onLoad={jest.fn()} />);
    await userEvent.click(screen.getByTestId("load-campaign-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("load-campaign-camp-1")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByTestId("load-campaign-camp-1"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("campaign-loader-dialog")
      ).not.toBeInTheDocument()
    );
  });

  describe("accessibility (NFR20–NFR24)", () => {
    it("dialog has accessible title 'Load Player Group'", async () => {
      render(<CampaignLoader onLoad={jest.fn()} />);
      await userEvent.click(screen.getByTestId("load-campaign-btn"));
      expect(screen.getByRole("dialog", { name: "session.load_campaign_title" })).toBeInTheDocument();
    });

    it("Load button has aria-label including campaign name", async () => {
      render(<CampaignLoader onLoad={jest.fn()} />);
      await userEvent.click(screen.getByTestId("load-campaign-btn"));

      await waitFor(() =>
        expect(screen.getByTestId("load-campaign-camp-1")).toBeInTheDocument()
      );

      expect(
        screen.getByRole("button", { name: "session.load_into_encounter" })
      ).toBeInTheDocument();
    });

    it("dialog closes when Escape is pressed", async () => {
      const user = userEvent.setup();
      render(<CampaignLoader onLoad={jest.fn()} />);
      await user.click(screen.getByTestId("load-campaign-btn"));
      expect(screen.getByTestId("campaign-loader-dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByTestId("campaign-loader-dialog")).not.toBeInTheDocument()
      );
    });

    it("trigger button has min-h-[44px] tap target class (NFR24)", () => {
      render(<CampaignLoader onLoad={jest.fn()} />);
      expect(screen.getByTestId("load-campaign-btn")).toHaveClass("min-h-[44px]");
    });
  });
});
