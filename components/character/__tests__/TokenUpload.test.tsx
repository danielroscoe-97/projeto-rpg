import React from "react";
import { render, screen } from "@testing-library/react";
import { TokenUpload } from "../TokenUpload";

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

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }) },
    storage: {
      from: () => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/avatar.png" } }),
      }),
    },
    from: () => ({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  characterId: "c1",
  characterName: "Gandalf",
  currentTokenUrl: null,
  onTokenUpdated: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TokenUpload", () => {
  it("renders dropzone", () => {
    render(<TokenUpload {...defaultProps} />);
    expect(screen.getByTestId("token-dropzone")).toBeInTheDocument();
  });

  it("renders upload dialog title", () => {
    render(<TokenUpload {...defaultProps} />);
    const elements = screen.getAllByText("character.upload_token");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows placeholder when no current token", () => {
    render(<TokenUpload {...defaultProps} />);
    expect(screen.queryByTestId("token-preview")).not.toBeInTheDocument();
  });

  it("shows preview when currentTokenUrl is provided", () => {
    render(
      <TokenUpload
        {...defaultProps}
        currentTokenUrl="https://example.com/token.png"
      />
    );
    const preview = screen.getByTestId("token-preview");
    expect(preview).toHaveAttribute("src", "https://example.com/token.png");
  });

  it("renders file input", () => {
    render(<TokenUpload {...defaultProps} />);
    expect(screen.getByTestId("token-file-input")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<TokenUpload {...defaultProps} open={false} />);
    expect(screen.queryByTestId("token-upload")).not.toBeInTheDocument();
  });

  it("displays drag and drop text", () => {
    render(<TokenUpload {...defaultProps} />);
    expect(screen.getByText("character.drag_drop")).toBeInTheDocument();
  });
});
