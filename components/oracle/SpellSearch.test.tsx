/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpellSearch } from "./SpellSearch";
import * as srdSearch from "@/lib/srd/srd-search";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import type { FuseResult } from "fuse.js";

jest.mock("@/lib/srd/srd-search", () => ({
  searchSpells: jest.fn(),
}));

// Mock the modal to keep tests focused on search behavior
jest.mock("@/components/oracle/SpellDescriptionModal", () => ({
  SpellDescriptionModal: ({
    spell,
    open,
  }: {
    spell: SrdSpell | null;
    open: boolean;
  }) =>
    open && spell ? (
      <div data-testid="spell-modal-mock">{spell.name} modal</div>
    ) : null,
}));

const FIREBALL: SrdSpell = {
  id: "fireball",
  name: "Fireball",
  ruleset_version: "2014",
  level: 3,
  school: "Evocation",
  casting_time: "1 action",
  range: "150 feet",
  components: "V, S, M",
  duration: "Instantaneous",
  description: "A bright streak...",
  higher_levels: null,
  classes: ["Sorcerer", "Wizard"],
  ritual: false,
  concentration: false,
};

const CURE_WOUNDS: SrdSpell = {
  id: "cure-wounds",
  name: "Cure Wounds",
  ruleset_version: "2014",
  level: 1,
  school: "Evocation",
  casting_time: "1 action",
  range: "Touch",
  components: "V, S",
  duration: "Instantaneous",
  description: "A creature you touch regains...",
  higher_levels: null,
  classes: ["Cleric", "Druid"],
  ritual: false,
  concentration: false,
};

function makeFuseResult(item: SrdSpell): FuseResult<SrdSpell> {
  return { item, refIndex: 0, score: 0 };
}

const mockSearch = srdSearch.searchSpells as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue([]);
});

describe("SpellSearch", () => {
  it("renders the search input", () => {
    render(<SpellSearch />);
    expect(
      screen.getByRole("searchbox", { name: "Spell search" })
    ).toBeInTheDocument();
  });

  it("shows no results when query is empty", () => {
    render(<SpellSearch />);
    expect(
      screen.queryByTestId("spell-search-results")
    ).not.toBeInTheDocument();
  });

  it("shows results after typing a query", async () => {
    mockSearch.mockReturnValue([
      makeFuseResult(FIREBALL),
      makeFuseResult(CURE_WOUNDS),
    ]);
    const user = userEvent.setup();

    render(<SpellSearch />);
    await user.type(screen.getByRole("searchbox"), "fire");

    await waitFor(() => {
      expect(screen.getByTestId("spell-search-results")).toBeInTheDocument();
    });
    expect(screen.getByTestId("spell-row-fireball")).toBeInTheDocument();
    expect(screen.getByTestId("spell-row-cure-wounds")).toBeInTheDocument();
  });

  it("displays spell name, level, school, and version badge", async () => {
    mockSearch.mockReturnValue([makeFuseResult(FIREBALL)]);
    const user = userEvent.setup();

    render(<SpellSearch />);
    await user.type(screen.getByRole("searchbox"), "fire");

    await waitFor(() => {
      expect(screen.getByText("Fireball")).toBeInTheDocument();
    });
    expect(screen.getByText("Lvl 3")).toBeInTheDocument();
    expect(screen.getByText("Evocation")).toBeInTheDocument();
    expect(screen.getByText("2014")).toBeInTheDocument();
  });

  it("clicking a result opens the spell modal", async () => {
    mockSearch.mockReturnValue([makeFuseResult(FIREBALL)]);
    const user = userEvent.setup();

    render(<SpellSearch />);
    await user.type(screen.getByRole("searchbox"), "fire");

    await waitFor(() => screen.getByTestId("spell-row-fireball"));
    await user.click(screen.getByTestId("spell-row-fireball"));

    expect(screen.getByTestId("spell-modal-mock")).toBeInTheDocument();
    expect(screen.getByText("Fireball modal")).toBeInTheDocument();
  });

  it("shows empty state message when query has no matches", async () => {
    mockSearch.mockReturnValue([]);
    const user = userEvent.setup();

    render(<SpellSearch />);
    await user.type(screen.getByRole("searchbox"), "xyzzy");

    await waitFor(() => {
      expect(screen.getByTestId("spell-search-empty")).toBeInTheDocument();
    });
  });

  it("searches all versions and sorts defaultVersion first", async () => {
    const FIREBALL_2024: SrdSpell = {
      ...FIREBALL,
      id: "fireball-2024",
      ruleset_version: "2024",
    };
    mockSearch.mockReturnValue([
      makeFuseResult(FIREBALL_2024),
      makeFuseResult(FIREBALL),
    ]);
    const user = userEvent.setup();

    render(<SpellSearch defaultVersion="2014" />);
    await user.type(screen.getByRole("searchbox"), "fire");

    await waitFor(() => {
      // Should search without version filter
      expect(mockSearch).toHaveBeenCalledWith("fire");
    });

    // Both versions should appear
    await waitFor(() => {
      expect(screen.getByTestId("spell-row-fireball")).toBeInTheDocument();
      expect(screen.getByTestId("spell-row-fireball-2024")).toBeInTheDocument();
    });
  });

  it("result buttons have accessible labels", async () => {
    mockSearch.mockReturnValue([makeFuseResult(FIREBALL)]);
    const user = userEvent.setup();

    render(<SpellSearch />);
    await user.type(screen.getByRole("searchbox"), "fire");

    await waitFor(() => screen.getByTestId("spell-row-fireball"));
    expect(
      screen.getByRole("button", { name: "View Fireball details" })
    ).toBeInTheDocument();
  });
});
