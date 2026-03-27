/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LinkedText } from "../LinkedText";
import * as srdSearch from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/srd/srd-search", () => ({
  getAllSpells: jest.fn(),
  getAllConditions: jest.fn(),
}));

// usePinnedCardsStore: mock the Zustand selector pattern (s) => s.pinCard
const mockPinCard = jest.fn();
jest.mock("@/lib/stores/pinned-cards-store", () => ({
  usePinnedCardsStore: jest.fn(),
}));

const mockedGetAllSpells = srdSearch.getAllSpells as jest.MockedFunction<typeof srdSearch.getAllSpells>;
const mockedGetAllConditions = srdSearch.getAllConditions as jest.MockedFunction<typeof srdSearch.getAllConditions>;
const mockedUsePinnedCardsStore = usePinnedCardsStore as jest.MockedFunction<typeof usePinnedCardsStore>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SPELL_FIRE_BOLT = {
  id: "fire-bolt",
  name: "Fire Bolt",
  ruleset_version: "2014" as const,
  level: 0,
  school: "Evocation",
  casting_time: "1 action",
  range: "120 feet",
  components: "V, S",
  duration: "Instantaneous",
  description: "You hurl a mote of fire.",
  higher_levels: null,
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

const SPELL_LIGHTNING_BOLT = {
  id: "lightning-bolt",
  name: "Lightning Bolt",
  ruleset_version: "2014" as const,
  level: 3,
  school: "Evocation",
  casting_time: "1 action",
  range: "Self (100-foot line)",
  components: "V, S, M",
  duration: "Instantaneous",
  description: "A stroke of lightning forming a line.",
  higher_levels: null,
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

const SPELL_LIGHT = {
  id: "light",
  name: "Light",
  ruleset_version: "2014" as const,
  level: 0,
  school: "Evocation",
  casting_time: "1 action",
  range: "Touch",
  components: "V, M",
  duration: "1 hour",
  description: "You touch one object.",
  higher_levels: null,
  classes: ["Bard", "Cleric", "Wizard"],
  ritual: false,
  concentration: false,
};

const SPELL_FIREBALL = {
  id: "fireball",
  name: "Fireball",
  ruleset_version: "2014" as const,
  level: 3,
  school: "Evocation",
  casting_time: "1 action",
  range: "150 feet",
  components: "V, S, M",
  duration: "Instantaneous",
  description: "A bright streak flashes from your pointing finger.",
  higher_levels: null,
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

const CONDITION_BLINDED = {
  id: "blinded",
  name: "Blinded",
  description:
    "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage.",
};

const CONDITION_POISONED = {
  id: "poisoned",
  name: "Poisoned",
  description: "A poisoned creature has disadvantage on attack rolls and ability checks.",
};

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function setupMocks(
  spells = [SPELL_FIRE_BOLT, SPELL_LIGHTNING_BOLT, SPELL_LIGHT, SPELL_FIREBALL],
  conditions = [CONDITION_BLINDED, CONDITION_POISONED],
) {
  mockedGetAllSpells.mockReturnValue(spells as ReturnType<typeof srdSearch.getAllSpells>);
  mockedGetAllConditions.mockReturnValue(conditions as ReturnType<typeof srdSearch.getAllConditions>);
  (mockedUsePinnedCardsStore as unknown as jest.Mock).mockImplementation((selector: (s: { pinCard: typeof mockPinCard; cards: never[]; nextZIndex: number }) => unknown) =>
    selector({ pinCard: mockPinCard, cards: [], nextZIndex: 1 }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LinkedText", () => {
  describe("plain text", () => {
    it("renders plain text when no matches exist", () => {
      render(<LinkedText text="No spells here." rulesetVersion="2014" />);
      expect(screen.getByText("No spells here.")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders empty string without crashing", () => {
      render(<LinkedText text="" rulesetVersion="2014" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("spell linking", () => {
    it("renders a spell name as a clickable button", () => {
      render(
        <LinkedText text="The wizard casts Fire Bolt at the goblin." rulesetVersion="2014" />,
      );
      const btn = screen.getByRole("button", { name: "Fire Bolt" });
      expect(btn).toBeInTheDocument();
    });

    it("calls pinCard with correct args when a spell link is clicked", () => {
      render(
        <LinkedText text="Cast Fire Bolt to attack." rulesetVersion="2014" />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Fire Bolt" }));
      expect(mockPinCard).toHaveBeenCalledWith("spell", "fire-bolt", "2014");
    });

    it("handles multiple spells in a comma-separated list", () => {
      render(
        <LinkedText
          text="Cantrips: Fire Bolt, Light."
          rulesetVersion="2014"
        />,
      );
      expect(screen.getByRole("button", { name: "Fire Bolt" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    });

    it("matches spell names case-insensitively", () => {
      render(<LinkedText text="Cast fire bolt now." rulesetVersion="2014" />);
      // Button text matches original casing from text
      expect(screen.getByRole("button", { name: "fire bolt" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "fire bolt" }));
      expect(mockPinCard).toHaveBeenCalledWith("spell", "fire-bolt", "2014");
    });

    it("only shows spells matching the provided rulesetVersion", () => {
      mockedGetAllSpells.mockReturnValue([
        { ...SPELL_FIRE_BOLT, ruleset_version: "2014" },
        { ...SPELL_FIREBALL, ruleset_version: "2024" },
      ] as ReturnType<typeof srdSearch.getAllSpells>);

      render(
        <LinkedText text="Fireball and Fire Bolt." rulesetVersion="2014" />,
      );

      // Fire Bolt is 2014 — should be linked
      expect(screen.getByRole("button", { name: "Fire Bolt" })).toBeInTheDocument();
      // Fireball is 2024 — should NOT be linked for rulesetVersion 2014
      expect(screen.queryByRole("button", { name: "Fireball" })).not.toBeInTheDocument();
    });
  });

  describe("condition linking", () => {
    it("renders a condition name as a clickable button", () => {
      render(
        <LinkedText text="The target is Blinded until the end of its turn." rulesetVersion="2014" />,
      );
      expect(screen.getByRole("button", { name: "Blinded" })).toBeInTheDocument();
    });

    it("calls pinCard with correct args when a condition link is clicked", () => {
      render(
        <LinkedText text="Target becomes Poisoned." rulesetVersion="2014" />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Poisoned" }));
      expect(mockPinCard).toHaveBeenCalledWith("condition", "poisoned", "2014");
    });
  });

  describe("word boundary safety", () => {
    it("does NOT link 'Light' when it appears inside 'Lightning Bolt'", () => {
      // "Lightning Bolt" should be matched first (longest-first), "Light" should not match inside it
      render(
        <LinkedText text="A Lightning Bolt crackles." rulesetVersion="2014" />,
      );
      // Lightning Bolt button exists (matched as a whole)
      expect(screen.getByRole("button", { name: "Lightning Bolt" })).toBeInTheDocument();
      // Should not have a separate "Light" button — word boundary prevents it
      expect(screen.queryByRole("button", { name: "Light" })).not.toBeInTheDocument();
      // Only one button in the whole sentence
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("does link 'Light' when it appears as a standalone word", () => {
      render(
        <LinkedText text="Cast Light on the sword." rulesetVersion="2014" />,
      );
      expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    });

    it("does not match a spell name embedded in another word", () => {
      // "Fireball" should not match inside "Fireballed" (hypothetical word)
      render(
        <LinkedText text="The dragon Fireballed the party." rulesetVersion="2014" />,
      );
      // "Fireball" alone with word boundary — "Fireballed" has 'ed' suffix so \b after 'l' won't match
      expect(screen.queryByRole("button", { name: "Fireball" })).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("link buttons have role=button and aria-haspopup=dialog", () => {
      render(<LinkedText text="Cast Fire Bolt." rulesetVersion="2014" />);
      const btn = screen.getByRole("button", { name: "Fire Bolt" });
      expect(btn).toHaveAttribute("aria-haspopup", "dialog");
    });
  });

  describe("tooltip", () => {
    it("shows spell tooltip after 300ms hover", async () => {
      jest.useFakeTimers();
      render(<LinkedText text="Cast Fire Bolt." rulesetVersion="2014" />);
      const btn = screen.getByRole("button", { name: "Fire Bolt" });

      fireEvent.mouseEnter(btn);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(screen.getByRole("tooltip")).toHaveTextContent("Fire Bolt — Cantrip Evocation");

      jest.useRealTimers();
    });

    it("hides tooltip on mouse leave", async () => {
      jest.useFakeTimers();
      render(<LinkedText text="Cast Fire Bolt." rulesetVersion="2014" />);
      const btn = screen.getByRole("button", { name: "Fire Bolt" });

      fireEvent.mouseEnter(btn);
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      fireEvent.mouseLeave(btn);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      jest.useRealTimers();
    });

    it("shows condition tooltip with first sentence of description", async () => {
      jest.useFakeTimers();
      render(<LinkedText text="Target is Blinded." rulesetVersion="2014" />);
      const btn = screen.getByRole("button", { name: "Blinded" });

      fireEvent.mouseEnter(btn);
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.textContent).toMatch(/A blinded creature can't see/);

      jest.useRealTimers();
    });
  });
});
