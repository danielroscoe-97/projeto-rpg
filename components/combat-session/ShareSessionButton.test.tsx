/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareSessionButton } from "./ShareSessionButton";
import * as sessionToken from "@/lib/supabase/session-token";

jest.mock("@/lib/supabase/session-token", () => ({
  createSessionToken: jest.fn(),
}));

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

const mockCreate = sessionToken.createSessionToken as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ShareSessionButton", () => {
  it("renders the generate button initially", () => {
    render(<ShareSessionButton sessionId="s1" />);
    expect(screen.getByTestId("share-session-generate")).toBeInTheDocument();
    expect(screen.getByText("session.share_button")).toBeInTheDocument();
  });

  it("generates a link and shows URL + copy button on click", async () => {
    mockCreate.mockResolvedValue({
      token: "abc123",
      joinUrl: "http://localhost:3000/join/abc123",
    });
    const user = userEvent.setup();

    render(<ShareSessionButton sessionId="s1" />);
    await user.click(screen.getByTestId("share-session-generate"));

    await waitFor(() => {
      expect(screen.getByTestId("share-session-url")).toBeInTheDocument();
    });
    expect(screen.getByTestId("share-session-url")).toHaveValue(
      "http://localhost:3000/join/abc123"
    );
    expect(screen.getByTestId("share-session-copy")).toBeInTheDocument();
  });

  it("shows Copied! text after generating link", async () => {
    mockCreate.mockResolvedValue({
      token: "abc123",
      joinUrl: "http://localhost:3000/join/abc123",
    });
    const user = userEvent.setup();

    render(<ShareSessionButton sessionId="s1" />);
    await user.click(screen.getByTestId("share-session-generate"));

    await waitFor(() => {
      expect(screen.getByText("common.copied")).toBeInTheDocument();
    });
  });

  it("shows error on failure", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    const user = userEvent.setup();

    render(<ShareSessionButton sessionId="s1" />);
    await user.click(screen.getByTestId("share-session-generate"));

    await waitFor(() => {
      expect(screen.getByTestId("share-session-error")).toBeInTheDocument();
    });
  });
});
