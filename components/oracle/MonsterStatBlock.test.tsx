/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MonsterStatBlock } from "./MonsterStatBlock";
import type { SrdMonster } from "@/lib/srd/srd-loader";

// ---------------------------------------------------------------------------
// Mock LinkedText so MonsterStatBlock tests stay unit-level
// (LinkedText has its own test suite)
// ---------------------------------------------------------------------------
jest.mock("./LinkedText", () => ({
  LinkedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/dice/ClickableRoll", () => ({
  ClickableRoll: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// ---------------------------------------------------------------------------
// Mock srd-search singletons (empty by default — no links rendered)
// ---------------------------------------------------------------------------
jest.mock("@/lib/srd/srd-search", () => ({
  getAllSpells: jest.fn(() => []),
  getAllConditions: jest.fn(() => []),
}));

// ---------------------------------------------------------------------------
// Mock pinned-cards-store
// ---------------------------------------------------------------------------
jest.mock("@/lib/stores/pinned-cards-store", () => ({
  usePinnedCardsStore: jest.fn(() => jest.fn()),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GOBLIN: SrdMonster = {
  id: "goblin",
  name: "Goblin",
  cr: "1/4",
  type: "humanoid",
  hit_points: 7,
  armor_class: 15,
  ruleset_version: "2014",
  size: "Small",
  alignment: "neutral evil",
  hp_formula: "2d6",
  speed: { walk: "30 ft." },
  str: 8,
  dex: 14,
  con: 10,
  int: 10,
  wis: 8,
  cha: 8,
  saving_throws: null,
  skills: { stealth: 6 },
  damage_vulnerabilities: null,
  damage_resistances: null,
  damage_immunities: null,
  condition_immunities: null,
  senses: "darkvision 60 ft., passive Perception 9",
  languages: "Common, Goblin",
  xp: 50,
  special_abilities: [
    { name: "Nimble Escape", desc: "The goblin can take the Disengage or Hide action as a bonus action." },
  ],
  actions: [
    { name: "Scimitar", desc: "Melee Weapon Attack: +4 to hit. Hit: 5 (1d6+2) slashing damage.", attack_bonus: 4 },
    { name: "Shortbow", desc: "Ranged Weapon Attack: +4 to hit. Hit: 5 (1d6+2) piercing damage.", attack_bonus: 4 },
  ],
  legendary_actions: null,
  reactions: null,
};

const DRAGON: SrdMonster = {
  id: "ancient-red-dragon",
  name: "Ancient Red Dragon",
  cr: "24",
  type: "dragon",
  hit_points: 546,
  armor_class: 22,
  ruleset_version: "2014",
  size: "Gargantuan",
  alignment: "chaotic evil",
  hp_formula: "28d20+252",
  speed: { walk: "40 ft.", climb: "40 ft.", fly: "80 ft." },
  str: 30,
  dex: 10,
  con: 29,
  int: 18,
  wis: 15,
  cha: 23,
  saving_throws: { dex: 7, con: 16, wis: 9, cha: 13 },
  skills: { perception: 16, stealth: 7 },
  damage_vulnerabilities: null,
  damage_resistances: null,
  damage_immunities: "fire",
  condition_immunities: null,
  senses: "blindsight 60 ft., darkvision 120 ft., passive Perception 26",
  languages: "Common, Draconic",
  xp: 62000,
  special_abilities: null,
  actions: [
    { name: "Multiattack", desc: "The dragon makes three attacks: one with its bite and two with its claws." },
  ],
  legendary_actions: [
    { name: "Detect", desc: "The dragon makes a Wisdom (Perception) check." },
    { name: "Tail Attack", desc: "The dragon makes a tail attack.", attack_bonus: 17 },
  ],
  reactions: [
    { name: "Tail Attack", desc: "When a creature the dragon can see within 10 ft. attacks it, it can use its tail." },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MonsterStatBlock", () => {
  it("renders monster name", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText("Goblin")).toBeInTheDocument();
  });

  it("renders size and type", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText(/Small humanoid/)).toBeInTheDocument();
  });

  it("renders alignment when present", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText(/neutral evil/)).toBeInTheDocument();
  });

  it("renders HP with formula", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    const hpValue = screen.getByText("HP").closest(".prop-line")!.querySelector(".prop-value")!;
    expect(hpValue.textContent).toMatch(/7.*2d6/);
  });

  it("renders HP without formula when hp_formula is undefined", () => {
    const lean: SrdMonster = { ...GOBLIN, hp_formula: undefined };
    render(<MonsterStatBlock monster={lean} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders AC", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders initiative line", () => {
    // Goblin DEX=14 → mod=+2, 10+2=12
    render(<MonsterStatBlock monster={GOBLIN} />);
    const initValue = screen.getByText("Initiative").closest(".prop-line")!.querySelector(".prop-value")!;
    expect(initValue.textContent).toMatch(/\+2.*12/);
  });

  it("renders speed", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText("30 ft.")).toBeInTheDocument();
  });

  it("renders ability scores when present", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    // STR/WIS/CHA are all 8 — scores appear
    expect(screen.getAllByText("8").length).toBeGreaterThanOrEqual(3);
    // DEX is 14 — score appears
    expect(screen.getByText("14")).toBeInTheDocument();
    // DEX mod is +2 (ability table uses signed strings without parens)
    expect(screen.getAllByText("+2").length).toBeGreaterThanOrEqual(1);
    // STR mod is -1
    expect(screen.getAllByText("-1").length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render ability score section when str is not provided", () => {
    const lean: SrdMonster = { ...GOBLIN, str: undefined };
    render(<MonsterStatBlock monster={lean} />);
    expect(screen.queryByRole("table", { name: "Ability scores" })).not.toBeInTheDocument();
  });

  it("renders saving throw proficiency in ability table for dragon", () => {
    render(<MonsterStatBlock monster={DRAGON} />);
    // Dragon CON=29 → mod=+9, PB for CR24 = 7 → save = +16
    // Dragon DEX=10 → mod=+0, PB=7, but dex save is listed at 7 → +7
    // The table should contain proficient save values
    const allPlusSevens = screen.getAllByText("+7");
    expect(allPlusSevens.length).toBeGreaterThanOrEqual(1);
  });

  it("renders skills when present", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText(/Skills/)).toBeInTheDocument();
    expect(screen.getByText(/Stealth/)).toBeInTheDocument();
  });

  it("renders damage immunities when present", () => {
    render(<MonsterStatBlock monster={DRAGON} />);
    expect(screen.getByText(/Damage Immunities/)).toBeInTheDocument();
    expect(screen.getByText(/fire/)).toBeInTheDocument();
  });

  it("renders senses", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText(/darkvision 60 ft/)).toBeInTheDocument();
  });

  it("renders languages", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText(/Common, Goblin/)).toBeInTheDocument();
  });

  it("renders CR with XP and PB in 5e.tools format", () => {
    // Goblin CR=1/4 → PB=2, XP=50
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText(/1\/4 \(XP 50; PB \+2\)/)).toBeInTheDocument();
  });

  it("renders special abilities section with Traits header", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText("Traits")).toBeInTheDocument();
    // trait-name span has trailing ". "
    expect(screen.getByText(/Nimble Escape/)).toBeInTheDocument();
  });

  it("renders actions section when present", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText(/Scimitar/)).toBeInTheDocument();
  });

  it("does NOT render legendary actions section when legendary_actions is null", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(screen.queryByText("Legendary Actions")).not.toBeInTheDocument();
  });

  it("renders legendary actions when present", () => {
    render(<MonsterStatBlock monster={DRAGON} />);
    expect(screen.getByText("Legendary Actions")).toBeInTheDocument();
    expect(screen.getByText(/Detect/)).toBeInTheDocument();
  });

  it("renders reactions when present", () => {
    render(<MonsterStatBlock monster={DRAGON} />);
    expect(screen.getByText("Reactions")).toBeInTheDocument();
  });

  it("has correct ARIA label on section", () => {
    render(<MonsterStatBlock monster={GOBLIN} />);
    expect(
      screen.getByRole("region", { name: "Goblin stat block" }),
    ).toBeInTheDocument();
  });

  it("calculates ability modifiers correctly: +0 for score 10", () => {
    const monster: SrdMonster = {
      ...GOBLIN,
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    };
    render(<MonsterStatBlock monster={monster} />);
    // 6 mod cells (+0) + 6 save cells (+0) = 12 occurrences total
    const zeroMods = screen.getAllByText("+0");
    expect(zeroMods.length).toBeGreaterThanOrEqual(6);
  });

  it("calculates positive modifier: +5 for score 20", () => {
    const monster: SrdMonster = { ...GOBLIN, str: 20 };
    render(<MonsterStatBlock monster={monster} />);
    // Mod cell shows +5 (no parens in new format)
    expect(screen.getAllByText("+5").length).toBeGreaterThanOrEqual(1);
  });

  describe("variant prop", () => {
    it("renders inline variant by default (no toolbar)", () => {
      render(<MonsterStatBlock monster={GOBLIN} />);
      // No toolbar buttons unless onPin/onMinimize/onClose provided
      expect(screen.queryByRole("button", { name: "Pin card" })).not.toBeInTheDocument();
    });

    it("renders card variant toolbar buttons when callbacks are provided", () => {
      const onPin = jest.fn();
      const onMinimize = jest.fn();
      const onClose = jest.fn();
      render(
        <MonsterStatBlock
          monster={GOBLIN}
          variant="card"
          onPin={onPin}
          onMinimize={onMinimize}
          onClose={onClose}
        />,
      );
      expect(screen.getByRole("button", { name: "Pin card" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Minimize card" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close card" })).toBeInTheDocument();
    });

    it("inline variant applies stat-card-5e-inline CSS class", () => {
      const { container } = render(<MonsterStatBlock monster={GOBLIN} />);
      const section = container.querySelector("section");
      expect(section?.className).toContain("stat-card-5e-inline");
    });

    it("card variant does NOT apply stat-card-5e-inline CSS class", () => {
      const { container } = render(
        <MonsterStatBlock monster={GOBLIN} variant="card" />,
      );
      const section = container.querySelector("section");
      expect(section?.className).not.toContain("stat-card-5e-inline");
    });
  });

  describe("proficiency bonus calculation", () => {
    it("PB is 2 for CR 1/4 (Goblin)", () => {
      render(<MonsterStatBlock monster={GOBLIN} />);
      expect(screen.getByText(/PB \+2/)).toBeInTheDocument();
    });

    it("PB is 7 for CR 24 (Ancient Red Dragon)", () => {
      // Math.max(2, floor((24-1)/4) + 2) = Math.max(2, floor(5.75) + 2) = Math.max(2, 7) = 7
      render(<MonsterStatBlock monster={DRAGON} />);
      expect(screen.getByText(/PB \+7/)).toBeInTheDocument();
    });
  });
});
