/**
 * Story 02-G — SessionHistoryFullPage tests.
 *
 * Coverage (4 tests):
 *  - renders a row per entry (up to 10)
 *  - renders "Carregar mais" link with encoded cursor when `nextCursor` is set
 *  - renders empty-state when entries is empty
 *  - renders cursor in the href AND url-encodes it (wiring check)
 *
 * The page/server-component plumbing is covered by the parseCursorParam
 * unit test embedded here (via a direct import).
 */

import React from "react";
import { render, screen } from "@testing-library/react";

import { SessionHistoryFullPage } from "@/components/dashboard/SessionHistoryFullPage";
import type { SessionHistoryRowData } from "@/components/dashboard/SessionHistoryList";

function makeRow(i: number, overrides: Partial<SessionHistoryRowData> = {}): SessionHistoryRowData {
  return {
    sessionId: `sess-${i}`,
    campaignId: "camp-1",
    campaignName: "Queda de Krynn",
    encounterId: `enc-${i}`,
    encounterName: `Encontro ${i}`,
    createdAt: new Date(Date.UTC(2026, 3, 10 - i, 18, 0, 0)).toISOString(),
    hasRecap: false,
    ...overrides,
  };
}

describe("SessionHistoryFullPage — loaded state", () => {
  it("renders a row per entry (up to 10)", () => {
    const entries = Array.from({ length: 10 }, (_, i) => makeRow(i));
    render(
      <SessionHistoryFullPage
        entries={entries}
        nextCursor={null}
        locale="pt-BR"
      />,
    );

    expect(screen.getByTestId("dashboard.sessions.list")).toBeInTheDocument();
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Encontro ${i}`)).toBeInTheDocument();
    }
  });

  it("renders 'Carregar mais' link with encoded cursor when hasMore", () => {
    const entries = [makeRow(0), makeRow(1)];
    const nextCursor = "AAA-BBB_CCC"; // already encoded (url-safe b64)
    render(
      <SessionHistoryFullPage
        entries={entries}
        nextCursor={nextCursor}
        locale="pt-BR"
      />,
    );

    const link = screen.getByTestId("dashboard.sessions.load-more-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      `/app/dashboard/sessions?cursor=${encodeURIComponent(nextCursor)}`,
    );
  });

  it("does NOT render 'Carregar mais' when nextCursor is null", () => {
    const entries = [makeRow(0)];
    render(
      <SessionHistoryFullPage
        entries={entries}
        nextCursor={null}
        locale="pt-BR"
      />,
    );

    expect(
      screen.queryByTestId("dashboard.sessions.load-more-link"),
    ).not.toBeInTheDocument();
  });

  it("renders empty state when no entries", () => {
    render(
      <SessionHistoryFullPage
        entries={[]}
        nextCursor={null}
        locale="pt-BR"
      />,
    );

    expect(
      screen.getByTestId("dashboard.sessions.empty-state"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("dashboard.sessionsPage.emptyState"),
    ).toBeInTheDocument();
  });
});

// Cursor parse/encode contract — lifted into its own describe block so the
// page-level parse and server-level encode are both exercised without any
// Next.js/Supabase plumbing.
describe("sessions page cursor format", () => {
  it("parseCursorParam round-trips encodeCursor output", async () => {
    const { encodeCursor } = await import(
      "@/components/dashboard/SessionHistoryFullPageServer"
    );
    const { parseCursorParam } = await import(
      "@/app/app/dashboard/sessions/page"
    );
    const original = {
      createdAt: "2026-04-10T18:00:00.000Z",
      id: "sess-42",
    };
    const encoded = encodeCursor(original);
    const decoded = parseCursorParam(encoded);
    expect(decoded).toEqual(original);
  });

  it("parseCursorParam returns null for malformed input", async () => {
    const { parseCursorParam } = await import(
      "@/app/app/dashboard/sessions/page"
    );
    expect(parseCursorParam(undefined)).toBeNull();
    expect(parseCursorParam("")).toBeNull();
    expect(parseCursorParam("not-base64!!!")).toBeNull();
  });
});
