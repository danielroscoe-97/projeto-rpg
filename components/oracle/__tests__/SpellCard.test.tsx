import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpellCard, formatSpellLevel } from "../SpellCard";
import type { SrdSpell } from "@/lib/srd/srd-loader";

const baseSpell: SrdSpell = {
  id: "fireball",
  name: "Fireball",
  ruleset_version: "2024",
  level: 3,
  school: "Evocation",
  casting_time: "1 action",
  range: "150 feet",
  components: "V, S, M (a tiny ball of bat guano and sulfur)",
  duration: "Instantaneous",
  description: "A bright streak flashes from your pointing finger.\n\nSecond paragraph here.",
  higher_levels: "When you cast this spell using a spell slot of 4th level or higher...",
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

const concentrationSpell: SrdSpell = {
  ...baseSpell,
  id: "bless",
  name: "Bless",
  level: 1,
  school: "Enchantment",
  duration: "1 minute",
  concentration: true,
  ritual: false,
  higher_levels: null,
  classes: ["Cleric", "Paladin"],
};

const cantripSpell: SrdSpell = {
  ...baseSpell,
  id: "firebolt",
  name: "Fire Bolt",
  level: 0,
  school: "Evocation",
  higher_levels: null,
  concentration: false,
  ritual: false,
};

const ritualSpell: SrdSpell = {
  ...baseSpell,
  id: "detect-magic",
  name: "Detect Magic",
  level: 1,
  school: "Divination",
  ritual: true,
  concentration: true,
  higher_levels: null,
};

describe("formatSpellLevel", () => {
  it("formats cantrip (level 0)", () => {
    expect(formatSpellLevel(0, "Evocation")).toBe("Evocation Cantrip");
  });

  it("formats 1st level", () => {
    expect(formatSpellLevel(1, "Abjuration")).toBe("1st-level Abjuration");
  });

  it("formats 2nd level", () => {
    expect(formatSpellLevel(2, "Illusion")).toBe("2nd-level Illusion");
  });

  it("formats 3rd level", () => {
    expect(formatSpellLevel(3, "Evocation")).toBe("3rd-level Evocation");
  });

  it("formats 4th level and above with 'th'", () => {
    expect(formatSpellLevel(4, "Conjuration")).toBe("4th-level Conjuration");
    expect(formatSpellLevel(9, "Necromancy")).toBe("9th-level Necromancy");
  });
});

describe("SpellCard", () => {
  describe("inline variant", () => {
    it("renders spell name", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-name")).toHaveTextContent("Fireball");
    });

    it("renders level and school subtitle", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-level-school")).toHaveTextContent(
        "3rd-level Evocation"
      );
    });

    it("renders cantrip subtitle", () => {
      render(<SpellCard spell={cantripSpell} />);
      expect(screen.getByTestId("spell-level-school")).toHaveTextContent(
        "Evocation Cantrip"
      );
    });

    it("renders casting time", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-properties")).toHaveTextContent(
        "1 action"
      );
    });

    it("renders range", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-properties")).toHaveTextContent(
        "150 feet"
      );
    });

    it("renders components", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-properties")).toHaveTextContent(
        "V, S, M"
      );
    });

    it("renders duration without concentration prefix", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-properties")).toHaveTextContent(
        "Instantaneous"
      );
    });

    it("renders duration with Concentration prefix when concentration=true", () => {
      render(<SpellCard spell={concentrationSpell} />);
      expect(screen.getByTestId("spell-properties")).toHaveTextContent(
        "Concentration, 1 minute"
      );
    });

    it("renders description text", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-description")).toHaveTextContent(
        "A bright streak flashes"
      );
    });

    it("shows At Higher Levels when present", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-higher-levels")).toBeInTheDocument();
      expect(screen.getByTestId("spell-higher-levels")).toHaveTextContent(
        "At Higher Levels"
      );
    });

    it("hides At Higher Levels when null", () => {
      render(<SpellCard spell={concentrationSpell} />);
      expect(screen.queryByTestId("spell-higher-levels")).not.toBeInTheDocument();
    });

    it("renders classes list", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.getByTestId("spell-classes")).toHaveTextContent(
        "Sorcerer, Wizard"
      );
    });

    it("does not render toolbar in inline variant", () => {
      render(<SpellCard spell={baseSpell} />);
      expect(screen.queryByTestId("spell-pin-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spell-minimize-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("spell-close-btn")).not.toBeInTheDocument();
    });
  });

  describe("card variant", () => {
    it("renders toolbar buttons when callbacks provided", () => {
      render(
        <SpellCard
          spell={baseSpell}
          variant="card"
          onPin={jest.fn()}
          onMinimize={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("spell-pin-btn")).toBeInTheDocument();
      expect(screen.getByTestId("spell-minimize-btn")).toBeInTheDocument();
      expect(screen.getByTestId("spell-close-btn")).toBeInTheDocument();
    });

    it("calls onClose when close button clicked", async () => {
      const onClose = jest.fn();
      render(
        <SpellCard spell={baseSpell} variant="card" onClose={onClose} />
      );
      await userEvent.click(screen.getByTestId("spell-close-btn"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onPin when pin button clicked", async () => {
      const onPin = jest.fn();
      render(<SpellCard spell={baseSpell} variant="card" onPin={onPin} />);
      await userEvent.click(screen.getByTestId("spell-pin-btn"));
      expect(onPin).toHaveBeenCalledTimes(1);
    });

    it("calls onMinimize when minimize button clicked", async () => {
      const onMinimize = jest.fn();
      render(
        <SpellCard spell={baseSpell} variant="card" onMinimize={onMinimize} />
      );
      await userEvent.click(screen.getByTestId("spell-minimize-btn"));
      expect(onMinimize).toHaveBeenCalledTimes(1);
    });
  });

  describe("badges", () => {
    it("shows Ritual badge when ritual=true", () => {
      render(<SpellCard spell={ritualSpell} />);
      expect(screen.getByTestId("spell-badges")).toHaveTextContent("Ritual");
    });

    it("shows Concentration badge when concentration=true", () => {
      render(<SpellCard spell={concentrationSpell} />);
      expect(screen.getByTestId("spell-badges")).toHaveTextContent(
        "Concentration"
      );
    });

    it("hides badges section when neither ritual nor concentration", () => {
      render(<SpellCard spell={{ ...baseSpell, ritual: false, concentration: false }} />);
      expect(screen.queryByTestId("spell-badges")).not.toBeInTheDocument();
    });
  });
});
