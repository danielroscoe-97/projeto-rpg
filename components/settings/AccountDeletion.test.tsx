import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDeletion } from "./AccountDeletion";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupFetchSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true }),
  });
}

function setupFetchFailure(errorMessage = "Failed to delete account") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: errorMessage }),
  });
}

async function openDialog() {
  const user = userEvent.setup();
  render(<AccountDeletion />);
  await user.click(screen.getByRole("button", { name: /settings\.delete_button/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
});

describe("AccountDeletion", () => {
  it("renders the Delete Account button", () => {
    render(<AccountDeletion />);
    expect(
      screen.getByRole("button", { name: /settings\.delete_button/i })
    ).toBeInTheDocument();
  });

  it("opens the confirmation dialog when the button is clicked", async () => {
    await openDialog();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows the warning text in the confirmation dialog", async () => {
    await openDialog();
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/settings\.delete_confirm_description/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/settings\.delete_confirm_warning/i)).toBeInTheDocument();
  });

  it("closes the dialog and does NOT call the API when Cancel is clicked", async () => {
    const user = userEvent.setup();
    await openDialog();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POSTs to /api/account/delete, signs out, and navigates to / on confirm", async () => {
    setupFetchSuccess();
    const user = userEvent.setup();
    await openDialog();
    await user.click(
      screen.getByRole("button", { name: /settings\.delete_confirm_button/i })
    );
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/account/delete",
      { method: "POST" }
    ));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });

  it("shows loading state while deletion is in progress", async () => {
    // Never resolves during this test
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    await openDialog();
    await user.click(
      screen.getByRole("button", { name: /settings\.delete_confirm_button/i })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /settings\.delete_deleting/i })
      ).toBeDisabled()
    );
  });

  it("shows an inline error message if the API returns an error", async () => {
    setupFetchFailure("Server error");
    const user = userEvent.setup();
    await openDialog();
    await user.click(
      screen.getByRole("button", { name: /settings\.delete_confirm_button/i })
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Server error")
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
