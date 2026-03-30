import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CharacterCard } from "../CharacterCard";
import type { PlayerCharacter } from "@/lib/types/database";

const baseCharacter: PlayerCharacter = {
  id: "c1",
  campaign_id: "camp1",
  name: "Gimli",
  max_hp: 60,
  current_hp: 60,
  ac: 18,
  spell_save_dc: null,
  dm_notes: "",
  race: "Dwarf",
  class: "Fighter",
  level: 8,
  notes: null,
  token_url: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("CharacterCard", () => {
  it("renders character name", () => {
    render(<CharacterCard character={baseCharacter} />);
    expect(screen.getByText("Gimli")).toBeInTheDocument();
  });

  it("renders race and class", () => {
    render(<CharacterCard character={baseCharacter} />);
    expect(screen.getByText(/Dwarf Fighter/)).toBeInTheDocument();
  });

  it("renders HP badge", () => {
    render(<CharacterCard character={baseCharacter} />);
    expect(screen.getByTestId("card-stat-hp")).toHaveTextContent("HP 60");
  });

  it("renders AC badge", () => {
    render(<CharacterCard character={baseCharacter} />);
    expect(screen.getByTestId("card-stat-ac")).toHaveTextContent("AC 18");
  });

  it("renders token image when token_url is provided", () => {
    const character = { ...baseCharacter, token_url: "https://example.com/token.png" };
    render(<CharacterCard character={character} />);
    const img = screen.getByAltText("Gimli");
    expect(img).toHaveAttribute("src", "https://example.com/token.png");
    expect(img).toHaveClass("ring-2", "ring-amber-400/50");
  });

  it("renders placeholder when no token_url", () => {
    render(<CharacterCard character={baseCharacter} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<CharacterCard character={baseCharacter} onClick={handleClick} />);
    await user.click(screen.getByTestId("character-card-c1"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders level info", () => {
    render(<CharacterCard character={baseCharacter} />);
    expect(screen.getByText(/character\.level 8/)).toBeInTheDocument();
  });

  it("handles character with no race/class", () => {
    const character = { ...baseCharacter, race: null, class: null, level: null };
    render(<CharacterCard character={character} />);
    expect(screen.getByText("Gimli")).toBeInTheDocument();
  });
});
