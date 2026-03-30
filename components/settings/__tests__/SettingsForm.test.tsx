import React from "react";
import { render, screen } from "@testing-library/react";
import { SettingsForm } from "../SettingsForm";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("SettingsForm", () => {
  it("renders the settings form container", () => {
    render(<SettingsForm />);
    expect(screen.getByTestId("settings-form")).toBeInTheDocument();
  });

  it("renders language select", () => {
    render(<SettingsForm />);
    expect(screen.getByTestId("language-select")).toBeInTheDocument();
  });

  it("renders language options", () => {
    render(<SettingsForm />);
    const select = screen.getByTestId("language-select") as HTMLSelectElement;
    expect(select.options.length).toBe(2);
  });

  it("renders theme buttons", () => {
    render(<SettingsForm />);
    expect(screen.getByTestId("theme-dark")).toBeInTheDocument();
    expect(screen.getByTestId("theme-light")).toBeInTheDocument();
    expect(screen.getByTestId("theme-system")).toBeInTheDocument();
  });

  it("renders notification toggles", () => {
    render(<SettingsForm />);
    expect(screen.getByTestId("notif-turn")).toBeInTheDocument();
    expect(screen.getByTestId("notif-session")).toBeInTheDocument();
  });
});
