import React from "react";
import { render, screen } from "@testing-library/react";

// Mock @xyflow/react
jest.mock("@xyflow/react", () => ({
  Handle: () => <div data-testid="handle" />,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

import { NpcNode } from "../NpcNode";

describe("NpcNode", () => {
  it("renders the NPC name", () => {
    render(<NpcNode data={{ label: "Goblin King", hp: 45, ac: 16, npcId: "npc-1" }} />);
    expect(screen.getByText("Goblin King")).toBeInTheDocument();
  });

  it("renders HP and AC badges", () => {
    render(<NpcNode data={{ label: "Goblin King", hp: 45, ac: 16, npcId: "npc-1" }} />);
    expect(screen.getByText("HP 45")).toBeInTheDocument();
    expect(screen.getByText("AC 16")).toBeInTheDocument();
  });

  it("renders without badges when stats are missing", () => {
    render(<NpcNode data={{ label: "Mystery NPC", npcId: "npc-2" }} />);
    expect(screen.getByText("Mystery NPC")).toBeInTheDocument();
    expect(screen.queryByText(/HP/)).not.toBeInTheDocument();
    expect(screen.queryByText(/AC/)).not.toBeInTheDocument();
  });

  it("renders with purple border styling", () => {
    const { container } = render(
      <NpcNode data={{ label: "Test NPC", npcId: "npc-3" }} />
    );
    const node = container.firstElementChild;
    expect(node?.className).toContain("border-purple-400");
  });
});
