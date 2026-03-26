/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EncounterSetup } from "./EncounterSetup";
import { useCombatStore } from "@/lib/stores/combat-store";

// Mock child components
jest.mock("@/components/session/RulesetSelector", () => ({
  RulesetSelector: () => <div data-testid="ruleset-selector" />,
  VersionBadge: () => null,
}));

jest.mock("@/components/session/CampaignLoader", () => ({
  CampaignLoader: () => <div data-testid="campaign-loader" />,
}));

jest.mock("@/components/combat/CombatantSetupRow", () => ({
  CombatantSetupRow: ({ combatant, onRemove }: { combatant: { id: string; name: string }; onRemove: (id: string) => void }) => (
    <div data-testid={`setup-row-${combatant.id}`}>
      {combatant.name}
      <button data-testid={`remove-${combatant.id}`} onClick={() => onRemove(combatant.id)}>✕</button>
    </div>
  ),
}));

jest.mock("@/lib/srd/srd-loader", () => ({
  loadMonsters: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/srd/srd-search", () => ({
  buildMonsterIndex: jest.fn(),
  searchMonsters: jest.fn().mockReturnValue([]),
}));

const mockOnStartCombat = jest.fn();

beforeEach(() => {
  useCombatStore.getState().clearEncounter();
  jest.clearAllMocks();
  mockOnStartCombat.mockResolvedValue(undefined);
});

describe("EncounterSetup", () => {
  it("renders the add-row, start button, and empty state", () => {
    render(<EncounterSetup onStartCombat={mockOnStartCombat} />);
    expect(screen.getByTestId("add-row")).toBeInTheDocument();
    expect(screen.getByTestId("start-combat-btn")).toBeInTheDocument();
    expect(screen.getByTestId("start-combat-btn")).toBeDisabled();
    expect(screen.getByText("combat.setup_empty")).toBeInTheDocument();
  });

  it("adds a combatant via the add-row", async () => {
    render(<EncounterSetup onStartCombat={mockOnStartCombat} />);
    await userEvent.type(screen.getByTestId("add-row-init"), "15");
    await userEvent.type(screen.getByTestId("add-row-name"), "Goblin");
    await userEvent.type(screen.getByTestId("add-row-hp"), "7");
    await userEvent.type(screen.getByTestId("add-row-ac"), "15");
    await userEvent.click(screen.getByTestId("add-row-btn"));

    const { combatants } = useCombatStore.getState();
    expect(combatants).toHaveLength(1);
    expect(combatants[0].name).toBe("Goblin");
    expect(combatants[0].max_hp).toBe(7);
  });

  it("clears the add-row after adding", async () => {
    render(<EncounterSetup onStartCombat={mockOnStartCombat} />);
    await userEvent.type(screen.getByTestId("add-row-name"), "Orc");
    await userEvent.type(screen.getByTestId("add-row-hp"), "15");
    await userEvent.type(screen.getByTestId("add-row-ac"), "13");
    await userEvent.click(screen.getByTestId("add-row-btn"));

    expect(screen.getByTestId("add-row-name")).toHaveValue("");
  });

  it("shows combatant rows after adding", async () => {
    useCombatStore.getState().addCombatant({
      name: "Hero",
      current_hp: 20,
      max_hp: 20,
      temp_hp: 0,
      ac: 16,
      spell_save_dc: null,
      initiative: 10,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_player: false,
      monster_id: null,
      token_url: null,
      creature_type: null,
      dm_notes: "",
      player_notes: "",
    });
    render(<EncounterSetup onStartCombat={mockOnStartCombat} />);
    const rows = useCombatStore.getState().combatants;
    expect(screen.getByTestId(`setup-row-${rows[0].id}`)).toBeInTheDocument();
  });

  it("enables Start Combat when combatants exist", async () => {
    useCombatStore.getState().addCombatant({
      name: "Hero",
      current_hp: 20,
      max_hp: 20,
      temp_hp: 0,
      ac: 16,
      spell_save_dc: null,
      initiative: 10,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_player: false,
      monster_id: null,
      token_url: null,
      creature_type: null,
      dm_notes: "",
      player_notes: "",
    });
    render(<EncounterSetup onStartCombat={mockOnStartCombat} />);
    expect(screen.getByTestId("start-combat-btn")).not.toBeDisabled();
  });

  it("shows error if initiative is missing on start combat", async () => {
    useCombatStore.getState().addCombatant({
      name: "Hero",
      current_hp: 20,
      max_hp: 20,
      temp_hp: 0,
      ac: 16,
      spell_save_dc: null,
      initiative: null,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_player: false,
      monster_id: null,
      token_url: null,
      creature_type: null,
      dm_notes: "",
      player_notes: "",
    });
    render(<EncounterSetup onStartCombat={mockOnStartCombat} />);
    await userEvent.click(screen.getByTestId("start-combat-btn"));
    expect(screen.getByText(/combat\.error_missing_init/)).toBeInTheDocument();
    expect(mockOnStartCombat).not.toHaveBeenCalled();
  });
});
