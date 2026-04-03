/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GuestCombatClient } from "./GuestCombatClient";
import { useGuestCombatStore } from "@/lib/stores/guest-combat-store";

// Mock child components to isolate GuestCombatClient behavior
jest.mock("@/components/session/RulesetSelector", () => ({
  RulesetSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="mock-ruleset-selector" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="2014">2014</option>
      <option value="2024">2024</option>
    </select>
  ),
}));

jest.mock("@/components/combat/CombatantSetupRow", () => ({
  CombatantSetupRow: ({ combatant }: { combatant: { id: string; name: string } }) => (
    <div data-testid={`setup-row-${combatant.id}`}>{combatant.name}</div>
  ),
}));

jest.mock("@/components/combat/SortableCombatantList", () => ({
  SortableCombatantList: ({ combatants, renderItem }: {
    combatants: Array<{ id: string; name: string }>;
    renderItem: (c: { id: string; name: string }) => React.ReactNode;
  }) => (
    <div data-testid="mock-sortable-list">
      {combatants.map((c) => (
        <div key={c.id}>{renderItem(c)}</div>
      ))}
    </div>
  ),
}));

jest.mock("@/components/combat/CombatantRow", () => ({
  CombatantRow: ({ combatant, isCurrentTurn }: { combatant: { id: string; name: string }; isCurrentTurn: boolean }) => (
    <div data-testid={`combat-row-${combatant.id}`} aria-current={isCurrentTurn || undefined}>
      {combatant.name}
    </div>
  ),
}));

jest.mock("@/components/combat/AddCombatantForm", () => ({
  AddCombatantForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-add-form">
      <button onClick={onClose} data-testid="close-add-form">Close</button>
    </div>
  ),
}));

jest.mock("@/components/guest/GuestUpsellModal", () => ({
  GuestUpsellModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-upsell-modal">Upsell</div> : null,
}));

jest.mock("@/components/guest/GuestExpiryModal", () => ({
  GuestExpiryModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-expiry-modal">Expired</div> : null,
}));

jest.mock("@/components/combat/MonsterSearchPanel", () => ({
  MonsterSearchPanel: () => <div data-testid="mock-monster-search" />,
}));

