/**
 * Story 02-G — DefaultCharacterSettings tests.
 *
 * Coverage (3 tests):
 *  - renders a card per character
 *  - renders "current" badge on the matching default character
 *  - clicking "Tornar padrão" calls `updateDefaultCharacter` with the right id
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the server action BEFORE the component import so the component
// picks up the jest.fn() at module load.
const updateDefaultCharacterMock = jest.fn(async () => ({ ok: true as const }));
jest.mock("@/lib/user/update-default-character", () => ({
  updateDefaultCharacter: (id: string) => updateDefaultCharacterMock(id),
}));

import {
  DefaultCharacterSettings,
  type DefaultCharacterRow,
} from "@/components/dashboard/DefaultCharacterSettings";

const chars: DefaultCharacterRow[] = [
  {
    id: "char-1",
    name: "Thorin",
    race: "Anão",
    characterClass: "Bárbaro",
    level: 5,
    tokenUrl: null,
    campaignId: "camp-1",
    campaignName: "Queda de Krynn",
  },
  {
    id: "char-2",
    name: "Lyra",
    race: "Elfa",
    characterClass: "Bardo",
    level: 4,
    tokenUrl: null,
    campaignId: null,
    campaignName: null,
  },
];

describe("DefaultCharacterSettings", () => {
  beforeEach(() => {
    updateDefaultCharacterMock.mockClear();
  });

  it("renders a card per character", () => {
    render(
      <DefaultCharacterSettings
        characters={chars}
        defaultCharacterId={null}
      />,
    );
    expect(
      screen.getByTestId("dashboard.default-character.character-card-char-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("dashboard.default-character.character-card-char-2"),
    ).toBeInTheDocument();
    expect(screen.getByText("Thorin")).toBeInTheDocument();
    expect(screen.getByText("Lyra")).toBeInTheDocument();
  });

  it("renders 'current' badge only on the matching default character", () => {
    render(
      <DefaultCharacterSettings
        characters={chars}
        defaultCharacterId="char-1"
      />,
    );
    expect(
      screen.getByTestId("dashboard.default-character.current-badge-char-1"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("dashboard.default-character.current-badge-char-2"),
    ).not.toBeInTheDocument();
    // char-2 should still show the make-default button
    expect(
      screen.getByTestId("dashboard.default-character.make-default-char-2"),
    ).toBeInTheDocument();
  });

  it("clicking 'Tornar padrão' calls updateDefaultCharacter with that id", async () => {
    const user = userEvent.setup();
    render(
      <DefaultCharacterSettings
        characters={chars}
        defaultCharacterId="char-1"
      />,
    );
    const btn = screen.getByTestId(
      "dashboard.default-character.make-default-char-2",
    );
    await act(async () => {
      await user.click(btn);
    });
    expect(updateDefaultCharacterMock).toHaveBeenCalledWith("char-2");
  });
});
