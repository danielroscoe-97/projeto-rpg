import React from "react";
import { render, screen } from "@testing-library/react";
import { MembersList } from "../MembersList";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

jest.mock("@/lib/actions/invite-actions", () => ({
  getCampaignMembersAction: jest.fn().mockResolvedValue([]),
  removeCampaignMemberAction: jest.fn().mockResolvedValue(undefined),
}));

// Mock AlertDialog (needed by MemberCard)
jest.mock("@/components/ui/alert-dialog", () => {
  const R = require("react");
  const Ctx = (R.createContext as Function)({ open: false, setOpen: () => {} });
  function AlertDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = R.useState(false);
    return R.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
  }
  function AlertDialogTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
    const { setOpen } = R.useContext(Ctx);
    if (asChild) return R.cloneElement(children, { onClick: () => setOpen(true) });
    return R.createElement("button", { onClick: () => setOpen(true) }, children);
  }
  function AlertDialogContent({ children }: { children: React.ReactNode }) {
    const { open } = R.useContext(Ctx);
    if (!open) return null;
    return R.createElement("div", { role: "dialog" }, children);
  }
  const pass = ({ children }: { children: React.ReactNode }) => R.createElement("div", null, children);
  const btn = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    R.createElement("button", { onClick }, children);
  return {
    AlertDialog, AlertDialogTrigger, AlertDialogContent,
    AlertDialogHeader: pass, AlertDialogTitle: pass, AlertDialogDescription: pass,
    AlertDialogFooter: pass, AlertDialogAction: btn, AlertDialogCancel: btn,
  };
});

// Mock InvitePlayerDialog
jest.mock("../InvitePlayerDialog", () => ({
  InvitePlayerDialog: ({ campaignId }: { campaignId: string }) =>
    React.createElement("button", { "data-testid": "invite-dialog" }, `Invite ${campaignId}`),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockMembers: CampaignMemberWithUser[] = [
  {
    id: "m1",
    campaign_id: "c1",
    user_id: "u1",
    role: "dm",
    joined_at: "2026-01-01T00:00:00Z",
    status: "active",
    display_name: "DM User",
    email: "dm@test.com",
    character_name: null,
  },
  {
    id: "m2",
    campaign_id: "c1",
    user_id: "u2",
    role: "player",
    joined_at: "2026-01-02T00:00:00Z",
    status: "active",
    display_name: "Player One",
    email: "player1@test.com",
    character_name: "Aragorn",
  },
  {
    id: "m3",
    campaign_id: "c1",
    user_id: "u3",
    role: "player",
    joined_at: "2026-01-03T00:00:00Z",
    status: "active",
    display_name: "Player Two",
    email: "player2@test.com",
    character_name: null,
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MembersList", () => {
  it("renders all members when initialMembers provided", () => {
    render(
      <MembersList campaignId="c1" isOwner={true} initialMembers={mockMembers} />
    );

    expect(screen.getByTestId("members-list")).toBeInTheDocument();
    expect(screen.getByText("DM User")).toBeInTheDocument();
    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("Player Two")).toBeInTheDocument();
  });

  it("renders DM role badge for DM member", () => {
    render(
      <MembersList campaignId="c1" isOwner={false} initialMembers={mockMembers} />
    );

    const badges = screen.getAllByTestId("role-badge");
    expect(badges[0]).toHaveTextContent("members.role_dm");
    expect(badges[1]).toHaveTextContent("members.role_player");
  });

  it("shows empty state when no members", () => {
    render(
      <MembersList campaignId="c1" isOwner={true} initialMembers={[]} />
    );

    expect(screen.getByTestId("members-empty")).toBeInTheDocument();
    expect(screen.getByText("members.no_members")).toBeInTheDocument();
  });

  it("shows invite button when isOwner with members", () => {
    render(
      <MembersList campaignId="c1" isOwner={true} initialMembers={mockMembers} />
    );

    expect(screen.getByTestId("invite-dialog")).toBeInTheDocument();
  });

  it("hides invite button when not owner with members", () => {
    render(
      <MembersList campaignId="c1" isOwner={false} initialMembers={mockMembers} />
    );

    expect(screen.queryByTestId("invite-dialog")).not.toBeInTheDocument();
  });

  it("shows character name for player with character", () => {
    render(
      <MembersList campaignId="c1" isOwner={false} initialMembers={mockMembers} />
    );

    expect(screen.getByText("Aragorn")).toBeInTheDocument();
  });
});
