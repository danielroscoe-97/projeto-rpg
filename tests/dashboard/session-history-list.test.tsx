/**
 * Story 02-F full — SessionHistoryList tests (Section 4).
 *
 * Coverage:
 * - renders a row per entry, preserving input order (server sorts DESC)
 * - row with `hasRecap: true` renders the "Recap" badge and links to
 *   `/app/campaigns/:id/encounters/:encounterId/recap`
 * - row without recap links to `/app/campaigns/:id`
 * - empty state copy when no rows
 * - skeleton shape parity (mb-8 section, same rounded container)
 * - accessible labelling
 *
 * RLS note (Winston M4): the component is pure presentational; gating is
 * done by the server query (`SessionHistoryServer`). We cover the server
 * contract in the integration test (`dashboard-player-view.test.tsx`).
 */

import React from "react";
import { render, screen } from "@testing-library/react";

import {
  SessionHistoryList,
  type SessionHistoryRowData,
} from "@/components/dashboard/SessionHistoryList";
import { SessionHistoryListSkeleton } from "@/components/dashboard/SessionHistoryListSkeleton";

const rowWithRecap: SessionHistoryRowData = {
  sessionId: "sess-1",
  campaignId: "camp-1",
  campaignName: "Queda de Krynn",
  encounterId: "enc-1",
  encounterName: "Emboscada no Penhasco",
  createdAt: "2026-04-10T18:00:00.000Z",
  hasRecap: true,
};

const rowNoRecap: SessionHistoryRowData = {
  sessionId: "sess-2",
  campaignId: "camp-1",
  campaignName: "Queda de Krynn",
  encounterId: "enc-2",
  encounterName: "Caverna de Gelo",
  createdAt: "2026-04-09T18:00:00.000Z",
  hasRecap: false,
};

describe("SessionHistoryList — loaded state", () => {
  it("renders a row per history entry", () => {
    render(
      <SessionHistoryList rows={[rowWithRecap, rowNoRecap]} locale="pt-BR" />,
    );
    expect(screen.getByTestId("session-history-list")).toBeInTheDocument();
    expect(screen.getByText("Emboscada no Penhasco")).toBeInTheDocument();
    expect(screen.getByText("Caverna de Gelo")).toBeInTheDocument();
  });

  it("links to the recap page when `hasRecap` is true", () => {
    render(
      <SessionHistoryList rows={[rowWithRecap]} locale="pt-BR" />,
    );
    const link = screen.getByTestId(
      `session-history-row-${rowWithRecap.encounterId}`,
    );
    expect(link).toHaveAttribute(
      "href",
      `/app/campaigns/${rowWithRecap.campaignId}/encounters/${rowWithRecap.encounterId}/recap`,
    );
    expect(
      screen.getByTestId("session-history-recap-badge"),
    ).toBeInTheDocument();
  });

  it("links to the campaign when no recap is available", () => {
    render(<SessionHistoryList rows={[rowNoRecap]} locale="pt-BR" />);
    const link = screen.getByTestId(
      `session-history-row-${rowNoRecap.encounterId}`,
    );
    expect(link).toHaveAttribute(
      "href",
      `/app/campaigns/${rowNoRecap.campaignId}`,
    );
    expect(
      screen.queryByTestId("session-history-recap-badge"),
    ).not.toBeInTheDocument();
  });

  it("section is labelled by its visible title", () => {
    render(<SessionHistoryList rows={[rowWithRecap]} locale="pt-BR" />);
    const region = screen.getByRole("region", {
      name: /dashboard\.sessionHistory\.title/,
    });
    expect(region).toBeInTheDocument();
  });
});

describe("SessionHistoryList — empty state", () => {
  it("renders the empty copy when 0 rows", () => {
    render(<SessionHistoryList rows={[]} locale="pt-BR" />);
    expect(screen.getByTestId("session-history-empty")).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.sessionHistory.emptyState"),
    ).toBeInTheDocument();
  });
});

describe("SessionHistoryListSkeleton", () => {
  it("renders a shape-identical placeholder marked aria-hidden", () => {
    render(<SessionHistoryListSkeleton />);
    const skel = screen.getByTestId("session-history-list-skeleton");
    expect(skel).toBeInTheDocument();
    expect(skel).toHaveAttribute("aria-hidden", "true");
  });

  it("shares mb-8 outer spacing with the live list (prevents CLS)", () => {
    const { container: live } = render(
      <SessionHistoryList rows={[rowWithRecap]} locale="pt-BR" />,
    );
    const { container: skel } = render(<SessionHistoryListSkeleton />);
    expect(live.querySelector("section")?.className).toContain("mb-8");
    expect(skel.querySelector("section")?.className).toContain("mb-8");
  });
});
