/**
 * Epic 12, Story 12.3 AC3 — non-blocking "Link to campaign" CTA.
 *
 * Covers the visibility contract for `showLinkCampaignCta` and the happy-path
 * interaction (select → submit → success banner). Complements
 * `tests/conversion/recap-actions-save-combat.test.tsx`, which pins the
 * legacy Save button behavior. Together they cover the DM recap surface.
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Combatant } from "@/lib/types/combat";
import type { CombatReport } from "@/lib/types/combat-report";
import type { SaveSignupContext } from "@/components/conversion/types";

// ---- Module-level mocks ---------------------------------------------------

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values?.name ? `${key}:${values.name}` : key,
}));
jest.mock("framer-motion", () => ({
  motion: { div: (props: Record<string, unknown>) => <div {...props} /> },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/components/conversion/RecapCtaCard", () => ({
  RecapCtaCard: () => <div data-testid="mock-recap-cta-card" />,
}));

// Supabase client mock — returns two campaigns so the dropdown populates.
const fromMock = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({
    data: [
      { id: "camp-1", name: "Krynn" },
      { id: "camp-2", name: "Avernus" },
    ],
  }),
}));
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));

import { RecapActions } from "@/components/combat/RecapActions";

function makeReport(): CombatReport {
  return {
    sessionId: "sess-1",
    durationSeconds: 10,
    rounds: 1,
    combatants: [] as Combatant[],
    mvp: null,
    outcome: "party_victory",
    xpTotal: 0,
    createdAt: new Date().toISOString(),
  } as unknown as CombatReport;
}

const GUEST_CTX: SaveSignupContext = {
  mode: "guest",
  characterName: "Thorin",
  guestCombatants: [{ id: "c-1" } as unknown as Combatant],
};

const ANON_CTX: SaveSignupContext = {
  mode: "anon",
  sessionTokenId: "tok-abc",
  campaignId: "camp-1",
  characterId: "char-1",
  characterName: "Thorin",
};

beforeEach(() => {
  fromMock.mockClear();
  (global.fetch as unknown as jest.Mock | undefined)?.mockReset?.();
});

describe("Epic 12 Story 12.3 AC3 — link-campaign CTA visibility", () => {
  it("shows the CTA only when auth DM has no campaign yet and session is persisted", async () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        sessionId="sess-1"
        // campaignId omitted (quick combat)
        // saveSignupContext omitted (auth DM)
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("recap-link-campaign-card")).toBeInTheDocument();
    });
  });

  it("does NOT show the CTA when a campaign is already linked", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        sessionId="sess-1"
        campaignId="camp-1"
      />,
    );
    expect(screen.queryByTestId("recap-link-campaign-card")).not.toBeInTheDocument();
  });

  it("does NOT show the CTA when the session isn't persisted yet", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        // sessionId omitted — eager draft creation failed / not yet set
      />,
    );
    expect(screen.queryByTestId("recap-link-campaign-card")).not.toBeInTheDocument();
  });

  it("does NOT show the CTA for guest conversion context", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        sessionId="sess-1"
        saveSignupContext={GUEST_CTX}
      />,
    );
    expect(screen.queryByTestId("recap-link-campaign-card")).not.toBeInTheDocument();
  });

  it("does NOT show the CTA for anon conversion context", () => {
    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        sessionId="sess-1"
        saveSignupContext={ANON_CTX}
      />,
    );
    expect(screen.queryByTestId("recap-link-campaign-card")).not.toBeInTheDocument();
  });
});

describe("Epic 12 Story 12.3 AC3 — link-campaign happy path", () => {
  it("posts campaignId and renders success banner after link", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ campaignId: "camp-2" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        sessionId="sess-1"
      />,
    );

    // Wait for campaigns to populate the dropdown.
    const select = await screen.findByTestId("recap-link-campaign-select");
    fireEvent.change(select, { target: { value: "camp-2" } });

    const submit = screen.getByTestId("recap-link-campaign-submit");
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByTestId("recap-link-campaign-linked")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/combat/sess-1/link-campaign",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ campaignId: "camp-2" }),
      }),
    );
  });

  it("does not mark linked if server returns unexpected campaignId in body", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ campaignId: "some-other-id" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <RecapActions
        report={makeReport()}
        onNewCombat={jest.fn()}
        sessionId="sess-1"
      />,
    );

    const select = await screen.findByTestId("recap-link-campaign-select");
    fireEvent.change(select, { target: { value: "camp-2" } });
    fireEvent.click(screen.getByTestId("recap-link-campaign-submit"));

    // Success banner must NOT appear — contract says we validate the echo.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("recap-link-campaign-linked")).not.toBeInTheDocument();
  });
});
