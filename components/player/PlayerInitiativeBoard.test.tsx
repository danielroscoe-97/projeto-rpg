/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PlayerInitiativeBoard } from "./PlayerInitiativeBoard";

jest.mock("@/lib/srd/srd-search", () => ({
  findCondition: jest.fn(),
}));

jest.mock("@/components/oracle/ConditionRulesModal", () => ({
  ConditionRulesModal: () => null,
}));

const COMBATANTS = [
  {
    id: "c1",
    name: "Aragorn",
    current_hp: 40,
    max_hp: 40,
    temp_hp: 0,
    ac: 18,
    initiative_order: 0,
    conditions: [],
    is_defeated: false,
    is_player: true,
    monster_id: null,
    ruleset_version: null,
  },
  {
    id: "c2",
    name: "Goblin",
    current_hp: 3,
    max_hp: 7,
    temp_hp: 0,
    ac: 15,
    initiative_order: 1,
    conditions: ["Stunned"],
    is_defeated: false,
    is_player: false,
    monster_id: "goblin",
    ruleset_version: "2014",
  },
  {
    id: "c3",
    name: "Orc",
    current_hp: 0,
    max_hp: 15,
    temp_hp: 0,
    ac: 13,
    initiative_order: 2,
    conditions: [],
    is_defeated: true,
    is_player: false,
    monster_id: "orc",
    ruleset_version: "2014",
  },
];

describe("PlayerInitiativeBoard", () => {
  it("renders all combatants", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByText("Aragorn")).toBeInTheDocument();
    expect(screen.getByText("Goblin")).toBeInTheDocument();
    expect(screen.getByText("Orc")).toBeInTheDocument();
  });

  it("highlights current turn with aria-current", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByTestId("player-combatant-c1")).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(
      screen.getByTestId("player-combatant-c2")
    ).not.toHaveAttribute("aria-current");
  });

  it("shows HP for each combatant", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByText("40 / 40")).toBeTruthy();
    expect(screen.getByText("3 / 7")).toBeTruthy();
  });

  it("shows condition badges", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByText("Stunned")).toBeInTheDocument();
  });

  it("shows defeated badge for defeated combatants", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByText("Defeated")).toBeInTheDocument();
  });

  it("applies opacity to defeated combatants", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByTestId("player-combatant-c3").className).toContain(
      "opacity-50"
    );
  });

  it("has accessible list structure", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByRole("list", { name: "Initiative order" })).toBeInTheDocument();
  });
});
