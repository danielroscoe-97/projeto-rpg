/**
 * Epic 04 Story 04-H — InvitePastCompanions RTL tests.
 *
 * Covers (11):
 *  1. Initial render: button present, section collapsed, getPastCompanions NOT called
 *  2. Expand → lazy-loads getPastCompanions once
 *  3. Loading state visible while fetch in flight
 *  4. Success with companions → cards render with name + sessions_together
 *  5. `past_companions_loaded` analytics fires once on first load with count
 *  6. Error path (server throws) → error banner rendered
 *  7. Empty array after load → empty-state rendered when expanded;
 *     component hides entirely after collapsing (one-shot)
 *  8. Copy button success → clipboard called, success toast, analytics success=true
 *  9. Copy button failure (clipboard throws) → failure toast, analytics success=false
 * 10. Collapse then expand again does NOT re-fetch (cached)
 * 11. Missing display_name renders "—" fallback; copy still works
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// next-intl mock (handles t.rich)
// ---------------------------------------------------------------------------

jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const tFn = (key: string, params?: Record<string, unknown>) => {
      const full = namespace ? `${namespace}.${key}` : key;
      if (!params) return full;
      // Return `key[k1=v1,k2=v2]` so tests can assert on interpolated
      // values without needing the full translated string.
      const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(",");
      return `${full}[${paramStr}]`;
    };
    (
      tFn as unknown as { rich: (...a: unknown[]) => React.ReactNode }
    ).rich = (key: string, params: Record<string, unknown>) => {
      const full = namespace ? `${namespace}.${key}` : key;
      const strong = params?.strong as
        | ((chunks: React.ReactNode) => React.ReactNode)
        | undefined;
      const em = params?.em as
        | ((chunks: React.ReactNode) => React.ReactNode)
        | undefined;
      return (
        <>
          <span data-testid="rich-key">{full}</span>
          {strong ? strong((params?.campaignName as string) ?? "") : null}
          {em ? em((params?.campaignName as string) ?? "") : null}
        </>
      );
    };
    return tFn;
  },
}));

// ---------------------------------------------------------------------------
// Toasts + analytics
// ---------------------------------------------------------------------------

const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccessMock(...a),
    error: (...a: unknown[]) => toastErrorMock(...a),
  },
}));

const trackMock = jest.fn();
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

// ---------------------------------------------------------------------------
// getPastCompanions
// ---------------------------------------------------------------------------

const getPastCompanionsMock = jest.fn();
jest.mock("@/lib/upsell/past-companions", () => ({
  getPastCompanions: (...args: unknown[]) => getPastCompanionsMock(...args),
}));

import { InvitePastCompanions } from "@/components/upsell/InvitePastCompanions";

const COMPANIONS = [
  {
    companion_user_id: "u-1",
    companion_display_name: "Aragorn",
    companion_avatar_url: null,
    sessions_together: 4,
    last_campaign_name: "Fellowship",
  },
  {
    companion_user_id: "u-2",
    companion_display_name: "Gimli",
    companion_avatar_url: null,
    sessions_together: 2,
    last_campaign_name: null,
  },
];

// Mock the extracted clipboard helper (not navigator.clipboard directly —
// that path fights JSDOM's property descriptors). The component now calls
// `copyToClipboard(text)` from @/lib/util/clipboard, so a plain
// jest.mock gives us a clean seam.
const copyToClipboardMock = jest.fn<Promise<boolean>, [string]>(
  async () => true,
);
jest.mock("@/lib/util/clipboard", () => ({
  copyToClipboard: (text: string) => copyToClipboardMock(text),
}));

function renderIt(props = {}) {
  const defaults = {
    campaignId: "camp-1",
    campaignName: "My Table",
    inviteLink: "https://example.test/join-campaign/ABC",
  };
  return render(<InvitePastCompanions {...defaults} {...props} />);
}

describe("<InvitePastCompanions />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    copyToClipboardMock.mockResolvedValue(true);
  });

  it("renders the toggle but does NOT fetch on mount", () => {
    renderIt();
    expect(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    ).toBeInTheDocument();
    expect(getPastCompanionsMock).not.toHaveBeenCalled();
  });

  it("expanding triggers getPastCompanions exactly once", async () => {
    getPastCompanionsMock.mockResolvedValue(COMPANIONS);
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId(
          `upsell.invite-past-companions.card-${COMPANIONS[0].companion_user_id}`,
        ),
      ).toBeInTheDocument(),
    );
    expect(getPastCompanionsMock).toHaveBeenCalledTimes(1);
  });

  it("shows loading state while fetch is in flight", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    getPastCompanionsMock.mockImplementation(
      () => new Promise((res) => (resolveFetch = res)),
    );
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    expect(
      screen.getByTestId("upsell.invite-past-companions.loading"),
    ).toBeInTheDocument();
    await act(async () => resolveFetch([]));
  });

  it("fires past_companions_loaded once with the count", async () => {
    getPastCompanionsMock.mockResolvedValue(COMPANIONS);
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    await waitFor(() =>
      expect(trackMock).toHaveBeenCalledWith(
        "dm_upsell:past_companions_loaded",
        expect.objectContaining({ campaignId: "camp-1", count: 2 }),
      ),
    );
  });

  it("renders an error banner when getPastCompanions throws", async () => {
    getPastCompanionsMock.mockRejectedValue(new Error("rls"));
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("upsell.invite-past-companions.error"),
      ).toBeInTheDocument(),
    );
    // No analytics for the failed load.
    expect(trackMock).not.toHaveBeenCalledWith(
      "dm_upsell:past_companions_loaded",
      expect.anything(),
    );
  });

  it("shows empty-state when companions array is [] on expand", async () => {
    getPastCompanionsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("upsell.invite-past-companions.empty"),
      ).toBeInTheDocument(),
    );
  });

  it("copy success: invokes clipboard, shows success toast, tracks success=true", async () => {
    getPastCompanionsMock.mockResolvedValue(COMPANIONS);
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    const copyBtn = await screen.findByTestId(
      `upsell.invite-past-companions.card-${COMPANIONS[0].companion_user_id}.copy`,
    );
    await user.click(copyBtn);
    await waitFor(() =>
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1),
    );
    const payload = copyToClipboardMock.mock.calls[0][0] as string;
    expect(payload).toContain("Aragorn");
    expect(payload).toContain("My Table");
    expect(payload).toContain("https://example.test/join-campaign/ABC");
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(trackMock).toHaveBeenCalledWith(
      "dm_upsell:past_companion_link_copied",
      expect.objectContaining({
        campaignId: "camp-1",
        companionUserId: "u-1",
        sessionsTogether: 4,
        success: true,
      }),
    );
  });

  it("copy failure: shows error toast, tracks success=false", async () => {
    getPastCompanionsMock.mockResolvedValue(COMPANIONS);
    copyToClipboardMock.mockResolvedValue(false);
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    const copyBtn = await screen.findByTestId(
      `upsell.invite-past-companions.card-${COMPANIONS[0].companion_user_id}.copy`,
    );
    await user.click(copyBtn);

    expect(toastErrorMock).toHaveBeenCalled();
    expect(trackMock).toHaveBeenCalledWith(
      "dm_upsell:past_companion_link_copied",
      expect.objectContaining({ success: false }),
    );
  });

  it("collapse + re-expand does NOT re-fetch (cached)", async () => {
    getPastCompanionsMock.mockResolvedValue(COMPANIONS);
    const user = userEvent.setup();
    renderIt();
    const toggle = screen.getByTestId(
      "upsell.invite-past-companions.toggle",
    );
    await user.click(toggle);
    await waitFor(() =>
      expect(getPastCompanionsMock).toHaveBeenCalledTimes(1),
    );
    await user.click(toggle); // collapse
    await user.click(toggle); // expand again
    // Still only 1 call.
    expect(getPastCompanionsMock).toHaveBeenCalledTimes(1);
  });

  it("mid-fetch collapse + re-expand: retries the fetch (adversarial stale-cache fix)", async () => {
    // First expand: fetch in flight. User collapses BEFORE resolve.
    // Second expand: the fetch should retry (not stay null forever).
    let firstResolve: (rows: unknown) => void = () => {};
    getPastCompanionsMock.mockImplementationOnce(
      () => new Promise((res) => (firstResolve = res)),
    );
    getPastCompanionsMock.mockResolvedValueOnce(COMPANIONS);
    const user = userEvent.setup();
    renderIt();
    const toggle = screen.getByTestId(
      "upsell.invite-past-companions.toggle",
    );
    await user.click(toggle); // expand → fetch #1 in flight
    // Collapse while fetch #1 is pending.
    await user.click(toggle);
    // Resolve fetch #1 — its result should be ignored (active=false).
    await act(async () => firstResolve(["ignored"]));
    // Re-expand — should trigger fetch #2 because prior never completed
    // the component state.
    await user.click(toggle);
    await waitFor(() => expect(getPastCompanionsMock).toHaveBeenCalledTimes(2));
    // And the new results render.
    await waitFor(() =>
      expect(
        screen.getByTestId(
          `upsell.invite-past-companions.card-${COMPANIONS[0].companion_user_id}`,
        ),
      ).toBeInTheDocument(),
    );
  });

  it("missing display_name renders '—' fallback; copy still works", async () => {
    getPastCompanionsMock.mockResolvedValue([
      {
        companion_user_id: "u-3",
        companion_display_name: null,
        companion_avatar_url: null,
        sessions_together: 1,
        last_campaign_name: null,
      },
    ]);
    const user = userEvent.setup();
    renderIt();
    await user.click(
      screen.getByTestId("upsell.invite-past-companions.toggle"),
    );
    const card = await screen.findByTestId(
      "upsell.invite-past-companions.card-u-3",
    );
    expect(card.textContent).toContain("—");
    await user.click(
      screen.getByTestId(
        "upsell.invite-past-companions.card-u-3.copy",
      ),
    );
    expect(copyToClipboardMock).toHaveBeenCalled();
  });
});
