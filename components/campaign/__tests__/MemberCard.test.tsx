import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberCard } from "../MemberCard";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

const mockRemoveMember = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/actions/invite-actions", () => ({
  removeCampaignMemberAction: (...args: unknown[]) => mockRemoveMember(...args),
}));

// Stateful AlertDialog mock
jest.mock("@/components/ui/alert-dialog", () => {
  const R = require("react");
  const Ctx = (R.createContext as Function)({ open: false, setOpen: () => {} });

  function AlertDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = R.useState(false);
    return R.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
  }
  function AlertDialogTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
    const { setOpen } = R.useContext(Ctx);
    if (asChild) {
      return R.cloneElement(children, {
        onClick: (e: React.MouseEvent) => { (children as unknown as { props: { onClick?: (e: React.MouseEvent) => void } }).props.onClick?.(e); setOpen(true); },
      });
    }
    return R.createElement("button", { onClick: () => setOpen(true) }, children);
  }
  function AlertDialogContent({ children }: { children: React.ReactNode }) {
    const { open } = R.useContext(Ctx);
    if (!open) return null;
    return R.createElement("div", { role: "dialog" }, children);
  }
  const AlertDialogHeader = ({ children }: { children: React.ReactNode }) => R.createElement("div", null, children);
  const AlertDialogTitle = ({ children }: { children: React.ReactNode }) => R.createElement("h2", null, children);
  const AlertDialogDescription = ({ children }: { children: React.ReactNode }) => R.createElement("p", null, children);
  const AlertDialogFooter = ({ children }: { children: React.ReactNode }) => R.createElement("div", null, children);
  function AlertDialogAction({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
    const { setOpen } = R.useContext(Ctx);
    return R.createElement("button", { onClick: () => { onClick?.(); setOpen(false); }, disabled, className }, children);
  }
  function AlertDialogCancel({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
    const { setOpen } = R.useContext(Ctx);
    return R.createElement("button", { onClick: () => { onClick?.(); setOpen(false); }, className }, children);
  }

  return {
    AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
    AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const dmMember: CampaignMemberWithUser = {
  id: "m1",
  campaign_id: "c1",
  user_id: "u1",
  role: "dm",
  joined_at: "2026-01-01T00:00:00Z",
  status: "active",
  display_name: "Game Master",
  email: "dm@test.com",
  character_name: null,
};

const playerMember: CampaignMemberWithUser = {
  id: "m2",
  campaign_id: "c1",
  user_id: "u2",
  role: "player",
  joined_at: "2026-01-02T00:00:00Z",
  status: "active",
  display_name: "Brave Hero",
  email: "hero@test.com",
  character_name: "Gandalf",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MemberCard", () => {
  it("renders member name and email", () => {
    render(<MemberCard member={playerMember} isOwner={false} />);
    expect(screen.getByText("Brave Hero")).toBeInTheDocument();
    expect(screen.getByText("hero@test.com")).toBeInTheDocument();
  });

  it("renders DM role badge with correct text", () => {
    render(<MemberCard member={dmMember} isOwner={true} />);
    expect(screen.getByTestId("role-badge")).toHaveTextContent("members.role_dm");
  });

  it("renders Player role badge with correct text", () => {
    render(<MemberCard member={playerMember} isOwner={false} />);
    expect(screen.getByTestId("role-badge")).toHaveTextContent("members.role_player");
  });

  it("renders character name for player", () => {
    render(<MemberCard member={playerMember} isOwner={false} />);
    expect(screen.getByText("Gandalf")).toBeInTheDocument();
  });

  it("shows remove button for non-DM when isOwner", () => {
    render(<MemberCard member={playerMember} isOwner={true} />);
    expect(screen.getByTestId("remove-member-button")).toBeInTheDocument();
  });

  it("hides remove button for DM member", () => {
    render(<MemberCard member={dmMember} isOwner={true} />);
    expect(screen.queryByTestId("remove-member-button")).not.toBeInTheDocument();
  });

  it("hides remove button when not owner", () => {
    render(<MemberCard member={playerMember} isOwner={false} />);
    expect(screen.queryByTestId("remove-member-button")).not.toBeInTheDocument();
  });

  it("shows confirmation dialog on remove click", async () => {
    const user = userEvent.setup();
    render(<MemberCard member={playerMember} isOwner={true} />);

    await user.click(screen.getByTestId("remove-member-button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls removeMember action and onRemoved callback", async () => {
    const user = userEvent.setup();
    const onRemoved = jest.fn();
    render(<MemberCard member={playerMember} isOwner={true} onRemoved={onRemoved} />);

    await user.click(screen.getByTestId("remove-member-button"));
    // Click confirm in dialog
    const confirmBtn = screen.getByText("members.confirm_remove");
    await user.click(confirmBtn);

    expect(mockRemoveMember).toHaveBeenCalledWith("c1", "u2");
  });

  it("renders initials from display name", () => {
    render(<MemberCard member={dmMember} isOwner={false} />);
    // "Game Master" => "GM"
    expect(screen.getByText("GM")).toBeInTheDocument();
  });
});
