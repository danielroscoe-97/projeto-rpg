import React from "react";
import { render, screen } from "@testing-library/react";
import { UserProfile } from "../UserProfile";

// Mock subscription store
jest.mock("@/lib/stores/subscription-store", () => ({
  useSubscriptionStore: () => ({
    plan: "free",
    status: null,
    subscription: null,
  }),
}));

// Mock supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      updateUser: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("UserProfile", () => {
  it("renders user email", () => {
    render(
      <UserProfile email="test@example.com" displayName="John Doe" avatarUrl={null} />
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders display name", () => {
    render(
      <UserProfile email="test@example.com" displayName="John Doe" avatarUrl={null} />
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders initials when no avatar url", () => {
    render(
      <UserProfile email="test@example.com" displayName="John Doe" avatarUrl={null} />
    );
    expect(screen.getByTestId("user-avatar-initials")).toHaveTextContent("JD");
  });

  it("renders avatar image when url provided", () => {
    render(
      <UserProfile
        email="test@example.com"
        displayName="John Doe"
        avatarUrl="https://example.com/avatar.jpg"
      />
    );
    expect(screen.getByTestId("user-avatar-img")).toBeInTheDocument();
  });

  it("renders plan badge", () => {
    render(
      <UserProfile email="test@example.com" displayName="John Doe" avatarUrl={null} />
    );
    expect(screen.getByTestId("plan-badge-free")).toBeInTheDocument();
  });

  it("renders upgrade button for free plan", () => {
    render(
      <UserProfile email="test@example.com" displayName="John Doe" avatarUrl={null} />
    );
    expect(screen.getByTestId("upgrade-btn")).toBeInTheDocument();
  });

  it("renders edit name button", () => {
    render(
      <UserProfile email="test@example.com" displayName="John Doe" avatarUrl={null} />
    );
    expect(screen.getByTestId("edit-name-btn")).toBeInTheDocument();
  });
});
