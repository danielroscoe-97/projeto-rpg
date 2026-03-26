/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SpellDescriptionModal } from "./SpellDescriptionModal";
import type { SrdSpell } from "@/lib/srd/srd-loader";

const FIREBALL: SrdSpell = {
  id: "fireball",
  name: "Fireball",
  ruleset_version: "2014",
  level: 3,
  school: "Evocation",
  casting_time: "1 action",
  range: "150 feet",
  components: "V, S, M (a tiny ball of bat guano and sulfur)",
  duration: "Instantaneous",
  description: "A bright streak flashes from your pointing finger.",
  higher_levels:
    "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6.",
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

const DETECT_MAGIC: SrdSpell = {
  id: "detect-magic",
  name: "Detect Magic",
  ruleset_version: "2014",
  level: 1,
  school: "Divination",
  casting_time: "1 action",
  range: "Self",
  components: "V, S",
  duration: "Concentration, up to 10 minutes",
  description: "You sense the presence of magic within 30 feet.",
  higher_levels: null,
  classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Wizard"],
  ritual: true,
  concentration: true,
};

const CANTRIP: SrdSpell = {
  id: "fire-bolt",
  name: "Fire Bolt",
  ruleset_version: "2024",
  level: 0,
  school: "Evocation",
  casting_time: "1 action",
  range: "120 feet",
  components: "V, S",
  duration: "Instantaneous",
  description: "You hurl a mote of fire at a creature or object.",
  higher_levels: null,
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

describe("SpellDescriptionModal", () => {
  it("renders nothing when spell is null", () => {
    const { container } = render(
      <SpellDescriptionModal spell={null} open={false} onOpenChange={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders spell name", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByTestId("spell-name")).toHaveTextContent("Fireball");
  });

  it("renders level + school line for leveled spell", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByTestId("spell-level-school")).toHaveTextContent(
      "3rd-level Evocation"
    );
  });

  it("renders cantrip label for level 0", () => {
    render(
      <SpellDescriptionModal spell={CANTRIP} open={true} onOpenChange={() => {}} />
    );
    // SpellCard.formatSpellLevel produces "Evocation Cantrip" (capitalized)
    expect(screen.getByTestId("spell-level-school")).toHaveTextContent(
      "Evocation Cantrip"
    );
  });

  it("renders casting time, range, components, duration", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByText("1 action")).toBeInTheDocument();
    expect(screen.getByText("150 feet")).toBeInTheDocument();
    expect(
      screen.getByText("V, S, M (a tiny ball of bat guano and sulfur)")
    ).toBeInTheDocument();
    expect(screen.getByText("Instantaneous")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(
      screen.getByText("A bright streak flashes from your pointing finger.")
    ).toBeInTheDocument();
  });

  it("renders At Higher Levels section when present", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByTestId("spell-higher-levels")).toBeInTheDocument();
  });

  it("does NOT render At Higher Levels when null", () => {
    render(
      <SpellDescriptionModal spell={DETECT_MAGIC} open={true} onOpenChange={() => {}} />
    );
    expect(screen.queryByTestId("spell-higher-levels")).not.toBeInTheDocument();
  });

  it("shows concentration badge when concentration is true", () => {
    render(
      <SpellDescriptionModal spell={DETECT_MAGIC} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByText("Concentration")).toBeInTheDocument();
  });

  it("shows ritual badge when ritual is true", () => {
    render(
      <SpellDescriptionModal spell={DETECT_MAGIC} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByText("Ritual")).toBeInTheDocument();
  });

  it("does NOT show concentration or ritual badges when false", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.queryByTestId("spell-badges")).not.toBeInTheDocument();
  });

  it("shows class list", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByTestId("spell-classes")).toHaveTextContent(
      "Sorcerer, Wizard"
    );
  });

  it("has accessible dialog", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders pin button when onPin is provided", () => {
    const onPin = jest.fn();
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} onPin={onPin} />
    );
    expect(screen.getByTestId("spell-modal-pin-btn")).toBeInTheDocument();
  });

  it("does NOT render pin button when onPin is not provided", () => {
    render(
      <SpellDescriptionModal spell={FIREBALL} open={true} onOpenChange={() => {}} />
    );
    expect(screen.queryByTestId("spell-modal-pin-btn")).not.toBeInTheDocument();
  });
});
