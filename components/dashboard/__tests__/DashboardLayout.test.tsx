import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardLayout } from "../DashboardLayout";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  usePathname: () => "/app/dashboard",
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
  soundboard: "Soundboard",
  settings: "Settings",
  profile: "Profile",
  nav_label: "Dashboard navigation",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardLayout", () => {
  it("renders sidebar and content area", () => {
    render(
      <DashboardLayout translations={translations}>
        <div data-testid="child-content">Hello Dashboard</div>
      </DashboardLayout>
    );

    // Sidebar is rendered
    expect(screen.getAllByText("Overview").length).toBeGreaterThanOrEqual(1);

    // Content area is rendered
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello Dashboard")).toBeInTheDocument();
  });

  it("renders both desktop sidebar and mobile bottom nav", () => {
    render(
      <DashboardLayout translations={translations}>
        <p>Content</p>
      </DashboardLayout>
    );

    const navs = screen.getAllByRole("navigation", {
      name: "Dashboard navigation",
    });
    expect(navs.length).toBe(2);
  });
});
