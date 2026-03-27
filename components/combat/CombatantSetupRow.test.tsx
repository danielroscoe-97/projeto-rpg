/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CombatantSetupRow } from "./CombatantSetupRow";
import type { Combatant } from "@/lib/types/combat";

jest.mock("@/components/session/RulesetSelector", () => ({
  VersionBadge: ({ version }: { version: string }) => (
    <span data-testid="version-badge">{version}</span>
  ),
  RulesetSelector: () => null,
}));

const BASE: Combatant = {
  id: "c1",
  name: "Goblin",
  current_hp: 7,
  max_hp: 7,
  temp_hp: 0,
  ac: 15,
  spell_save_dc: null,
  initiative: 12,
  initiative_order: null,
  conditions: [],
  ruleset_version: "2014",
  is_defeated: false,
  is_player: false,
  monster_id: "goblin",
  token_url: null,
  creature_type: null,
  display_name: null,
  monster_group_id: null,
  group_order: null,
  dm_notes: "",
  player_notes: "flying",
  player_character_id: null,
};

const noop = jest.fn();

function renderRow(overrides: Partial<Combatant> = {}) {
  const handlers = {
    onInitiativeChange: jest.fn(),
    onNameChange: jest.fn(),
    onHpChange: jest.fn(),
    onAcChange: jest.fn(),
    onNotesChange: jest.fn(),
    onRemove: jest.fn(),
  };
  render(
    <CombatantSetupRow combatant={{ ...BASE, ...overrides }} {...handlers} />
  );
  return handlers;
}

describe("CombatantSetupRow", () => {
  it("renders all fields with correct values", () => {
    renderRow();
    expect(screen.getByTestId("setup-init-c1")).toHaveValue(12);
    expect(screen.getByTestId("setup-name-c1")).toHaveValue("Goblin");
    expect(screen.getByTestId("setup-hp-c1")).toHaveValue(7);
    expect(screen.getByTestId("setup-ac-c1")).toHaveValue(15);
    expect(screen.getByTestId("setup-notes-c1")).toHaveValue("flying");
  });

  it("calls onInitiativeChange when init field is changed", async () => {
    const h = renderRow({ initiative: null });
    const input = screen.getByTestId("setup-init-c1");
    await userEvent.type(input, "5");
    expect(h.onInitiativeChange).toHaveBeenCalledWith("c1", 5);
  });

  it("calls onNameChange when name is edited", async () => {
    const h = renderRow();
    const input = screen.getByTestId("setup-name-c1");
    await userEvent.clear(input);
    await userEvent.type(input, "Orc");
    expect(h.onNameChange).toHaveBeenCalled();
  });

  it("calls onHpChange when HP is edited", async () => {
    const h = renderRow();
    const input = screen.getByTestId("setup-hp-c1");
    await userEvent.clear(input);
    await userEvent.type(input, "20");
    expect(h.onHpChange).toHaveBeenCalled();
  });

  it("calls onAcChange when AC is edited", async () => {
    const h = renderRow();
    const input = screen.getByTestId("setup-ac-c1");
    await userEvent.clear(input);
    await userEvent.type(input, "18");
    expect(h.onAcChange).toHaveBeenCalled();
  });

  it("calls onNotesChange when notes are edited", async () => {
    const h = renderRow();
    const input = screen.getByTestId("setup-notes-c1");
    await userEvent.clear(input);
    await userEvent.type(input, "concentrating");
    expect(h.onNotesChange).toHaveBeenCalled();
  });

  it("calls onRemove when ✕ is clicked", async () => {
    const h = renderRow();
    await userEvent.click(screen.getByTestId("setup-remove-c1"));
    expect(h.onRemove).toHaveBeenCalledWith("c1");
  });

  it("shows Player badge for player combatants", () => {
    renderRow({ is_player: true });
    expect(screen.getByText("combat.setup_player_badge")).toBeInTheDocument();
  });

  it("shows version badge for SRD monsters", () => {
    renderRow({ ruleset_version: "2024" });
    expect(screen.getByTestId("version-badge")).toHaveTextContent("2024");
  });
});
