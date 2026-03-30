import React from "react";
import { render, screen } from "@testing-library/react";
import { QuickActions } from "../QuickActions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const translations = {
  quick_actions: "Quick Actions",
  new_combat: "New Combat",
  create_npc: "Create NPC",
  invite_player: "Invite Player",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("QuickActions", () => {
  it("renders all 3 action buttons", () => {
    render(<QuickActions translations={translations} />);

    expect(screen.getByText("New Combat")).toBeInTheDocument();
    expect(screen.getByText("Create NPC")).toBeInTheDocument();
    expect(screen.getByText("Invite Player")).toBeInTheDocument();
  });

  it("renders the section title", () => {
    render(<QuickActions translations={translations} />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("New Combat links to /app/session/new", () => {
    render(<QuickActions translations={translations} />);

    const link = screen.getByText("New Combat").closest("a");
    expect(link).toHaveAttribute("href", "/app/session/new");
  });

  it("Create NPC links to /app/presets", () => {
    render(<QuickActions translations={translations} />);

    const link = screen.getByText("Create NPC").closest("a");
    expect(link).toHaveAttribute("href", "/app/presets");
  });

  it("Invite Player links to campaigns by default", () => {
    render(<QuickActions translations={translations} />);

    const link = screen.getByText("Invite Player").closest("a");
    expect(link).toHaveAttribute("href", "/app/dashboard/campaigns");
  });

  it("Invite Player links to specific campaign when campaignId provided", () => {
    render(
      <QuickActions translations={translations} campaignId="abc-123" />
    );

    const link = screen.getByText("Invite Player").closest("a");
    expect(link).toHaveAttribute("href", "/app/campaigns/abc-123");
  });
});
