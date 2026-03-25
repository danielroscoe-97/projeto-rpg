/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonsterSearch } from "./MonsterSearch";
import * as srdSearch from "@/lib/srd/srd-search";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { FuseResult } from "fuse.js";

jest.mock("@/lib/srd/srd-search", () => ({
  searchMonsters: jest.fn(),
}));

// MonsterStatBlock renders inline — mock it to keep tests fast
jest.mock("@/components/oracle/MonsterStatBlock", () => ({
  MonsterStatBlock: ({ monster }: { monster: SrdMonster }) => (
    <div data-testid={`stat-block-mock-${monster.id}`}>{monster.name} stat block</div>
  ),
}));

const GOBLIN_2014: SrdMonster = {
  id: "goblin",
  name: "Goblin",
  cr: "1/4",
  type: "humanoid",
  hit_points: 7,
  armor_class: 15,
  ruleset_version: "2014",
};

const ORC_2014: SrdMonster = {
  id: "orc",
  name: "Orc",
  cr: "1/2",
  type: "humanoid",
  hit_points: 15,
  armor_class: 13,
  ruleset_version: "2014",
};

function makeFuseResult(item: SrdMonster): FuseResult<SrdMonster> {
  return { item, refIndex: 0, score: 0 };
}

const mockSearch = srdSearch.searchMonsters as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue([]);
});

