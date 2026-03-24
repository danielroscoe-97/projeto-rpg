/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InitiativeTracker } from "./InitiativeTracker";
import { useCombatStore } from "@/lib/stores/combat-store";
import type { Combatant } from "@/lib/types/combat";

// dnd-kit uses PointerEvents which jsdom doesn't fully support — mock it
jest.mock("./TiebreakerDragList", () => ({
  TiebreakerDragList: ({ tiedCombatants }: { tiedCombatants: Combatant[] }) => (
    <ul data-testid="tiebreaker-drag-list">
      {tiedCombatants.map((c) => (
        <li key={c.id} data-testid={`tiebreaker-item-${c.id}`}>
          {c.name}
        </li>
      ))}
    </ul>
  ),
}));

const base: Omit<Combatant, "id"> = {
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
  is_player: true,
  monster_id: null,
};

beforeEach(() => {
  useCombatStore.getState().clearEncounter();
});

function seedCombatants(names: string[]) {
  names.forEach((name) =>
    useCombatStore.getState().addCombatant({ ...base, name })
  );
}

describe("InitiativeTracker", () => {
  it("renders an initiative input for each combatant", () => {
    seedCombatants(["Hero", "Goblin"]);
    render(<InitiativeTracker onStartCombat={jest.fn()} />);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("Start Combat button is disabled when not all initiatives are set", () => {
    seedCombatants(["Hero", "Goblin"]);
    render(<InitiativeTracker onStartCombat={jest.fn()} />);
    expect(screen.getByTestId("start-combat-btn")).toBeDisabled();
  });

  it("Start Combat button is enabled when all initiatives are set", async () => {
    seedCombatants(["Hero"]);
    render(<InitiativeTracker onStartCombat={jest.fn()} />);
    const id = useCombatStore.getState().combatants[0].id;
    await userEvent.type(screen.getByTestId(`initiative-input-${id}`), "15");
    await waitFor(() =>
      expect(screen.getByTestId("start-combat-btn")).not.toBeDisabled()
    );
  });

  it("typing initiative updates the store", async () => {
    seedCombatants(["Hero"]);
    render(<InitiativeTracker onStartCombat={jest.fn()} />);
    const id = useCombatStore.getState().combatants[0].id;
    await userEvent.type(screen.getByTestId(`initiative-input-${id}`), "18");
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    expect(c?.initiative).toBe(18);
  });

  it("shows a tie warning when two combatants share an initiative", async () => {
    seedCombatants(["Hero", "Goblin"]);
    render(<InitiativeTracker onStartCombat={jest.fn()} />);
    const ids = useCombatStore.getState().combatants.map((c) => c.id);
    await userEvent.type(screen.getByTestId(`initiative-input-${ids[0]}`), "15");
    await userEvent.type(screen.getByTestId(`initiative-input-${ids[1]}`), "15");
    await waitFor(() =>
      expect(screen.getByText(/ties detected/i)).toBeInTheDocument()
    );
  });

  it("renders TiebreakerDragList for tied combatants", async () => {
    seedCombatants(["Hero", "Goblin"]);
    render(<InitiativeTracker onStartCombat={jest.fn()} />);
    const ids = useCombatStore.getState().combatants.map((c) => c.id);
    await userEvent.type(screen.getByTestId(`initiative-input-${ids[0]}`), "15");
    await userEvent.type(screen.getByTestId(`initiative-input-${ids[1]}`), "15");
    await waitFor(() =>
      expect(screen.getByTestId("tiebreaker-drag-list")).toBeInTheDocument()
    );
  });

  it("calls onStartCombat when Start Combat is clicked", async () => {
    seedCombatants(["Hero"]);
    const onStartCombat = jest.fn().mockResolvedValue(undefined);
    render(<InitiativeTracker onStartCombat={onStartCombat} />);
    const id = useCombatStore.getState().combatants[0].id;
    await userEvent.type(screen.getByTestId(`initiative-input-${id}`), "12");
    await waitFor(() =>
      expect(screen.getByTestId("start-combat-btn")).not.toBeDisabled()
    );
    await userEvent.click(screen.getByTestId("start-combat-btn"));
    await waitFor(() => expect(onStartCombat).toHaveBeenCalled());
  });
});
