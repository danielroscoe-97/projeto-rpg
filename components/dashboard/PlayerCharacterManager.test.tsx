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

// Mock child components to isolate PlayerCharacterManager logic
let mockFormOnSave: ((data: unknown) => Promise<void>) | null = null;
let mockFormOpen = false;
let mockFormCharacter: unknown = null;

jest.mock("@/components/character/CharacterForm", () => ({
  CharacterForm: ({
    open,
    onOpenChange,
    character,
    onSave,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    character?: unknown;
    onSave: (data: unknown) => Promise<void>;
  }) => {
    const [formError, setFormError] = React.useState<string | null>(null);
    mockFormOpen = open;
    mockFormOnSave = onSave;
    mockFormCharacter = character ?? null;
    if (!open) return null;
    return (
      <div data-testid="character-form">
        {formError && <p role="alert">{formError}</p>}
        <span data-testid="form-mode">{character ? "edit" : "add"}</span>
        <button
          onClick={async () => {
            try {
              await onSave({
                name: "Test Character",
                race: null,
                class: null,
                level: 1,
                max_hp: 30,
                ac: 14,
                spell_save_dc: null,
                notes: null,
              });
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Save failed");
            }
          }}
        >
          Save Character
        </button>
        <button onClick={() => { setFormError(null); onOpenChange(false); }}>Cancel Form</button>
      </div>
    );
  },
}));

jest.mock("@/components/character/CharacterCard", () => ({
  CharacterCard: ({
    character,
    onClick,
    onUploadToken,
  }: {
    character: { id: string; name: string; max_hp: number; ac: number };
    onClick?: () => void;
    onUploadToken?: () => void;
  }) => (
    <div
      data-testid={`char-card-${character.id}`}
      onClick={onClick}
      role="button"
      aria-label={character.name}
    >
      <span>{character.name}</span>
      <span>HP {character.max_hp}</span>
      <span>AC {character.ac}</span>
      {onUploadToken && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUploadToken();
          }}
        >
          Upload Token
        </button>
      )}
    </div>
  ),
}));

jest.mock("@/components/character/TokenUpload", () => ({
  TokenUpload: ({
    open,
    onOpenChange,
    onTokenUpdated,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onTokenUpdated: (url: string) => void;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="token-upload">
        <button onClick={() => onTokenUpdated("https://example.com/token.png")}>
          Confirm Upload
        </button>
        <button onClick={() => onOpenChange(false)}>Close Upload</button>
      </div>
    );
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseCharacter = {
  id: "char-1",
  campaign_id: "campaign-1",
  name: "Thorin",
  max_hp: 45,
  current_hp: 45,
  ac: 16,
  spell_save_dc: 14 as number | null,
  dm_notes: "",
  token_url: null as string | null,
  race: null as string | null,
  class: null as string | null,
  level: null as number | null,
  notes: null as string | null,
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
  spell_save_dc: null as number | null,
  dm_notes: "",
  token_url: null as string | null,
  race: null as string | null,
  class: null as string | null,
  level: null as number | null,
  notes: null as string | null,
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
  mockEq.mockReturnValueOnce(mockChain);
  mockEq.mockResolvedValueOnce({ error: null });
}

function setupDeleteSuccess() {
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
  mockFormOpen = false;
  mockFormOnSave = null;
  mockFormCharacter = null;
});

describe("PlayerCharacterManager", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders character cards with names", () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    expect(screen.getByText("Thorin")).toBeInTheDocument();
    expect(screen.getByText("Gandalf")).toBeInTheDocument();
  });

  it("renders HP and AC for each character", () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    expect(screen.getByText("HP 45")).toBeInTheDocument();
    expect(screen.getByText("AC 16")).toBeInTheDocument();
    expect(screen.getByText("HP 60")).toBeInTheDocument();
    expect(screen.getByText("AC 12")).toBeInTheDocument();
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

  // ── Add Character ───────────────────────────────────────────────────────────

  it("'Add Player' button opens CharacterForm in add mode", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    expect(screen.getByTestId("character-form")).toBeInTheDocument();
    expect(screen.getByTestId("form-mode")).toHaveTextContent("add");
  });

  it("saving via CharacterForm calls supabase insert", async () => {
    setupInsertSuccess({ ...baseCharacter, id: "char-new", name: "Test Character" });
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    await userEvent.click(screen.getByRole("button", { name: /Save Character/i }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("player_characters");
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Character",
          max_hp: 30,
          current_hp: 30,
          ac: 14,
        })
      );
    });
  });

  it("new character appears in list after successful save", async () => {
    setupInsertSuccess({
      ...baseCharacter,
      id: "char-new",
      name: "Test Character",
      max_hp: 30,
      current_hp: 30,
      ac: 14,
    });
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    await userEvent.click(screen.getByRole("button", { name: /Save Character/i }));

    await waitFor(() => {
      expect(screen.getByText("Test Character")).toBeInTheDocument();
    });
  });

  it("Cancel on CharacterForm closes form without inserting", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel Form/i }));

    expect(mockChain.insert).not.toHaveBeenCalled();
    expect(screen.queryByTestId("character-form")).not.toBeInTheDocument();
  });

  // ── Edit Character ──────────────────────────────────────────────────────────

  it("clicking character card opens CharacterForm in edit mode", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByTestId("char-card-char-1"));
    expect(screen.getByTestId("character-form")).toBeInTheDocument();
    expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
  });

  it("saving edit calls supabase update with correct id", async () => {
    setupUpdateSuccess();
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByTestId("char-card-char-1"));
    await userEvent.click(screen.getByRole("button", { name: /Save Character/i }));

    await waitFor(() => {
      expect(mockChain.update).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "char-1");
    });
  });

  // ── Remove Character ────────────────────────────────────────────────────────

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

  // ── Token Upload ────────────────────────────────────────────────────────────

  it("Upload Token button opens TokenUpload dialog", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    const uploadButtons = screen.getAllByRole("button", { name: /Upload Token/i });
    await userEvent.click(uploadButtons[0]);
    expect(screen.getByTestId("token-upload")).toBeInTheDocument();
  });

  it("after token upload, character token_url is updated in list", async () => {
    render(<PlayerCharacterManager {...defaultProps} />);
    const uploadButtons = screen.getAllByRole("button", { name: /Upload Token/i });
    await userEvent.click(uploadButtons[0]);
    await userEvent.click(screen.getByRole("button", { name: /Confirm Upload/i }));

    expect(screen.queryByTestId("token-upload")).not.toBeInTheDocument();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("shows error when insert fails", async () => {
    setupInsertError("Failed to add");
    render(<PlayerCharacterManager {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /dashboard\.pc_add/i }));
    await userEvent.click(screen.getByRole("button", { name: /Save Character/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
