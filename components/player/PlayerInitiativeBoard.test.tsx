/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PlayerInitiativeBoard } from "./PlayerInitiativeBoard";

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

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
    initiative_order: 0,
    conditions: [],
    is_defeated: false,
    is_player: true,
    monster_id: null,
    token_url: null,
    creature_type: null,
    ruleset_version: null,
  },
  {
    id: "c2",
    name: "Goblin",
    hp_status: "HEAVY",
    initiative_order: 1,
    conditions: ["Stunned"],
    is_defeated: false,
    is_player: false,
    monster_id: "goblin",
    token_url: null,
    creature_type: null,
    ruleset_version: "2014",
  },
  {
    id: "c3",
    name: "Orc",
    hp_status: "CRITICAL",
    initiative_order: 2,
    conditions: [],
    is_defeated: true,
    is_player: false,
    monster_id: "orc",
    token_url: null,
    creature_type: null,
    ruleset_version: "2014",
  },
];

describe("PlayerInitiativeBoard", () => {
  it("renders all combatants in round 2+", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
        rulesetVersion="2014"
      />
    );
    expect(screen.getAllByText("Aragorn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Goblin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Orc").length).toBeGreaterThan(0);
  });

  it("highlights current turn with aria-current", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
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

  it("shows HP for player characters", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
        rulesetVersion="2014"
      />
    );
    expect(screen.getAllByText("40").length).toBeGreaterThan(0);
  });

  it("shows HP status label for monsters", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByText("player.hp_status_heavy")).toBeInTheDocument();
    expect(screen.getByText("player.hp_status_critical")).toBeInTheDocument();
  });

  it("shows condition badges", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
        rulesetVersion="2014"
      />
    );
    // The i18n mock returns "conditions.<key>" for translated condition names
    expect(screen.getByText("conditions.stunned")).toBeInTheDocument();
  });

  it("shows defeated badge for defeated combatants", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByText("player.defeated")).toBeInTheDocument();
  });

  it("applies opacity to defeated combatants", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={2}
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
        roundNumber={2}
        rulesetVersion="2014"
      />
    );
    expect(screen.getByRole("list", { name: "player.initiative_order" })).toBeInTheDocument();
  });

  it("hides unrevealed combatants in round 1", () => {
    render(
      <PlayerInitiativeBoard
        combatants={COMBATANTS}
        currentTurnIndex={0}
        roundNumber={1}
        rulesetVersion="2014"
      />
    );
    // Only first combatant (index 0) should be visible
    expect(screen.getAllByText("Aragorn").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("player-combatant-c2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("player-combatant-c3")).not.toBeInTheDocument();
  });
});
