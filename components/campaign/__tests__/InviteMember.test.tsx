import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteMember } from "../InviteMember";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// Mock Dialog components
jest.mock("@/components/ui/dialog", () => {
  const R = require("react");
  const Ctx = (R.createContext as Function)({ open: false, setOpen: () => {} });

  function Dialog({ open: controlledOpen, onOpenChange, children }: {
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) {
    const [internalOpen, setInternalOpen] = R.useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;
    return R.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
  }

  function DialogTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
    const { setOpen } = R.useContext(Ctx);
    if (asChild) {
      return R.cloneElement(children, {
        onClick: (e: React.MouseEvent) => {
          (children as unknown as { props: { onClick?: (e: React.MouseEvent) => void } }).props.onClick?.(e);
          setOpen(true);
        },
      });
    }
    return R.createElement("button", { onClick: () => setOpen(true) }, children);
  }

  function DialogContent({ children }: { children: React.ReactNode }) {
    const { open } = R.useContext(Ctx);
    if (!open) return null;
    return R.createElement("div", { role: "dialog" }, children);
  }

  const DialogHeader = ({ children }: { children: React.ReactNode }) => R.createElement("div", null, children);
  const DialogTitle = ({ children }: { children: React.ReactNode }) => R.createElement("h2", null, children);

  return { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock clipboard
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("InviteMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "inv1", email: "pending@test.com", status: "pending", created_at: "2026-01-01", expires_at: "2026-01-08" },
          { id: "inv2", email: "accepted@test.com", status: "accepted", created_at: "2026-01-01", expires_at: "2026-01-08" },
        ],
      }),
    });
  });

  it("renders trigger button", () => {
    render(<InviteMember campaignId="c1" />);
    expect(screen.getByTestId("invite-member-trigger")).toBeInTheDocument();
  });

  it("opens dialog and shows invite link", async () => {
    const user = userEvent.setup();
    render(<InviteMember campaignId="c1" />);

    await user.click(screen.getByTestId("invite-member-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("invite-link-input")).toBeInTheDocument();
    });
  });

  it("copies link on button click", async () => {
    const { toast } = require("sonner");
    const user = userEvent.setup();
    render(<InviteMember campaignId="c1" />);

    await user.click(screen.getByTestId("invite-member-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("copy-link-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("copy-link-button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("members.link_copied");
    });
  });

  it("shows pending invites after loading", async () => {
    const user = userEvent.setup();
    render(<InviteMember campaignId="c1" />);

    await user.click(screen.getByTestId("invite-member-trigger"));

    await waitFor(() => {
      expect(screen.getByText("pending@test.com")).toBeInTheDocument();
    });

    // Only pending invites shown in the pending section
    expect(screen.getByTestId("pending-invites-list")).toBeInTheDocument();
  });

  it("revokes an invite", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: "inv1", email: "pending@test.com", status: "pending", created_at: "2026-01-01", expires_at: "2026-01-08" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { cancelled: true } }),
      });

    render(<InviteMember campaignId="c1" />);

    await user.click(screen.getByTestId("invite-member-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("revoke-invite-inv1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("revoke-invite-inv1"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("inviteId=inv1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
