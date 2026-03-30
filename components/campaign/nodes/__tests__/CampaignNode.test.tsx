import React from "react";
import { render, screen } from "@testing-library/react";

// Mock @xyflow/react
jest.mock("@xyflow/react", () => ({
  Handle: () => <div data-testid="handle" />,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

import { CampaignNode } from "../CampaignNode";

describe("CampaignNode", () => {
  it("renders the campaign name", () => {
    render(<CampaignNode data={{ label: "Dragon's Lair" }} />);
    expect(screen.getByText("Dragon's Lair")).toBeInTheDocument();
  });

  it("renders with amber border styling", () => {
    const { container } = render(
      <CampaignNode data={{ label: "Test Campaign" }} />
    );
    const node = container.firstElementChild;
    expect(node?.className).toContain("border-amber-400");
  });
});
