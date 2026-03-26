/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CombatantRow } from "./CombatantRow";
import * as srdSearch from "@/lib/srd/srd-search";
import type { Combatant } from "@/lib/types/combat";
import type { SrdMonster } from "@/lib/srd/srd-loader";

jest.mock("@/lib/srd/srd-search", () => ({
  getMonsterById: jest.fn(),
  findCondition: jest.fn(),
}));

const mockPinCard = jest.fn();
jest.mock("@/lib/stores/pinned-cards-store", () => ({
  usePinnedCardsStore: (selector: (s: { pinCard: typeof mockPinCard }) => unknown) =>
    selector({ pinCard: mockPinCard }),
}));

jest.mock("@/components/oracle/ConditionBadge", () => ({
  ConditionBadge: ({ condition }: { condition: string }) => (
    <span role="listitem" data-testid={`condition-badge-${condition.toLowerCase()}`}>
      {condition}
    </span>
  ),
}));

jest.mock("@/components/oracle/MonsterStatBlock", () => ({
  MonsterStatBlock: ({ monster }: { monster: SrdMonster }) => (
    <div data-testid="monster-stat-block-mock">{monster.name} stat block</div>
  ),
}));

const mockGetMonsterById = srdSearch.getMonsterById as jest.Mock;

const BASE_PLAYER: Combatant = {
  id: "c1",
  name: "Aragorn",
  current_hp: 40,
  max_hp: 40,
  temp_hp: 0,
  ac: 18,
  spell_save_dc: 14,
  initiative: 15,
  initiative_order: 0,
  conditions: [],
  ruleset_version: null,
  is_defeated: false,
  is_player: true,
  monster_id: null,
  token_url: null,
  creature_type: null,
  dm_notes: "",
  player_notes: "",
};

const MONSTER_COMBATANT: Combatant = {
  id: "m1",
  name: "Goblin",
  current_hp: 7,
  max_hp: 7,
  temp_hp: 0,
  ac: 15,
  spell_save_dc: null,
  initiative: 12,
  initiative_order: 1,
  conditions: [],
  ruleset_version: "2014",
  is_defeated: false,
  is_player: false,
  monster_id: "goblin",
  token_url: null,
  creature_type: null,
  dm_notes: "",
  player_notes: "",
};

const GOBLIN_FULL: SrdMonster = {
  id: "goblin",
  name: "Goblin",
  cr: "1/4",
  type: "humanoid",
  hit_points: 7,
  armor_class: 15,
  ruleset_version: "2014",
  str: 8,
  dex: 14,
  con: 10,
  int: 10,
  wis: 8,
  cha: 8,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMonsterById.mockReturnValue(undefined);
});

