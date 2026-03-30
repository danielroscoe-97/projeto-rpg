/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// Mock supabase client
const mockSignInWithOAuth = jest.fn().mockResolvedValue({ data: {}, error: null });
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

import { GoogleOAuthButton } from "../GoogleOAuthButton";

describe("GoogleOAuthButton", () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockClear();
  });

  it("renders with auth namespace by default", () => {
    render(<GoogleOAuthButton />);
    expect(screen.getByTestId("google-oauth-button")).toBeInTheDocument();
    expect(screen.getByText("auth.google_login")).toBeInTheDocument();
  });

  it("renders with guest namespace", () => {
    render(<GoogleOAuthButton namespace="guest" />);
    expect(screen.getByText("guest.upsell_google")).toBeInTheDocument();
  });

  it("calls signInWithOAuth on click", async () => {
    render(<GoogleOAuthButton />);
    fireEvent.click(screen.getByTestId("google-oauth-button"));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({
          queryParams: expect.objectContaining({
            access_type: "offline",
            prompt: "consent",
          }),
        }),
      })
    );
  });

  it("accepts custom data-testid", () => {
    render(<GoogleOAuthButton data-testid="custom-google" />);
    expect(screen.getByTestId("custom-google")).toBeInTheDocument();
  });
});
