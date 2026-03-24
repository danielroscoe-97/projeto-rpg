import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignManager } from "./CampaignManager";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

const mockFrom = jest.fn().mockReturnValue(mockChain);

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

const defaultProps = {
  initialCampaigns,
  userId: "user-123",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  mockEq.mockResolvedValueOnce({ error: null });
}

function setupDeleteSuccess() {
  mockEq.mockResolvedValueOnce({ error: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockChain.insert.mockReturnThis();
  mockChain.update.mockReturnThis();
  mockChain.delete.mockReturnThis();
  mockChain.select.mockReturnThis();
  mockFrom.mockReturnValue(mockChain);
});

describe("CampaignManager", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders campaign list with names and player counts", () => {
    render(<CampaignManager {...defaultProps} />);
    expect(screen.getByText("The Lost Mines")).toBeInTheDocument();
    expect(screen.getByText("Curse of Strahd")).toBeInTheDocument();
    expect(screen.getByText("4 players")).toBeInTheDocument();
    expect(screen.getByText("0 players")).toBeInTheDocument();
  });

  it("renders 'New Campaign' button", () => {
    render(<CampaignManager {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /new campaign/i })
    ).toBeInTheDocument();
  });

  it("renders empty state when no campaigns", () => {
    render(
      <CampaignManager initialCampaigns={[]} userId="user-123" />
    );
    expect(screen.getByText(/no campaigns yet/i)).toBeInTheDocument();
  });

  // ── Create Campaign ────────────────────────────────────────────────────────

  it("shows create form when 'New Campaign' is clicked", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /new campaign/i })
    );
    expect(
      screen.getByPlaceholderText(/campaign name/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("keeps Save disabled when campaign name is empty", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /new campaign/i })
    );
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });

  it("enables Save when campaign name is entered", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /new campaign/i })
    );
    await userEvent.type(
      screen.getByPlaceholderText(/campaign name/i),
      "Dragon Campaign"
    );
    expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled();
  });

  it("calls supabase insert on save and adds campaign to list", async () => {
    setupInsertSuccess("new-id", "Dragon Campaign");
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /new campaign/i })
    );
    await userEvent.type(
      screen.getByPlaceholderText(/campaign name/i),
      "Dragon Campaign"
    );
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

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

  it("shows error message when insert fails", async () => {
    setupInsertError("Failed to create campaign");
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /new campaign/i })
    );
    await userEvent.type(
      screen.getByPlaceholderText(/campaign name/i),
      "Bad Campaign"
    );
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("alert")
      ).toBeInTheDocument();
    });
  });

  it("cancels create form without inserting", async () => {
    render(<CampaignManager {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /new campaign/i })
    );
    await userEvent.type(
      screen.getByPlaceholderText(/campaign name/i),
      "Temp Campaign"
    );
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.insert).not.toHaveBeenCalled();
    expect(
      screen.queryByPlaceholderText(/campaign name/i)
    ).not.toBeInTheDocument();
  });

  // ── Edit Campaign ──────────────────────────────────────────────────────────

  it("shows edit form pre-filled with campaign name on Edit click", async () => {
    render(<CampaignManager {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    await userEvent.click(editButtons[0]);

    const input = screen.getByDisplayValue("The Lost Mines");
    expect(input).toBeInTheDocument();
  });

  it("calls supabase update on edit save", async () => {
    setupUpdateSuccess();
    render(<CampaignManager {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    await userEvent.click(editButtons[0]);

    const input = screen.getByDisplayValue("The Lost Mines");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed Campaign");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockChain.update).toHaveBeenCalledWith({ name: "Renamed Campaign" });
      expect(mockEq).toHaveBeenCalledWith("id", "campaign-1");
    });
    await waitFor(() => {
      expect(screen.getByText("Renamed Campaign")).toBeInTheDocument();
    });
  });

  // ── Delete Campaign ────────────────────────────────────────────────────────

  it("shows inline confirmation when Delete is clicked", async () => {
    render(<CampaignManager {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("calls supabase delete on confirm and removes campaign from list", async () => {
    setupDeleteSuccess();
    render(<CampaignManager {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "campaign-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("The Lost Mines")).not.toBeInTheDocument();
    });
  });

  it("does NOT call delete on cancel", async () => {
    render(<CampaignManager {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.delete).not.toHaveBeenCalled();
    expect(screen.getByText("The Lost Mines")).toBeInTheDocument();
  });
});