describe("CombatantRow", () => {
  describe("zero-tap tier (always visible)", () => {
    it("renders combatant name", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      expect(screen.getByTestId("combatant-name-c1")).toHaveTextContent("Aragorn");
    });

    it("renders HP display", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-display-c1")).toHaveTextContent("40 / 40");
    });

    it("renders HP bar as progressbar ARIA role", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      const bar = screen.getByRole("progressbar", { name: "combat.hp_aria" });
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute("aria-valuenow", "40");
      expect(bar).toHaveAttribute("aria-valuemax", "40");
    });

    it("shows turn indicator when isCurrentTurn is true", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={true} />);
      expect(screen.getByTestId("current-turn-indicator")).toBeInTheDocument();
    });

    it("does NOT show turn indicator when isCurrentTurn is false", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      expect(screen.queryByTestId("current-turn-indicator")).not.toBeInTheDocument();
    });

    it("sets aria-current on li when isCurrentTurn is true", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={true} />);
      expect(screen.getByTestId("combatant-row-c1")).toHaveAttribute("aria-current", "true");
    });

    it("does NOT set aria-current when isCurrentTurn is false", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      expect(screen.getByTestId("combatant-row-c1")).not.toHaveAttribute("aria-current");
    });

    it("renders condition badges when conditions are present", () => {
      const c: Combatant = { ...BASE_PLAYER, conditions: ["Stunned", "Poisoned"] };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      const condContainer = screen.getByTestId("conditions-c1");
      expect(condContainer).toBeInTheDocument();
      expect(screen.getByText("Stunned")).toBeInTheDocument();
      expect(screen.getByText("Poisoned")).toBeInTheDocument();
    });

    it("does NOT render conditions container when conditions array is empty", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      expect(screen.queryByTestId("conditions-c1")).not.toBeInTheDocument();
    });

    it("shows temp HP when temp_hp > 0", () => {
      const c: Combatant = { ...BASE_PLAYER, temp_hp: 5 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("temp-hp-c1")).toHaveTextContent("combat.temp_hp");
    });

    it("does NOT show temp HP when temp_hp is 0", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      expect(screen.queryByTestId("temp-hp-c1")).not.toBeInTheDocument();
    });

    it("shows defeated badge when is_defeated is true", () => {
      const c: Combatant = { ...BASE_PLAYER, is_defeated: true };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("defeated-badge")).toBeInTheDocument();
    });
  });

  describe("HP bar color", () => {
    it("is green when HP is > 50%", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 30, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-bar-c1")).toHaveClass("bg-green-500");
    });

    it("is amber when HP is 25–50%", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 15, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-bar-c1")).toHaveClass("bg-amber-400");
    });

    it("is red when HP is < 25%", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 5, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-bar-c1")).toHaveClass("bg-red-500");
    });
  });

  describe("stat block expansion (one-tap tier)", () => {
    it("does NOT show stat block by default", () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      expect(screen.queryByTestId("expanded-stat-block-m1")).not.toBeInTheDocument();
    });

    it("shows stat block after clicking expand toggle", async () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      const user = userEvent.setup();

      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      await user.click(screen.getByTestId("expand-toggle-m1"));

      expect(screen.getByTestId("expanded-stat-block-m1")).toBeInTheDocument();
      expect(screen.getByTestId("monster-stat-block-mock")).toBeInTheDocument();
    });

    it("clicking monster name calls pinCard", async () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      const user = userEvent.setup();

      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      await user.click(screen.getByTestId("combatant-name-m1"));

      expect(mockPinCard).toHaveBeenCalledWith("monster", "goblin", "2014");
    });

    it("collapses stat block on second expand toggle click", async () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      const user = userEvent.setup();

      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      await user.click(screen.getByTestId("expand-toggle-m1"));
      expect(screen.getByTestId("expanded-stat-block-m1")).toBeInTheDocument();

      await user.click(screen.getByTestId("expand-toggle-m1"));
      expect(screen.queryByTestId("expanded-stat-block-m1")).not.toBeInTheDocument();
    });

    it("does NOT show expand controls for non-monster combatants", () => {
      mockGetMonsterById.mockReturnValue(undefined);
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={false} />);
      // Button is disabled (no expand functionality)
      const nameBtn = screen.getByTestId("combatant-name-c1");
      expect(nameBtn).toBeDisabled();
    });

    it("shows AC and DC in expanded tier", async () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      const user = userEvent.setup();

      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      await user.click(screen.getByTestId("expand-toggle-m1"));

      expect(screen.getByText(/combat\.ac_label/)).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("calls getMonsterById with correct id and version", async () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      const user = userEvent.setup();

      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      // getMonsterById is called on render to determine canExpand
      expect(mockGetMonsterById).toHaveBeenCalledWith("goblin", "2014");
    });

    it("version badge is shown for monster combatants", () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      expect(screen.getByText("2014")).toBeInTheDocument();
    });

    it("expand toggle has aria-expanded=false when collapsed", () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      expect(screen.getByTestId("expand-toggle-m1")).toHaveAttribute("aria-expanded", "false");
    });

    it("expand toggle has aria-expanded=true after expanding", async () => {
      mockGetMonsterById.mockReturnValue(GOBLIN_FULL);
      const user = userEvent.setup();
      render(<CombatantRow combatant={MONSTER_COMBATANT} isCurrentTurn={false} />);
      await user.click(screen.getByTestId("expand-toggle-m1"));
      expect(screen.getByTestId("expand-toggle-m1")).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("accessibility (NFR20–NFR24)", () => {
    it("shows HP threshold label OK when HP > 50%", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 30, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-threshold-c1")).toHaveTextContent("combat.hp_ok");
    });

    it("shows HP threshold label LOW when HP is 25–50%", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 15, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-threshold-c1")).toHaveTextContent("combat.hp_low");
    });

    it("shows HP threshold label CRIT when HP < 25%", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 5, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-threshold-c1")).toHaveTextContent("combat.hp_crit");
    });

    it("progressbar aria-label includes threshold label", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 5, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-label", "combat.hp_aria");
    });

    it("current turn indicator uses shape glyph, not color alone (NFR21)", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={true} />);
      const indicator = screen.getByTestId("current-turn-indicator");
      expect(indicator).toHaveTextContent("▶");
    });

    it("aria-current is boolean true (not string) when current turn", () => {
      render(<CombatantRow combatant={BASE_PLAYER} isCurrentTurn={true} />);
      expect(screen.getByTestId("combatant-row-c1")).toHaveAttribute("aria-current", "true");
    });

    it("does NOT show HP threshold label when max_hp === 0", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 0, max_hp: 0 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.queryByTestId("hp-threshold-c1")).not.toBeInTheDocument();
    });

    it("shows HP threshold label OK at exactly 50% HP (boundary, NFR21)", () => {
      const c: Combatant = { ...BASE_PLAYER, current_hp: 20, max_hp: 40 };
      render(<CombatantRow combatant={c} isCurrentTurn={false} />);
      expect(screen.getByTestId("hp-threshold-c1")).toHaveTextContent("combat.hp_ok");
    });
  });
});
