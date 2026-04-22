/**
 * RTL tests for components/upsell/BecomeDmCta.tsx — Epic 04 Story 04-E.
 *
 * Covers:
 *   - Copy variant by role (player vs both) via the translation key emitted.
 *   - Sessions-played interpolated into the rich-text description.
 *   - Analytics lifecycle: cta_shown on mount, cta_clicked on primary,
 *     cta_dismissed on secondary (with post-increment count).
 *   - Dismissal gate: if shouldShowCta() returns false at mount, the card
 *     self-unmounts without firing cta_shown.
 *   - Primary click navigates to /app/become-dm (stub for Story 04-F).
 *
 * Mocks follow the project pattern (see tests/conversion/recap-cta-anon.test.tsx):
 * next-intl is mocked INLINE with a local `t.rich` so the emitted DOM lets us
 * assert both the translation key and the rich-wrap outcome. We don't rely
 * on `NextIntlClientProvider` + real messages because the global
 * jest.setup.ts mock doesn't export `NextIntlClientProvider` (the project
 * tests components in isolation).
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// next-intl — supports `.rich` so the description renders the em() wrapper.
// ---------------------------------------------------------------------------

jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const tFn = (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!params) return fullKey;
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        fullKey,
      );
    };
    (
      tFn as unknown as { rich: (...a: unknown[]) => React.ReactNode }
    ).rich = (key: string, params: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const em = params?.em as
        | ((chunks: React.ReactNode) => React.ReactNode)
        | undefined;
      const sessionsPlayed = params?.sessionsPlayed as number | undefined;
      return (
        <>
          <span data-testid="rich-key">{fullKey}</span>
          {em && sessionsPlayed !== undefined
            ? em(`${sessionsPlayed} sessions`)
            : null}
        </>
      );
    };
    return tFn;
  },
}));

// ---------------------------------------------------------------------------
// next/navigation
// ---------------------------------------------------------------------------

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

const trackMock = jest.fn();
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// ---------------------------------------------------------------------------
// Dismissal store
// ---------------------------------------------------------------------------

const shouldShowCtaMock = jest.fn();
const recordDismissalMock = jest.fn();
const readDismissalRecordMock = jest.fn();
jest.mock("@/lib/stores/dm-upsell-dismissal", () => ({
  shouldShowCta: () => shouldShowCtaMock(),
  recordDismissal: () => recordDismissalMock(),
  readDismissalRecord: () => readDismissalRecordMock(),
}));

import { BecomeDmCta } from "@/components/upsell/BecomeDmCta";

function renderCta(props: {
  role: "player" | "both";
  sessionsPlayed: number;
}) {
  return render(<BecomeDmCta {...props} />);
}

describe("<BecomeDmCta />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    shouldShowCtaMock.mockReturnValue(true);
    readDismissalRecordMock.mockReturnValue(null);
  });

  it("emits the 'player' variant title key when role=player", () => {
    renderCta({ role: "player", sessionsPlayed: 2 });
    expect(screen.getByTestId("upsell.become-dm-cta")).toBeInTheDocument();
    expect(screen.getByText("dmUpsell.cta_title_player")).toBeInTheDocument();
  });

  it("emits the 'both' variant title key when role=both", () => {
    renderCta({ role: "both", sessionsPlayed: 5 });
    expect(screen.getByText("dmUpsell.cta_title_both")).toBeInTheDocument();
  });

  it("renders sessions_played inside the rich-text description under <strong>", () => {
    renderCta({ role: "player", sessionsPlayed: 7 });
    // Mock rich() emits em(`${sessionsPlayed} sessions`) which the component
    // wraps in <strong>. Both assertions verify the interpolation chain.
    expect(
      screen.getByText("dmUpsell.cta_description_player"),
    ).toBeInTheDocument();
    expect(screen.getByText(/7 sessions/).tagName).toBe("STRONG");
  });

  it("fires dm_upsell:cta_shown exactly once on mount", () => {
    renderCta({ role: "player", sessionsPlayed: 3 });
    const shownCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:cta_shown",
    );
    expect(shownCalls).toHaveLength(1);
    expect(shownCalls[0][1]).toEqual({ role: "player", sessionsPlayed: 3 });
  });

  it("fires dm_upsell:cta_clicked and navigates when primary is pressed", async () => {
    const user = userEvent.setup();
    renderCta({ role: "both", sessionsPlayed: 2 });
    await user.click(screen.getByTestId("upsell.become-dm-cta.primary"));
    const clickedCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:cta_clicked",
    );
    expect(clickedCalls).toHaveLength(1);
    expect(clickedCalls[0][1]).toEqual({ role: "both", sessionsPlayed: 2 });
    expect(pushMock).toHaveBeenCalledWith("/app/become-dm");
  });

  it("records dismissal, fires cta_dismissed with dismissalCount, and unmounts on secondary", async () => {
    readDismissalRecordMock.mockReturnValue({
      count: 2,
      firstDismissedAt: "2026-01-01T00:00:00Z",
      lastDismissedAt: "2026-01-10T00:00:00Z",
    });
    const user = userEvent.setup();
    renderCta({ role: "player", sessionsPlayed: 4 });
    await user.click(screen.getByTestId("upsell.become-dm-cta.dismiss"));
    expect(recordDismissalMock).toHaveBeenCalledTimes(1);
    const dismissedCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:cta_dismissed",
    );
    expect(dismissedCalls).toHaveLength(1);
    expect(dismissedCalls[0][1]).toEqual({
      role: "player",
      sessionsPlayed: 4,
      dismissalCount: 2,
    });
    expect(
      screen.queryByTestId("upsell.become-dm-cta"),
    ).not.toBeInTheDocument();
  });

  it("self-hides without firing cta_shown when dismissal gate returns false", () => {
    shouldShowCtaMock.mockReturnValue(false);
    renderCta({ role: "player", sessionsPlayed: 2 });
    expect(
      screen.queryByTestId("upsell.become-dm-cta"),
    ).not.toBeInTheDocument();
    const shownCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:cta_shown",
    );
    expect(shownCalls).toHaveLength(0);
  });

  it("defaults dismissalCount to 1 when readDismissalRecord throws", async () => {
    readDismissalRecordMock.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const user = userEvent.setup();
    renderCta({ role: "both", sessionsPlayed: 2 });
    await user.click(screen.getByTestId("upsell.become-dm-cta.dismiss"));
    const dismissedCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:cta_dismissed",
    );
    expect(dismissedCalls[0][1].dismissalCount).toBe(1);
  });

  it("still fires cta_dismissed and unmounts when recordDismissal throws", async () => {
    recordDismissalMock.mockImplementation(() => {
      throw new Error("quota");
    });
    const user = userEvent.setup();
    renderCta({ role: "player", sessionsPlayed: 2 });
    await act(async () => {
      await user.click(screen.getByTestId("upsell.become-dm-cta.dismiss"));
    });
    const dismissedCalls = trackMock.mock.calls.filter(
      ([name]) => name === "dm_upsell:cta_dismissed",
    );
    expect(dismissedCalls).toHaveLength(1);
    expect(
      screen.queryByTestId("upsell.become-dm-cta"),
    ).not.toBeInTheDocument();
  });
});