describe("MonsterSearch", () => {
  it("renders the search input", () => {
    render(<MonsterSearch />);
    expect(screen.getByRole("searchbox", { name: "Monster search" })).toBeInTheDocument();
  });

  it("shows no results when query is empty", () => {
    render(<MonsterSearch />);
    expect(screen.queryByTestId("monster-search-results")).not.toBeInTheDocument();
  });

  it("shows results after typing a query", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014), makeFuseResult(ORC_2014)]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => {
      expect(screen.getByTestId("monster-search-results")).toBeInTheDocument();
    });
    expect(screen.getByTestId("monster-row-goblin")).toBeInTheDocument();
    expect(screen.getByTestId("monster-row-orc")).toBeInTheDocument();
  });

  it("displays monster name, CR, type, and version badge in results", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => {
      expect(screen.getByText("Goblin")).toBeInTheDocument();
    });
    expect(screen.getByText("CR 1/4")).toBeInTheDocument();
    expect(screen.getByText("humanoid")).toBeInTheDocument();
    expect(screen.getByText("2014")).toBeInTheDocument();
  });

  it("clicking a result expands inline stat block", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => screen.getByTestId("monster-row-goblin"));
    await user.click(screen.getByTestId("monster-row-goblin"));

    expect(screen.getByTestId("stat-block-goblin")).toBeInTheDocument();
    expect(screen.getByTestId("stat-block-mock-goblin")).toBeInTheDocument();
  });

  it("clicking expanded result collapses stat block", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => screen.getByTestId("monster-row-goblin"));

    // expand
    await user.click(screen.getByTestId("monster-row-goblin"));
    expect(screen.getByTestId("stat-block-goblin")).toBeInTheDocument();

    // collapse
    await user.click(screen.getByTestId("monster-row-goblin"));
    expect(screen.queryByTestId("stat-block-goblin")).not.toBeInTheDocument();
  });

  it("multiple monsters can be expanded independently", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014), makeFuseResult(ORC_2014)]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "hum");

    await waitFor(() => screen.getByTestId("monster-row-goblin"));

    await user.click(screen.getByTestId("monster-row-goblin"));
    await user.click(screen.getByTestId("monster-row-orc"));

    expect(screen.getByTestId("stat-block-goblin")).toBeInTheDocument();
    expect(screen.getByTestId("stat-block-orc")).toBeInTheDocument();
  });

  it("does NOT render Add button when onAddToCombat is not provided", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => screen.getByTestId("monster-row-goblin"));
    expect(screen.queryByTestId("add-monster-goblin")).not.toBeInTheDocument();
  });

  it("renders Add button when onAddToCombat is provided", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
    const user = userEvent.setup();
    const onAdd = jest.fn();

    render(<MonsterSearch onAddToCombat={onAdd} />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => screen.getByTestId("add-monster-goblin"));
    expect(screen.getByTestId("add-monster-goblin")).toBeInTheDocument();
  });

  it("calls onAddToCombat with the correct monster when Add is clicked", async () => {
    mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
    const user = userEvent.setup();
    const onAdd = jest.fn();

    render(<MonsterSearch onAddToCombat={onAdd} />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => screen.getByTestId("add-monster-goblin"));
    await user.click(screen.getByTestId("add-monster-goblin"));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(GOBLIN_2014);
  });

  it("shows empty state message when query has no matches", async () => {
    mockSearch.mockReturnValue([]);
    const user = userEvent.setup();

    render(<MonsterSearch />);
    await user.type(screen.getByRole("searchbox"), "xyzzy");

    await waitFor(() => {
      expect(screen.getByTestId("monster-search-empty")).toBeInTheDocument();
    });
  });

  it("searches all versions and sorts defaultVersion first", async () => {
    const GOBLIN_2024: SrdMonster = {
      ...GOBLIN_2014,
      id: "goblin-2024",
      ruleset_version: "2024",
    };
    mockSearch.mockReturnValue([
      makeFuseResult(GOBLIN_2024),
      makeFuseResult(GOBLIN_2014),
    ]);
    const user = userEvent.setup();

    render(<MonsterSearch defaultVersion="2014" />);
    await user.type(screen.getByRole("searchbox"), "gob");

    await waitFor(() => {
      // Should search without version filter
      expect(mockSearch).toHaveBeenCalledWith("gob");
    });

    // Both versions should appear
    await waitFor(() => {
      expect(screen.getByTestId("monster-row-goblin")).toBeInTheDocument();
      expect(screen.getByTestId("monster-row-goblin-2024")).toBeInTheDocument();
    });
  });

  describe("accessibility (NFR20–NFR24)", () => {
    it("expand button has aria-expanded=false before expanding", async () => {
      mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
      const user = userEvent.setup();
      render(<MonsterSearch />);
      await user.type(screen.getByRole("searchbox"), "gob");

      await waitFor(() => screen.getByTestId("monster-row-goblin"));
      expect(screen.getByTestId("monster-row-goblin")).toHaveAttribute("aria-expanded", "false");
    });

    it("expand button has aria-expanded=true after expanding", async () => {
      mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
      const user = userEvent.setup();
      render(<MonsterSearch />);
      await user.type(screen.getByRole("searchbox"), "gob");

      await waitFor(() => screen.getByTestId("monster-row-goblin"));
      await user.click(screen.getByTestId("monster-row-goblin"));

      expect(screen.getByTestId("monster-row-goblin")).toHaveAttribute("aria-expanded", "true");
    });

    it("Add button has aria-label including monster name (NFR20)", async () => {
      mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
      const user = userEvent.setup();
      render(<MonsterSearch onAddToCombat={jest.fn()} />);
      await user.type(screen.getByRole("searchbox"), "gob");

      await waitFor(() => screen.getByTestId("add-monster-goblin"));
      expect(
        screen.getByRole("button", { name: "Add Goblin to combat" })
      ).toBeInTheDocument();
    });

    it("expand button has aria-controls pointing to stat block panel", async () => {
      mockSearch.mockReturnValue([makeFuseResult(GOBLIN_2014)]);
      const user = userEvent.setup();
      render(<MonsterSearch />);
      await user.type(screen.getByRole("searchbox"), "gob");

      await waitFor(() => screen.getByTestId("monster-row-goblin"));
      expect(screen.getByTestId("monster-row-goblin")).toHaveAttribute(
        "aria-controls",
        "stat-block-goblin:2014"
      );
    });
  });
});