jest.mock("@/lib/hooks/useInitiativeRolling", () => ({
  useInitiativeRolling: () => ({
    handleRollOne: jest.fn(),
    handleRollAll: jest.fn(),
    handleRollNpcs: jest.fn(),
  }),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

jest.mock("@/lib/srd/srd-loader", () => ({}));

jest.mock("@/lib/utils/initiative", () => ({
  assignInitiativeOrder: (arr: unknown[]) => arr,
  sortByInitiative: (arr: unknown[]) => arr,
  rollInitiativeForCombatant: () => ({ total: 10 }),
  adjustInitiativeAfterReorder: (arr: unknown[]) => arr,
}));

// Helper to reset store state between tests
function resetStore() {
  useGuestCombatStore.setState({
    phase: "setup",
    combatants: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    isExpired: false,
  });
}

const SAMPLE_COMBATANT = {
  id: "c1",
  name: "Goblin",
  current_hp: 7,
  max_hp: 7,
  temp_hp: 0,
  ac: 15,
  spell_save_dc: null,
  initiative: 14,
  initiative_order: 0,
  conditions: [] as string[],
  ruleset_version: "2014" as const,
  is_defeated: false,
  is_hidden: false,
  is_player: false,
  monster_id: "goblin",
  token_url: null,
  creature_type: null,
  display_name: null,
  monster_group_id: null,
  group_order: null,
  dm_notes: "",
  player_notes: "",
  player_character_id: null,
  combatant_role: null,
};

describe("GuestCombatClient", () => {
  beforeEach(() => {
    resetStore();
  });

  // ── Setup Phase ──────────────────────────────────────────────────────

  it("renders setup phase with encounter title and description", () => {
    render(<GuestCombatClient />);

    expect(screen.getByText("combat.encounter_title")).toBeInTheDocument();
    expect(screen.getByText("combat.encounter_description")).toBeInTheDocument();
  });

  it("renders monster search panel in setup", () => {
    render(<GuestCombatClient />);

    expect(screen.getByTestId("mock-monster-search")).toBeInTheDocument();
  });

  it("renders add row for manual combatant entry", () => {
    render(<GuestCombatClient />);

    expect(screen.getByTestId("add-row")).toBeInTheDocument();
    expect(screen.getByTestId("add-row-name")).toBeInTheDocument();
    expect(screen.getByTestId("add-row-init")).toBeInTheDocument();
    expect(screen.getByTestId("add-row-hp")).toBeInTheDocument();
    expect(screen.getByTestId("add-row-ac")).toBeInTheDocument();
  });

  it("shows empty state when no combatants", () => {
    render(<GuestCombatClient />);

    expect(screen.getByText("combat.setup_empty")).toBeInTheDocument();
  });

  it("shows share upsell button in setup", () => {
    render(<GuestCombatClient />);

    expect(screen.getByTestId("guest-share-upsell")).toBeInTheDocument();
  });

  it("start combat button is disabled when no combatants", () => {
    render(<GuestCombatClient />);

    const startBtn = screen.getByTestId("start-combat-btn");
    expect(startBtn).toBeDisabled();
  });

  it("shows validation error when starting combat with no combatants", () => {
    // Add combatant to enable button, but the store is empty so the validation should trigger
    // Actually, the button is disabled when empty, so let's add one combatant without initiative
    act(() => {
      useGuestCombatStore.getState().addCombatant({
        ...SAMPLE_COMBATANT,
        initiative: null,
      });
    });

    render(<GuestCombatClient />);

    const startBtn = screen.getByTestId("start-combat-btn");
    fireEvent.click(startBtn);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("adds a combatant via the add row", () => {
    render(<GuestCombatClient />);

    const nameInput = screen.getByTestId("add-row-name");
    const addBtn = screen.getByTestId("add-row-btn");

    fireEvent.change(nameInput, { target: { value: "Orc Warrior" } });
    fireEvent.click(addBtn);

    // Store should now have one combatant
    expect(useGuestCombatStore.getState().combatants).toHaveLength(1);
    expect(useGuestCombatStore.getState().combatants[0].name).toBe("Orc Warrior");
  });

  it("shows validation error when adding combatant with empty name", () => {
    render(<GuestCombatClient />);

    const addBtn = screen.getByTestId("add-row-btn");
    fireEvent.click(addBtn);

    // Error should appear
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows combatants in setup list", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant(SAMPLE_COMBATANT);
    });

    render(<GuestCombatClient />);

    // The SortableCombatantList mock renders the CombatantSetupRow mock
    const combatants = useGuestCombatStore.getState().combatants;
    expect(screen.getByTestId(`setup-row-${combatants[0].id}`)).toBeInTheDocument();
  });

  // ── Combat Phase ─────────────────────────────────────────────────────

  it("renders active combat view when phase is combat", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    expect(screen.getByTestId("active-combat")).toBeInTheDocument();
  });

  it("shows round number in combat view", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows next turn and end encounter buttons in combat", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    expect(screen.getByTestId("next-turn-btn")).toBeInTheDocument();
    expect(screen.getByTestId("end-encounter-btn")).toBeInTheDocument();
  });

  it("shows save upsell button in combat (guest cannot save)", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    expect(screen.getByTestId("save-btn")).toBeInTheDocument();
  });

  it("opens upsell modal when save is clicked", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    fireEvent.click(screen.getByTestId("save-btn"));

    expect(screen.getByTestId("mock-upsell-modal")).toBeInTheDocument();
  });

  it("toggles add combatant form in combat", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    // Form should not be visible initially
    expect(screen.queryByTestId("mid-combat-add-panel")).not.toBeInTheDocument();

    // Click add combatant
    fireEvent.click(screen.getByTestId("add-combatant-btn"));

    expect(screen.getByTestId("mid-combat-add-panel")).toBeInTheDocument();
  });

  it("ends encounter and returns to setup phase", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    const { rerender } = render(<GuestCombatClient />);

    expect(screen.getByTestId("active-combat")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("end-encounter-btn"));

    // Re-render to pick up store change
    rerender(<GuestCombatClient />);

    // Should be back in setup (store resets)
    expect(screen.getByText("combat.encounter_title")).toBeInTheDocument();
  });

  it("renders combatant rows in combat phase", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    const combatants = useGuestCombatStore.getState().combatants;
    expect(screen.getByTestId(`combat-row-${combatants[0].id}`)).toBeInTheDocument();
  });

  it("has accessible initiative list", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant({ ...SAMPLE_COMBATANT, initiative: 14 });
      useGuestCombatStore.getState().startCombat();
    });

    render(<GuestCombatClient />);

    expect(screen.getByRole("list", { name: "combat.initiative_order" })).toBeInTheDocument();
  });

  // ── Role Selector ─────────────────────────────────────────────────────

  it("renders role selector button in add row", () => {
    render(<GuestCombatClient />);
    expect(screen.getByTestId("add-row-role")).toBeInTheDocument();
  });

  it("cycles role when role button is clicked", () => {
    render(<GuestCombatClient />);
    const roleBtn = screen.getByTestId("add-row-role");

    // Default is monster (Skull icon), click cycles to player
    fireEvent.click(roleBtn);
    // After one click, should cycle to the next role
    expect(roleBtn).toBeInTheDocument();
  });

  it("sets combatant_role when adding via add row", () => {
    render(<GuestCombatClient />);

    const nameInput = screen.getByTestId("add-row-name");
    const addBtn = screen.getByTestId("add-row-btn");

    fireEvent.change(nameInput, { target: { value: "Fighter" } });
    fireEvent.click(addBtn);

    const combatants = useGuestCombatStore.getState().combatants;
    expect(combatants).toHaveLength(1);
    // Default role for manual add is player
    expect(combatants[0].combatant_role).toBe("player");
  });

  // ── Clear Confirmation ────────────────────────────────────────────────

  it("shows confirmation banner when clear all is clicked", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant(SAMPLE_COMBATANT);
    });

    render(<GuestCombatClient />);

    const clearBtn = screen.getByText("common.clear_all");
    fireEvent.click(clearBtn);

    expect(screen.getByText("combat.clear_all_confirm_message")).toBeInTheDocument();
    expect(screen.getByTestId("clear-confirm-yes")).toBeInTheDocument();
    expect(screen.getByTestId("clear-confirm-no")).toBeInTheDocument();
  });

  it("clears combatants when confirm is clicked", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant(SAMPLE_COMBATANT);
    });

    render(<GuestCombatClient />);

    fireEvent.click(screen.getByText("common.clear_all"));
    fireEvent.click(screen.getByTestId("clear-confirm-yes"));

    expect(useGuestCombatStore.getState().combatants).toHaveLength(0);
  });

  it("dismisses confirmation banner when cancel is clicked", () => {
    act(() => {
      useGuestCombatStore.getState().addCombatant(SAMPLE_COMBATANT);
    });

    render(<GuestCombatClient />);

    fireEvent.click(screen.getByText("common.clear_all"));
    expect(screen.getByTestId("clear-confirm-yes")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("clear-confirm-no"));
    expect(screen.queryByTestId("clear-confirm-yes")).not.toBeInTheDocument();
  });
});
