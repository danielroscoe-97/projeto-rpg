import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterForm } from "../CharacterForm";

// Mock radix dialog to render inline
jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog");
  return {
    ...actual,
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div>{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Title: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    Close: () => null,
  };
});

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onSave: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CharacterForm", () => {
  it("renders form fields", () => {
    render(<CharacterForm {...defaultProps} />);
    expect(screen.getByTestId("char-name")).toBeInTheDocument();
    expect(screen.getByTestId("char-race")).toBeInTheDocument();
    expect(screen.getByTestId("char-class")).toBeInTheDocument();
    expect(screen.getByTestId("char-level")).toBeInTheDocument();
    expect(screen.getByTestId("char-hp")).toBeInTheDocument();
    expect(screen.getByTestId("char-ac")).toBeInTheDocument();
    expect(screen.getByTestId("char-notes")).toBeInTheDocument();
  });

  it("shows create title when no character provided", () => {
    render(<CharacterForm {...defaultProps} />);
    expect(screen.getByText("character.create")).toBeInTheDocument();
  });

  it("shows edit title when character provided", () => {
    const character = {
      id: "c1",
      campaign_id: "camp1",
      name: "Aragorn",
      max_hp: 50,
      current_hp: 50,
      ac: 16,
      spell_save_dc: null,
      dm_notes: "",
      race: "Human",
      class: "Ranger",
      level: 10,
      notes: "A king in exile",
      token_url: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    render(<CharacterForm {...defaultProps} character={character} />);
    expect(screen.getByText("character.edit")).toBeInTheDocument();
  });

  it("disables submit when name is empty", () => {
    render(<CharacterForm {...defaultProps} />);
    const submitBtn = screen.getByTestId("char-submit");
    expect(submitBtn).toBeDisabled();
  });

  it("calls onSave with form data on submit", async () => {
    const user = userEvent.setup();
    render(<CharacterForm {...defaultProps} />);

    await user.type(screen.getByTestId("char-name"), "Legolas");
    await user.click(screen.getByTestId("char-submit"));

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Legolas",
        level: 1,
      })
    );
  });

  it("renders race options from SRD data", () => {
    render(<CharacterForm {...defaultProps} />);
    const raceSelect = screen.getByTestId("char-race") as HTMLSelectElement;
    // Should have at least the placeholder + some race options
    expect(raceSelect.options.length).toBeGreaterThan(1);
  });

  it("renders class options from SRD data", () => {
    render(<CharacterForm {...defaultProps} />);
    const classSelect = screen.getByTestId("char-class") as HTMLSelectElement;
    expect(classSelect.options.length).toBeGreaterThan(1);
  });

  it("does not render when open is false", () => {
    render(<CharacterForm {...defaultProps} open={false} />);
    expect(screen.queryByTestId("character-form")).not.toBeInTheDocument();
  });
});
