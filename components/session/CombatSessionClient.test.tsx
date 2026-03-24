/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CombatSessionClient } from "./CombatSessionClient";
import { useCombatStore } from "@/lib/stores/combat-store";
import type { Combatant } from "@/lib/types/combat";

// Mock DB persistence — tests exercise UI + store only
const mockPersistTurnAdvance = jest.fn();

jest.mock("@/lib/supabase/session", () => ({
  persistInitiativeAndStartCombat: jest.fn(),
  persistTurnAdvance: (...args: unknown[]) => mockPersistTurnAdvance(...args),
}));

// Stub child components that are covered by their own test suites
jest.mock("@/components/combat/CombatantRow", () => ({
  CombatantRow: ({
    combatant,
    isCurrentTurn,
  }: {
    combatant: Combatant;
    isCurrentTurn: boolean;
  }) => (
    <li
      data-testid={`combatant-row-${combatant.id}`}
      data-current={String(isCurrentTurn)}
    >
      {combatant.name}
    </li>
  ),
}));

jest.mock("@/components/combat/InitiativeTracker", () => ({
  InitiativeTracker: ({ onStartCombat }: { onStartCombat: () => void }) => (
    <button onClick={onStartCombat} data-testid="initiative-tracker">
      Start Combat
    </button>
  ),
}));

const makeC = (id: string, name: string): Combatant => ({
  id,
  name,
  current_hp: 10,
  max_hp: 10,
  temp_hp: 0,
  ac: 14,
  spell_save_dc: null,
  initiative: 12,
  initiative_order: 0,
  conditions: [],
  ruleset_version: "2014",
  is_defeated: false,
  is_player: false,
  monster_id: null,
});

const TWO_COMBATANTS = [makeC("c1", "Goblin"), makeC("c2", "Orc")];

beforeEach(() => {
  useCombatStore.getState().clearEncounter();
  jest.clearAllMocks();
  mockPersistTurnAdvance.mockResolvedValue(undefined);
});

describe("CombatSessionClient — active combat view", () => {
  it("renders the 'Next Turn' button during active combat", () => {
    render(
      <CombatSessionClient
        sessionId="sess-1"
        encounterId="enc-1"
        initialCombatants={TWO_COMBATANTS}
        isActive={true}
        roundNumber={1}
        currentTurnIndex={0}
      />
    );
    expect(screen.getByTestId("next-turn-btn")).toBeInTheDocument();
  });

  it("clicking 'Next Turn' advances the store's current_turn_index", async () => {
    render(
      <CombatSessionClient
        sessionId="sess-1"
        encounterId="enc-1"
        initialCombatants={TWO_COMBATANTS}
        isActive={true}
        roundNumber={1}
        currentTurnIndex={0}
      />
    );
    await userEvent.click(screen.getByTestId("next-turn-btn"));
    expect(useCombatStore.getState().current_turn_index).toBe(1);
  });

  it("clicking 'Next Turn' calls persistTurnAdvance with updated values", async () => {
    render(
      <CombatSessionClient
        sessionId="sess-1"
        encounterId="enc-1"
        initialCombatants={TWO_COMBATANTS}
        isActive={true}
        roundNumber={1}
        currentTurnIndex={0}
      />
    );
    await userEvent.click(screen.getByTestId("next-turn-btn"));
    await waitFor(() =>
      expect(mockPersistTurnAdvance).toHaveBeenCalledWith("enc-1", 1, 1)
    );
  });

  it("on load with isActive=true, store reflects server's currentTurnIndex (not 0)", () => {
    render(
      <CombatSessionClient
        sessionId="sess-1"
        encounterId="enc-1"
        initialCombatants={TWO_COMBATANTS}
        isActive={true}
        roundNumber={3}
        currentTurnIndex={1}
      />
    );
    expect(useCombatStore.getState().current_turn_index).toBe(1);
    expect(useCombatStore.getState().round_number).toBe(3);
  });

  it("renders CombatantRow for each combatant with correct isCurrentTurn prop", () => {
    render(
      <CombatSessionClient
        sessionId="sess-1"
        encounterId="enc-1"
        initialCombatants={TWO_COMBATANTS}
        isActive={true}
        roundNumber={1}
        currentTurnIndex={0}
      />
    );
    expect(screen.getByTestId("combatant-row-c1")).toHaveAttribute(
      "data-current",
      "true"
    );
    expect(screen.getByTestId("combatant-row-c2")).toHaveAttribute(
      "data-current",
      "false"
    );
  });
});
