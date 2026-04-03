import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickActions } from "../QuickActions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock("@/lib/supabase/campaign-npcs", () => ({
  createNpc: jest.fn(),
}));

const translations = {
  quick_actions: "Quick Actions",
  new_combat: "New Combat",
  create_npc: "Create NPC",
  invite_player: "Invite Player",
  npc_dialog_title: "Where to create the NPC?",
  npc_global_title: "Global NPC",
  npc_global_desc: "Available across all campaigns",
  npc_for_campaign: "For campaign",
  npc_created_success: "NPC created!",
  invite_dialog_title: "Invite to which campaign?",
  no_campaigns_yet: "No campaigns yet",
  no_campaigns_create: "Create a campaign first",
  no_campaigns_cta: "Create campaign →",
  npc_global_badge: "Reusable",
  campaigns_players_plural: "players",
  campaigns_players_singular: "player",
};

const campaigns = [
  { id: "c1", name: "Krynn", player_count: 5 },
  { id: "c2", name: "Aventura Epica", player_count: 3 },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("QuickActions", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders all 3 action buttons", () => {
    render(<QuickActions translations={translations} campaigns={campaigns} />);

    expect(screen.getByText("New Combat")).toBeInTheDocument();
    expect(screen.getByText("Create NPC")).toBeInTheDocument();
    expect(screen.getByText("Invite Player")).toBeInTheDocument();
  });

  it("renders the section title", () => {
    render(<QuickActions translations={translations} campaigns={campaigns} />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("New Combat links to /app/session/new", () => {
    render(<QuickActions translations={translations} campaigns={campaigns} />);

    const link = screen.getByText("New Combat").closest("a");
    expect(link).toHaveAttribute("href", "/app/session/new");
  });

  it("Create NPC opens scope dialog", () => {
    render(<QuickActions translations={translations} campaigns={campaigns} />);

    fireEvent.click(screen.getByTestId("quick-action-create_npc"));
    expect(screen.getByText("Where to create the NPC?")).toBeInTheDocument();
    expect(screen.getByText("Global NPC")).toBeInTheDocument();
    expect(screen.getByText("Krynn")).toBeInTheDocument();
  });

  it("Invite Player with single campaign navigates directly", () => {
    render(
      <QuickActions
        translations={translations}
        campaigns={[campaigns[0]]}
      />,
    );

    fireEvent.click(screen.getByTestId("quick-action-invite_player"));
    expect(mockPush).toHaveBeenCalledWith("/app/campaigns/c1");
  });

  it("Invite Player with multiple campaigns opens picker dialog", () => {
    render(<QuickActions translations={translations} campaigns={campaigns} />);

    fireEvent.click(screen.getByTestId("quick-action-invite_player"));
    expect(screen.getByText("Invite to which campaign?")).toBeInTheDocument();
    expect(screen.getByText("Krynn")).toBeInTheDocument();
    expect(screen.getByText("Aventura Epica")).toBeInTheDocument();
  });

  it("Invite Player with zero campaigns shows empty state", () => {
    render(<QuickActions translations={translations} campaigns={[]} />);

    fireEvent.click(screen.getByTestId("quick-action-invite_player"));
    expect(screen.getByText("No campaigns yet")).toBeInTheDocument();
    expect(screen.getByText("Create a campaign first")).toBeInTheDocument();
  });
});
