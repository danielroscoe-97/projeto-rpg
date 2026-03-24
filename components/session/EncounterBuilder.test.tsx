/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EncounterBuilder } from "./EncounterBuilder";
import { useCombatStore } from "@/lib/stores/combat-store";
import * as srdSearch from "@/lib/srd/srd-search";
import * as srdLoader from "@/lib/srd/srd-loader";
import * as encounterLib from "@/lib/supabase/encounter";
import type { SrdMonster } from "@/lib/srd/srd-loader";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SRD loader (async fetch)
jest.mock("@/lib/srd/srd-loader", () => ({
  loadMonsters: jest.fn(),
}));

// Mock SRD search (synchronous index + search)
jest.mock("@/lib/srd/srd-search", () => ({
  buildMonsterIndex: jest.fn(),
  searchMonsters: jest.fn(),
}));

// Mock encounter persistence
jest.mock("@/lib/supabase/encounter", () => ({
  createEncounterWithCombatants: jest.fn(),
}));

const mockGoblin: SrdMonster = {
  id: "goblin",
  name: "Goblin",
  cr: "1/4",
  type: "humanoid",
  hit_points: 7,
  armor_class: 15,
  ruleset_version: "2014",
};

beforeEach(() => {
  jest.clearAllMocks();
  useCombatStore.getState().clearEncounter();
  // loadMonsters resolves with empty array by default
  (srdLoader.loadMonsters as jest.Mock).mockResolvedValue([]);
  // searchMonsters returns empty by default (synchronous)
  (srdSearch.searchMonsters as jest.Mock).mockReturnValue([]);
  (encounterLib.createEncounterWithCombatants as jest.Mock).mockResolvedValue({
    session_id: "sess-123",
    encounter_id: "enc-456",
  });
});

describe("EncounterBuilder", () => {
  it("renders the search input and Start Combat button", () => {
    render(<EncounterBuilder />);
    expect(screen.getByTestId("monster-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("start-combat-btn")).toBeInTheDocument();
  });

  it("shows search results after typing", async () => {
    (srdSearch.searchMonsters as jest.Mock).mockReturnValue([
      { item: mockGoblin, refIndex: 0, score: 0 },
    ]);
    render(<EncounterBuilder />);
    const input = screen.getByTestId("monster-search-input");
    await userEvent.type(input, "gob");
    await waitFor(() =>
      expect(screen.getByTestId("monster-results")).toBeInTheDocument()
    );
    expect(screen.getByText("Goblin")).toBeInTheDocument();
  });

  it("adds a monster to the combatant list when Add is clicked", async () => {
    (srdSearch.searchMonsters as jest.Mock).mockReturnValue([
      { item: mockGoblin, refIndex: 0, score: 0 },
    ]);
    render(<EncounterBuilder />);
    const input = screen.getByTestId("monster-search-input");
    await userEvent.type(input, "gob");
    await waitFor(() => screen.getByTestId("add-monster-goblin"));
    await userEvent.click(screen.getByTestId("add-monster-goblin"));
    expect(screen.getByTestId("combatant-list")).toBeInTheDocument();
    expect(screen.getByText("Goblin 1")).toBeInTheDocument();
  });

  it("auto-numbers two goblins as 'Goblin 1' and 'Goblin 2'", async () => {
    (srdSearch.searchMonsters as jest.Mock).mockReturnValue([
      { item: mockGoblin, refIndex: 0, score: 0 },
    ]);
    render(<EncounterBuilder />);
    const input = screen.getByTestId("monster-search-input");
    await userEvent.type(input, "gob");
    await waitFor(() => screen.getByTestId("add-monster-goblin"));
    await userEvent.click(screen.getByTestId("add-monster-goblin"));
    await userEvent.click(screen.getByTestId("add-monster-goblin"));
    expect(screen.getByText("Goblin 1")).toBeInTheDocument();
    expect(screen.getByText("Goblin 2")).toBeInTheDocument();
  });

  it("adds a custom NPC", async () => {
    render(<EncounterBuilder />);
    await userEvent.click(screen.getByTestId("show-custom-npc-btn"));
    await userEvent.type(screen.getByTestId("npc-name-input"), "Bandit Captain");
    await userEvent.type(screen.getByTestId("npc-hp-input"), "65");
    await userEvent.type(screen.getByTestId("npc-ac-input"), "15");
    await userEvent.click(screen.getByTestId("add-npc-btn"));
    expect(screen.getByText("Bandit Captain")).toBeInTheDocument();
  });

  it("removes a combatant from the list", async () => {
    (srdSearch.searchMonsters as jest.Mock).mockReturnValue([
      { item: mockGoblin, refIndex: 0, score: 0 },
    ]);
    render(<EncounterBuilder />);
    const input = screen.getByTestId("monster-search-input");
    await userEvent.type(input, "gob");
    await waitFor(() => screen.getByTestId("add-monster-goblin"));
    await userEvent.click(screen.getByTestId("add-monster-goblin"));
    await waitFor(() => screen.getByText("Goblin 1"));
    const removeBtn = screen.getByRole("button", { name: /remove goblin 1/i });
    await userEvent.click(removeBtn);
    expect(screen.queryByText("Goblin 1")).not.toBeInTheDocument();
  });

  it("shows error when Start Combat is clicked with no combatants", async () => {
    render(<EncounterBuilder />);
    await userEvent.click(screen.getByTestId("start-combat-btn"));
    expect(
      screen.getByText(/add at least one combatant/i)
    ).toBeInTheDocument();
  });

  it("calls createEncounterWithCombatants and redirects on Start Combat", async () => {
    (srdSearch.searchMonsters as jest.Mock).mockReturnValue([
      { item: mockGoblin, refIndex: 0, score: 0 },
    ]);
    render(<EncounterBuilder />);
    const input = screen.getByTestId("monster-search-input");
    await userEvent.type(input, "gob");
    await waitFor(() => screen.getByTestId("add-monster-goblin"));
    await userEvent.click(screen.getByTestId("add-monster-goblin"));
    await waitFor(() => screen.getByText("Goblin 1"));
    await userEvent.click(screen.getByTestId("start-combat-btn"));
    await waitFor(() =>
      expect(encounterLib.createEncounterWithCombatants).toHaveBeenCalled()
    );
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/app/session/sess-123")
    );
  });

  it("displays custom NPC form validation errors", async () => {
    render(<EncounterBuilder />);
    await userEvent.click(screen.getByTestId("show-custom-npc-btn"));
    await userEvent.click(screen.getByTestId("add-npc-btn"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getAllByText("Must be ≥ 1")).toHaveLength(2);
  });
});
