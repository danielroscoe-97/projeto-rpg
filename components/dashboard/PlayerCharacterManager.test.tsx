import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerCharacterManager } from "./PlayerCharacterManager";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

const baseCharacter = {
  id: "char-1",
  campaign_id: "campaign-1",
  name: "Thorin",
  max_hp: 45,
  current_hp: 45,
  ac: 16,
  spell_save_dc: 14,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const secondCharacter = {
  id: "char-2",
  campaign_id: "campaign-1",
  name: "Gandalf",
  max_hp: 60,
  current_hp: 50,
  ac: 12,
  spell_save_dc: null,
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const defaultProps = {
  initialCharacters: [baseCharacter, secondCharacter],
  campaignId: "campaign-1",
  campaignName: "The Lost Mines",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupInsertSuccess(data = { ...baseCharacter, id: "char-new" }) {
  mockSingle.mockResolvedValueOnce({ data, error: null });
}

function setupInsertError(message = "Database error") {
  mockSingle.mockResolvedValueOnce({ data: null, error: { message } });
}

function setupUpdateSuccess() {
  // .eq("id", ...) returns chain; .eq("campaign_id", ...) is the terminal call
  mockEq.mockReturnValueOnce(mockChain);
  mockEq.mockResolvedValueOnce({ error: null });
}

function setupDeleteSuccess() {
  // .eq("id", ...) returns chain; .eq("campaign_id", ...) is the terminal call
  mockEq.mockReturnValueOnce(mockChain);
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

describe("PlayerCharacterManager", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders list of characters with stats", () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    expect(screen.getByText("Thorin")).toBeInTheDocument();
    expect(screen.getByText("Gandalf")).toBeInTheDocument();
    // max_hp, current_hp, ac
    expect(screen.getAllByText("45")).toHaveLength(2); // max_hp and current_hp both 45 for Thorin
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    // Gandalf has no spell_save_dc → badge is not rendered
    expect(screen.getByText("14")).toBeInTheDocument(); // Thorin's DC renders
  });

  it("renders 'Add Player' button", () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    expect(screen.getByRole("button", { name: /dashboard\.pc_add/i })).toBeInTheDocument();
  });

  it("renders empty state when no characters", () => {
    render(
      <PlayerCharacterManager
        initialCharacters={[]}
        campaignId="campaign-1"
        campaignName="Test"
      />
    );
    expect(screen.getByText(/dashboard\.pc_empty/i)).toBeInTheDocument();
  });

  // ── Add Player ─────────────────────────────────────────────────────────────

  it("'Add Player' button shows inline form", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    expect(screen.getByLabelText(/dashboard\.pc_name_label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dashboard\.pc_hp_label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dashboard\.pc_ac_label/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^common\.save$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("Save disabled when required fields are empty", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    expect(screen.getByRole("button", { name: /^common\.save$/i })).toBeDisabled();
  });

  it("valid add form calls supabase insert", async () => {
    setupInsertSuccess({ ...baseCharacter, id: "char-new", name: "Aragorn" });
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));

    await userEvent.type(screen.getByLabelText(/dashboard\.pc_name_label/i), "Aragorn");
    await userEvent.type(screen.getByLabelText(/dashboard\.pc_hp_label/i), "55");
    await userEvent.type(screen.getByLabelText(/dashboard\.pc_ac_label/i), "18");

    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("player_characters");
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Aragorn",
          max_hp: 55,
          current_hp: 55,
          ac: 18,
        })
      );
    });
  });

  it("new character appears in list after successful save", async () => {
    setupInsertSuccess({
      ...baseCharacter,
      id: "char-new",
      name: "Aragorn",
      max_hp: 55,
      current_hp: 55,
      ac: 18,
      spell_save_dc: null,
    });
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));

    await userEvent.type(screen.getByLabelText(/dashboard\.pc_name_label/i), "Aragorn");
    await userEvent.type(screen.getByLabelText(/dashboard\.pc_hp_label/i), "55");
    await userEvent.type(screen.getByLabelText(/dashboard\.pc_ac_label/i), "18");

    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(screen.getByText("Aragorn")).toBeInTheDocument();
    });
  });

  // ── Edit ───────────────────────────────────────────────────────────────────

  it("Edit button shows form pre-filled with character data", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editButtons[0]);

    expect(screen.getByDisplayValue("Thorin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    expect(screen.getByDisplayValue("16")).toBeInTheDocument();
    expect(screen.getByDisplayValue("14")).toBeInTheDocument();
  });

  it("update calls supabase update with correct payload", async () => {
    setupUpdateSuccess();
    render(<PlayerCharacterManager {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editButtons[0]);

    const nameInput = screen.getByDisplayValue("Thorin");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Thorin Oakenshield");

    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Thorin Oakenshield" })
      );
      expect(mockEq).toHaveBeenCalledWith("id", "char-1");
    });
  });

  it("updated name appears in list after edit save", async () => {
    setupUpdateSuccess();
    render(<PlayerCharacterManager {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editButtons[0]);

    const nameInput = screen.getByDisplayValue("Thorin");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Thorin Oakenshield");

    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(screen.getByText("Thorin Oakenshield")).toBeInTheDocument();
    });
  });

  it("Cancel on edit discards changes", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /^common\.edit$/i });
    await userEvent.click(editButtons[0]);

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.update).not.toHaveBeenCalled();
    expect(screen.getByText("Thorin")).toBeInTheDocument();
  });

  // ── Remove ─────────────────────────────────────────────────────────────────

  it("Remove button shows confirmation", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await userEvent.click(removeButtons[0]);

    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByText(/dashboard\.pc_remove_confirm_suffix/i)).toBeInTheDocument();
  });

  it("confirm remove calls supabase delete and removes character from list", async () => {
    setupDeleteSuccess();
    render(<PlayerCharacterManager {...defaultProps} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await userEvent.click(removeButtons[0]);
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "char-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Thorin")).not.toBeInTheDocument();
    });
  });

  it("Cancel on remove does NOT delete", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await userEvent.click(removeButtons[0]);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockChain.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Thorin")).toBeInTheDocument();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("shows error when insert fails", async () => {
    setupInsertError("Failed to add");
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));

    await userEvent.type(screen.getByLabelText(/dashboard\.pc_name_label/i), "Legolas");
    await userEvent.type(screen.getByLabelText(/dashboard\.pc_hp_label/i), "40");
    await userEvent.type(screen.getByLabelText(/dashboard\.pc_ac_label/i), "15");

    await userEvent.click(screen.getByRole("button", { name: /^common\.save$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
