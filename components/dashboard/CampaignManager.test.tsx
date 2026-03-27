import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignManager } from "./CampaignManager";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Stateful AlertDialog mock that simulates open/close behaviour in JSDOM
jest.mock("@/components/ui/alert-dialog", () => {
  const React = require("react");

  const Ctx = (React.createContext as Function)({
    open: false,
    setOpen: () => {},
  });

  function AlertDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return React.createElement(Ctx.Provider, { value: { open, setOpen } }, children);
  }

  function AlertDialogTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
    const { setOpen } = React.useContext(Ctx);
    if (asChild) {
      return React.cloneElement(children, {
        onClick: (e: React.MouseEvent) => {
          (children as any).props.onClick?.(e);
          setOpen(true);
        },
      });
    }
    return React.createElement("button", { onClick: () => setOpen(true) }, children);
  }

  function AlertDialogContent({ children }: { children: React.ReactNode }) {
    const { open } = React.useContext(Ctx);
    if (!open) return null;
    return React.createElement("div", { role: "dialog" }, children);
  }

  const AlertDialogHeader = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);
  const AlertDialogTitle = ({ children }: { children: React.ReactNode }) =>
    React.createElement("h2", null, children);
  const AlertDialogDescription = ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children);
  const AlertDialogFooter = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children);

  function AlertDialogAction({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) {
    const { setOpen } = React.useContext(Ctx);
    return React.createElement(
      "button",
      {
        onClick: () => { onClick?.(); setOpen(false); },
        disabled,
        className,
      },
      children
    );
  }

  function AlertDialogCancel({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) {
    const { setOpen } = React.useContext(Ctx);
    return React.createElement(
      "button",
      {
        onClick: () => { onClick?.(); setOpen(false); },
        className,
      },
      children
    );
  }

  return {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
  };
});

const mockFrom = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();

const mockChain = {
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: mockEq,
  single: mockSingle,
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const initialCampaigns = [
  {
    id: "campaign-1",
    name: "The Lost Mines",
    created_at: "2026-01-01T00:00:00Z",
    player_count: 4,
  },
  {
    id: "campaign-2",
    name: "Curse of Strahd",
    created_at: "2026-01-02T00:00:00Z",
    player_count: 0,
  },
];

const defaultProps = { initialCampaigns, userId: "user-123" };

// ── Setup helpers ─────────────────────────────────────────────────────────────

function setupInsertSuccess(id = "new-campaign-id", name = "New Campaign") {
  mockSingle.mockResolvedValueOnce({
    data: { id, name, created_at: "2026-03-01T00:00:00Z" },
    error: null,
  });
}

function setupInsertError(message = "Database error") {
  mockSingle.mockResolvedValueOnce({ data: null, error: { message } });
}

function setupUpdateSuccess() {
  // .eq("id", ...) returns chain; .eq("owner_id", ...) resolves with result
  mockEq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null });
}

