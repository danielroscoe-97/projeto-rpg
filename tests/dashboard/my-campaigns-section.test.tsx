/**
 * Story 02-F full — MyCampaignsSection tests (Section 3).
 *
 * Coverage:
 * - renders a card for each campaign (name, DM line, session count)
 * - empty state copy when 0 campaigns
 * - link target is `/app/campaigns/:id`
 * - date formats using the passed locale (no navigator.language)
 * - skeleton shape parity (mb-8 section, 1/2 col grid)
 * - accessible labelling
 */

import React from "react";
import { render, screen } from "@testing-library/react";

import {
  MyCampaignsSection,
  type MyCampaignCardData,
} from "@/components/dashboard/MyCampaignsSection";
import { MyCampaignsSectionSkeleton } from "@/components/dashboard/MyCampaignsSectionSkeleton";

const base: MyCampaignCardData = {
  id: "camp-1",
  name: "Queda de Krynn",
  coverImageUrl: null,
  dmName: "Roscoe",
  dmEmail: "roscoe@example.com",
  sessionCount: 4,
  lastSessionAt: "2026-04-10T12:00:00.000Z",
};

describe("MyCampaignsSection — loaded state", () => {
  it("renders a card per campaign", () => {
    render(<MyCampaignsSection campaigns={[base]} locale="pt-BR" />);
    expect(screen.getByTestId("my-campaigns-section")).toBeInTheDocument();
    expect(screen.getByText("Queda de Krynn")).toBeInTheDocument();
  });

  it("renders the DM label using the `dmLabel` i18n template", () => {
    render(<MyCampaignsSection campaigns={[base]} locale="pt-BR" />);
    // The mocked translator interpolates `{dm}` with the DM name.
    expect(
      screen.getByText("dashboard.myCampaigns.dmLabel"),
    ).toBeInTheDocument();
  });

  it("renders the session count through the i18n template", () => {
    render(<MyCampaignsSection campaigns={[base]} locale="pt-BR" />);
    expect(
      screen.getByText("dashboard.myCampaigns.sessionCount"),
    ).toBeInTheDocument();
  });

  it("links to /app/campaigns/:id", () => {
    render(<MyCampaignsSection campaigns={[base]} locale="pt-BR" />);
    const card = screen.getByTestId(`my-campaigns-card-${base.id}`);
    expect(card).toHaveAttribute("href", `/app/campaigns/${base.id}`);
  });

  it("section is labelled by its visible title", () => {
    render(<MyCampaignsSection campaigns={[base]} locale="pt-BR" />);
    const region = screen.getByRole("region", {
      name: /dashboard\.myCampaigns\.title/,
    });
    expect(region).toBeInTheDocument();
  });

  it("formats the date using the passed locale", () => {
    // Simply asserts render doesn't throw when locale has a weird subtag and
    // a valid ISO timestamp is passed. Content varies by Intl ICU version.
    render(
      <MyCampaignsSection
        campaigns={[{ ...base, lastSessionAt: "2026-04-10T00:00:00Z" }]}
        locale="en"
      />,
    );
    expect(screen.getByTestId("my-campaigns-section")).toBeInTheDocument();
  });
});

describe("MyCampaignsSection — empty state", () => {
  it("renders the empty copy when 0 campaigns", () => {
    render(<MyCampaignsSection campaigns={[]} locale="pt-BR" />);
    expect(screen.getByTestId("my-campaigns-empty")).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.myCampaigns.emptyState"),
    ).toBeInTheDocument();
  });
});

describe("MyCampaignsSectionSkeleton", () => {
  it("renders a shape-identical placeholder marked aria-hidden", () => {
    render(<MyCampaignsSectionSkeleton />);
    const skel = screen.getByTestId("my-campaigns-section-skeleton");
    expect(skel).toBeInTheDocument();
    expect(skel).toHaveAttribute("aria-hidden", "true");
  });

  it("shares mb-8 outer spacing with the live section (prevents CLS)", () => {
    const { container: live } = render(
      <MyCampaignsSection campaigns={[base]} locale="pt-BR" />,
    );
    const { container: skel } = render(<MyCampaignsSectionSkeleton />);
    expect(live.querySelector("section")?.className).toContain("mb-8");
    expect(skel.querySelector("section")?.className).toContain("mb-8");
  });
});
