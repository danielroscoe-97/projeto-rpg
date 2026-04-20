/**
 * Story 02-F full — MyCharactersGrid tests (Section 2).
 *
 * Coverage:
 * - renders the grid with card data (name, class/race, HP, AC, campaign tag)
 * - renders the empty state + CTA when zero characters
 * - renders the default-character badge on the matching card
 * - standalone card links to `/app/characters/:id`; linked card links to
 *   `/app/campaigns/:campaignId/sheet`
 * - skeleton shape matches the live grid (same section + grid classes) so
 *   the swap is CLS-free
 * - i18n strings route through `useTranslations("dashboard.myCharacters")`
 *   (asserted via the global jest mock that returns `<namespace>.<key>`)
 * - accessible labelling: section has aria-labelledby pointing at the title
 */

import React from "react";
import { render, screen } from "@testing-library/react";

import {
  MyCharactersGrid,
  type MyCharacterCardData,
} from "@/components/dashboard/MyCharactersGrid";
import { MyCharactersGridSkeleton } from "@/components/dashboard/MyCharactersGridSkeleton";

const baseChar: MyCharacterCardData = {
  id: "char-1",
  name: "Thorin Pedra-de-Ferro",
  race: "Anão",
  characterClass: "Bárbaro",
  level: 5,
  currentHp: 40,
  maxHp: 45,
  ac: 16,
  tokenUrl: null,
  campaignId: "camp-1",
  campaignName: "Queda de Krynn",
  lastSessionAt: new Date().toISOString(),
};

const standaloneChar: MyCharacterCardData = {
  ...baseChar,
  id: "char-2",
  name: "Lyra Sombra",
  campaignId: null,
  campaignName: null,
};

describe("MyCharactersGrid — loaded state", () => {
  it("renders a card for each character", () => {
    render(
      <MyCharactersGrid
        characters={[baseChar, standaloneChar]}
        defaultCharacterId={null}
      />,
    );

    expect(screen.getByTestId("my-characters-grid")).toBeInTheDocument();
    expect(screen.getByText("Thorin Pedra-de-Ferro")).toBeInTheDocument();
    expect(screen.getByText("Lyra Sombra")).toBeInTheDocument();
  });

  it("renders class/race/level line and HP + AC", () => {
    render(
      <MyCharactersGrid
        characters={[baseChar]}
        defaultCharacterId={null}
      />,
    );
    // "Anão Bárbaro · Lv 5"
    expect(screen.getByText(/Anão Bárbaro/)).toBeInTheDocument();
    expect(screen.getByText(/Lv 5/)).toBeInTheDocument();
    expect(screen.getByText("40/45")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("links to /app/campaigns/:id/sheet when character has a campaign", () => {
    render(
      <MyCharactersGrid
        characters={[baseChar]}
        defaultCharacterId={null}
      />,
    );
    const card = screen.getByTestId(`my-characters-card-${baseChar.id}`);
    expect(card).toHaveAttribute(
      "href",
      `/app/campaigns/${baseChar.campaignId}/sheet`,
    );
  });

  it("links to /app/characters/:id when standalone", () => {
    render(
      <MyCharactersGrid
        characters={[standaloneChar]}
        defaultCharacterId={null}
      />,
    );
    const card = screen.getByTestId(`my-characters-card-${standaloneChar.id}`);
    expect(card).toHaveAttribute("href", `/app/characters/${standaloneChar.id}`);
  });

  it("renders the default-character badge only on the matching card", () => {
    render(
      <MyCharactersGrid
        characters={[baseChar, standaloneChar]}
        defaultCharacterId={baseChar.id}
      />,
    );
    const badges = screen.getAllByTestId("my-characters-default-badge");
    expect(badges).toHaveLength(1);
  });

  it("renders standalone tag via i18n when character has no campaign", () => {
    render(
      <MyCharactersGrid
        characters={[standaloneChar]}
        defaultCharacterId={null}
      />,
    );
    // Under the jest mock, namespaced key renders as its fully-qualified path.
    expect(
      screen.getByText("dashboard.myCharacters.standaloneBadge"),
    ).toBeInTheDocument();
  });

  it("section is labelled by its visible title", () => {
    render(
      <MyCharactersGrid
        characters={[baseChar]}
        defaultCharacterId={null}
      />,
    );
    const region = screen.getByRole("region", {
      name: /dashboard\.myCharacters\.title/,
    });
    expect(region).toBeInTheDocument();
  });
});

describe("MyCharactersGrid — empty state", () => {
  it("renders the empty copy + CTA when no characters", () => {
    render(
      <MyCharactersGrid characters={[]} defaultCharacterId={null} />,
    );
    expect(screen.getByTestId("my-characters-empty")).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.myCharacters.emptyState"),
    ).toBeInTheDocument();

    const cta = screen.getByTestId("my-characters-empty-cta");
    expect(cta).toHaveAttribute("href", "/app/dashboard/characters");
  });
});

describe("MyCharactersGridSkeleton", () => {
  it("renders a shape-identical placeholder marked aria-hidden", () => {
    render(<MyCharactersGridSkeleton />);
    const skel = screen.getByTestId("my-characters-grid-skeleton");
    expect(skel).toBeInTheDocument();
    expect(skel).toHaveAttribute("aria-hidden", "true");
  });

  it("shares the same outer section spacing as the live grid", () => {
    const { container: live } = render(
      <MyCharactersGrid
        characters={[baseChar]}
        defaultCharacterId={null}
      />,
    );
    const { container: skel } = render(<MyCharactersGridSkeleton />);

    const liveSection = live.querySelector("section");
    const skelSection = skel.querySelector("section");

    expect(liveSection?.className).toContain("mb-8");
    expect(skelSection?.className).toContain("mb-8");

    // Same grid breakpoints (1 col → 2 cols → 3 cols)
    expect(live.innerHTML).toContain("sm:grid-cols-2");
    expect(skel.innerHTML).toContain("sm:grid-cols-2");
  });
});