function setupDeleteSuccess() {
  // .eq("id", ...) returns chain; .eq("owner_id", ...) resolves with result
  mockEq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChain.insert.mockReturnThis();
  mockChain.update.mockReturnThis();
  mockChain.delete.mockReturnThis();
  mockChain.select.mockReturnThis();
  mockEq.mockReturnThis();
  mockFrom.mockReturnValue(mockChain);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CampaignManager", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders campaign list with names and player counts", () => {
    render(<CampaignManager {...defaultProps} />);
    expect(screen.getByText("The Lost Mines")).toBeInTheDocument();
    expect(screen.getByText("Curse of Strahd")).toBeInTheDocument();
    expect(screen.getByText("4 dashboard.campaigns_players_plural")).toBeInTheDocument();
    expect(screen.getByText("0 dashboard.campaigns_players_plural")).toBeInTheDocument();
  });

  it("renders 'New Campaign' button", () => {
    render(<CampaignManager {...defaultProps} />);
    expect(screen.getByRole("button", { name: /dashboard\.campaigns_new/i })).toBeInTheDocument();
  });

  it("renders empty state when no campaigns", () => {
    render(<CampaignManager initialCampaigns={[]} userId="user-123" />);
    expect(screen.getByText(/dashboard\.campaigns_empty/i)).toBeInTheDocument();
  });

  // ── Create Campaign ────────────────────────────────────────────────────────

  it("shows create form when 'New Campaign' is clicked", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    expect(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^common\.save$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("opening New Campaign closes any open edit row", async () => {
    render(<CampaignManager {...defaultProps} />);
    // open edit first
    const editBtns = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editBtns[0]);
    expect(screen.getByDisplayValue("The Lost Mines")).toBeInTheDocument();
    // open create — edit should disappear
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    expect(screen.queryByDisplayValue("The Lost Mines")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i)).toBeInTheDocument();
  });

  it("keeps Save disabled when campaign name is empty", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    expect(screen.getByRole("button", { name: /^common\.save$/i })).toBeDisabled();
  });

  it("enables Save when campaign name is entered", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    await userEvent.type(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i), "Dragon Campaign");
    expect(screen.getByRole("button", { name: /^common\.save$/i })).not.toBeDisabled();
  });

  it("calls supabase insert on save and adds campaign to list", async () => {
    setupInsertSuccess("new-id", "Dragon Campaign");
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    await userEvent.type(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i), "Dragon Campaign");
    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("campaigns");
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Dragon Campaign" })
      );
    });
    await waitFor(() => {
      expect(screen.getByText("Dragon Campaign")).toBeInTheDocument();
    });
  });

  it("shows error when insert fails", async () => {
    setupInsertError("Failed to create campaign");
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    await userEvent.type(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i), "Bad Campaign");
    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("cancels create form without inserting and clears error", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    await userEvent.type(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i), "Temp");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.insert).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText(/dashboard\.campaigns_name_label/i)).not.toBeInTheDocument();
  });

  // ── Edit Campaign ──────────────────────────────────────────────────────────

  it("shows edit form pre-filled with campaign name on Edit click", async () => {
    render(<CampaignManager {...defaultProps} />);
    const editBtns = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editBtns[0]);
    expect(screen.getByDisplayValue("The Lost Mines")).toBeInTheDocument();
  });

  it("opening Edit closes the create form", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_new/i }));
    expect(screen.getByPlaceholderText(/dashboard\.campaigns_name_label/i)).toBeInTheDocument();

    const editBtns = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editBtns[0]);
    expect(screen.queryByPlaceholderText(/dashboard\.campaigns_name_label/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("The Lost Mines")).toBeInTheDocument();
  });

  it("calls supabase update with owner_id filter on edit save", async () => {
    setupUpdateSuccess();
    render(<CampaignManager {...defaultProps} />);
    const editBtns = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editBtns[0]);

    const input = screen.getByDisplayValue("The Lost Mines");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed Campaign");
    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(mockChain.update).toHaveBeenCalledWith({ name: "Renamed Campaign" });
    });
    await waitFor(() => {
      expect(screen.getByText("Renamed Campaign")).toBeInTheDocument();
    });
  });

  it("cancels edit without updating", async () => {
    render(<CampaignManager {...defaultProps} />);
    const editBtns = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.update).not.toHaveBeenCalled();
    expect(screen.getByText("The Lost Mines")).toBeInTheDocument();
  });

  // ── Delete Campaign ────────────────────────────────────────────────────────

  it("shows confirmation dialog when Delete is clicked", async () => {
    render(<CampaignManager {...defaultProps} />);
    const deleteBtns = screen.getAllByRole("button", { name: /^common\.delete$/i });
    await userEvent.click(deleteBtns[0]);

    expect(screen.getByText(/dashboard\.campaigns_delete_confirm/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dashboard\.campaigns_delete_button/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls supabase delete with owner_id filter on confirm and removes from list", async () => {
    setupDeleteSuccess();
    render(<CampaignManager {...defaultProps} />);
    const deleteBtns = screen.getAllByRole("button", { name: /^common\.delete$/i });
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.campaigns_delete_button/i }));

    await waitFor(() => {
      expect(mockChain.delete).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText("The Lost Mines")).not.toBeInTheDocument();
    });
  });

  it("does NOT call delete on cancel", async () => {
    render(<CampaignManager {...defaultProps} />);
    const deleteBtns = screen.getAllByRole("button", { name: /^common\.delete$/i });
    await userEvent.click(deleteBtns[0]);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.delete).not.toHaveBeenCalled();
    expect(screen.getByText("The Lost Mines")).toBeInTheDocument();
  });
});
