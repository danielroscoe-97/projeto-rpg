import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardSidebar } from "../DashboardSidebar";

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockPathname = "/app/dashboard";

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: {
      aside: React.forwardRef(
        (props: Record<string, unknown>, ref: React.Ref<HTMLElement>) =>
          React.createElement("aside", { ...props, ref })
      ),
      span: React.forwardRef(
        (props: Record<string, unknown>, ref: React.Ref<HTMLElement>) =>
          React.createElement("span", { ...props, ref })
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const translations = {
  overview: "Overview",
  campaigns: "Campaigns",
  combats: "Combats",
  characters: "Characters",
  compendium: "Compendium",
  soundboard: "Soundboard",
  settings: "Settings",
  profile: "Profile",
  nav_label: "Dashboard navigation",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardSidebar", () => {
  beforeEach(() => {
    mockPathname = "/app/dashboard";
  });

  it("renders all navigation items", () => {
    render(<DashboardSidebar translations={translations} />);

    // Both desktop and mobile navs exist — check all labels are present
    expect(screen.getAllByText("Overview").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Campaigns").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Combats").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Characters").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Soundboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
  });

  it("highlights the active route (Overview)", () => {
    mockPathname = "/app/dashboard";
    render(<DashboardSidebar translations={translations} />);

    // Find links with aria-current="page"
    const activeLinks = screen.getAllByRole("link", { current: "page" });
    expect(activeLinks.length).toBeGreaterThanOrEqual(1);
    // The active link should point to /app/dashboard
    expect(activeLinks[0]).toHaveAttribute("href", "/app/dashboard");
  });

  it("highlights Campaigns when on campaigns route", () => {
    mockPathname = "/app/dashboard/campaigns";
    render(<DashboardSidebar translations={translations} />);

    const activeLinks = screen.getAllByRole("link", { current: "page" });
    expect(activeLinks.length).toBeGreaterThanOrEqual(1);
    expect(activeLinks[0]).toHaveAttribute("href", "/app/dashboard/campaigns");
  });

  it("renders collapse toggle button on desktop sidebar", () => {
    render(<DashboardSidebar translations={translations} />);

    const collapseBtn = screen.getByLabelText("Collapse sidebar");
    expect(collapseBtn).toBeInTheDocument();
  });

  it("renders mobile bottom navigation", () => {
    render(<DashboardSidebar translations={translations} />);

    const navs = screen.getAllByRole("navigation", {
      name: "Dashboard navigation",
    });
    // Should have at least 2 navs (desktop sidebar + mobile bottom)
    expect(navs.length).toBe(2);
  });
});
