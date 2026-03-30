import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NpcCard } from "../NpcCard";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

const baseNpc: CampaignNpc = {
  id: "npc-1",
  campaign_id: "campaign-1",
  name: "Gandalf the Grey",
  description: "A wise wizard who helps the party.",
  stats: { hp: 80, ac: 15, cr: "5", initiative_mod: 2, notes: "Carries a staff" },
  avatar_url: null,
  is_visible_to_players: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const handlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onToggleVisibility: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NpcCard", () => {
  it("renders NPC name", () => {
    render(<NpcCard npc={baseNpc} {...handlers} />);
    expect(screen.getByText("Gandalf the Grey")).toBeInTheDocument();
  });

  it("renders stat badges when stats are present", () => {
    render(<NpcCard npc={baseNpc} {...handlers} />);
    expect(screen.getByTestId("npc-stat-hp")).toHaveTextContent("HP 80");
    expect(screen.getByTestId("npc-stat-ac")).toHaveTextContent("AC 15");
    expect(screen.getByTestId("npc-stat-cr")).toHaveTextContent("CR 5");
  });

  it("does not render stat badges when stats are empty", () => {
    const npc = { ...baseNpc, stats: {} };
    render(<NpcCard npc={npc} {...handlers} />);
    expect(screen.queryByTestId("npc-stat-hp")).not.toBeInTheDocument();
    expect(screen.queryByTestId("npc-stat-ac")).not.toBeInTheDocument();
    expect(screen.queryByTestId("npc-stat-cr")).not.toBeInTheDocument();
  });

  it("shows Eye icon when visible to players", () => {
    render(<NpcCard npc={baseNpc} {...handlers} />);
    const btn = screen.getByTestId("npc-visibility-npc-1");
    expect(btn).toBeInTheDocument();
  });

  it("shows EyeOff icon when hidden from players", () => {
    const npc = { ...baseNpc, is_visible_to_players: false };
    render(<NpcCard npc={npc} {...handlers} />);
    const btn = screen.getByTestId("npc-visibility-npc-1");
    expect(btn).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<NpcCard npc={baseNpc} {...handlers} />);
    await user.click(screen.getByTestId("npc-edit-npc-1"));
    expect(handlers.onEdit).toHaveBeenCalledWith(baseNpc);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<NpcCard npc={baseNpc} {...handlers} />);
    await user.click(screen.getByTestId("npc-delete-npc-1"));
    expect(handlers.onDelete).toHaveBeenCalledWith(baseNpc);
  });

  it("calls onToggleVisibility when visibility button is clicked", async () => {
    const user = userEvent.setup();
    render(<NpcCard npc={baseNpc} {...handlers} />);
    await user.click(screen.getByTestId("npc-visibility-npc-1"));
    expect(handlers.onToggleVisibility).toHaveBeenCalledWith(baseNpc);
  });

  it("renders avatar image when avatar_url is provided", () => {
    const npc = { ...baseNpc, avatar_url: "https://example.com/avatar.png" };
    render(<NpcCard npc={npc} {...handlers} />);
    const img = screen.getByAltText("Gandalf the Grey");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("renders placeholder when no avatar_url", () => {
    render(<NpcCard npc={baseNpc} {...handlers} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
