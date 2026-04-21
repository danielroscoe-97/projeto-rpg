/**
 * Epic 03, Story 03-D — RecapCtaCard unit tests (anon + guest delegation).
 *
 * Cluster γ refactor (Wave 2B): RecapCtaCard no longer owns an AuthModal
 * instance. The parent (PlayerJoinClient) owns the singleton AuthModal and
 * the card requests modal opens via `onRequestAuthModal({sessionTokenId,
 * campaignId, moment:"recap_anon"})`. These tests assert the new contract.
 *
 * We mock:
 *   - `next-intl` with a local override that supports both `t()` and
 *     `t.rich()` (the project-wide jest.setup mock only supports `t()`).
 *     First use of `t.rich()` in the codebase — see epic §D7/F13.
 *   - `@/lib/conversion/analytics` — jest.fn()s per helper.
 *   - `@/components/conversion/dismissal-store` — recordDismissal + read.
 *   - `@/components/conversion/GuestRecapFlow` — spy stub to assert the
 *     delegation contract (context forwarded + onComplete wired).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// next-intl — supports `.rich` for this test file (global mock doesn't).
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
    // `t.rich("headline", { characterName, em: (chunks) => <strong>…</strong> })`
    (tFn as unknown as { rich: (...a: unknown[]) => React.ReactNode }).rich = (
      key: string,
      params: Record<string, unknown>,
    ) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const em = params?.em as
        | ((chunks: React.ReactNode) => React.ReactNode)
        | undefined;
      const characterName = (params?.characterName as string) ?? "";
      // Emit a simple "<key>(<em-wrapped characterName>)" tree so tests can
      // assert both the raw key (text) and the element wrapper (strong).
      return (
        <>
          <span data-testid="rich-key">{fullKey}</span>
          {em ? em(characterName) : characterName}
        </>
      );
    };
    return tFn;
  },
  useLocale: () => "pt-BR",
}));

// ---------------------------------------------------------------------------
// Analytics mocks — one jest.fn per helper so assertions are trivial.
// ---------------------------------------------------------------------------

const trackCtaShown = jest.fn();
const trackCtaClicked = jest.fn();
const trackCtaDismissed = jest.fn();
const trackConversionCompleted = jest.fn();
const trackConversionFailed = jest.fn();

jest.mock("@/lib/conversion/analytics", () => ({
  trackCtaShown: (...args: unknown[]) => trackCtaShown(...args),
  trackCtaClicked: (...args: unknown[]) => trackCtaClicked(...args),
  trackCtaDismissed: (...args: unknown[]) => trackCtaDismissed(...args),
  trackConversionCompleted: (...args: unknown[]) =>
    trackConversionCompleted(...args),
  trackConversionFailed: (...args: unknown[]) => trackConversionFailed(...args),
  trackModalOpened: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Dismissal store — card now owns local dismissal so we mock record + read.
// ---------------------------------------------------------------------------

const recordDismissal = jest.fn();
const readDismissalRecord = jest.fn();
jest.mock("@/components/conversion/dismissal-store", () => ({
  recordDismissal: (...args: unknown[]) => recordDismissal(...args),
  readDismissalRecord: () => readDismissalRecord(),
  resetOnConversion: jest.fn(),
  shouldShowCta: () => true,
}));

// ---------------------------------------------------------------------------
// GuestRecapFlow stub — captures props so we assert the delegation contract.
// ---------------------------------------------------------------------------

const guestRecapFlowProps: Array<unknown> = [];
jest.mock("@/components/conversion/GuestRecapFlow", () => ({
  GuestRecapFlow: (props: unknown) => {
    guestRecapFlowProps.push(props);
    return <div data-testid="guest-recap-flow-stub" />;
  },
}));

// ---------------------------------------------------------------------------
// sonner toast mock (card no longer calls toast directly — parent does — but
// keep the mock in case future revisions add toast calls back).
// ---------------------------------------------------------------------------

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { RecapCtaCard } from "@/components/conversion/RecapCtaCard";
import type { SaveSignupContext } from "@/components/conversion/types";
import type { Combatant } from "@/lib/types/combat";

const ANON_CTX: Extract<SaveSignupContext, { mode: "anon" }> = {
  mode: "anon",
  sessionTokenId: "tok-abc",
  campaignId: "camp-1",
  characterId: "char-1",
  characterName: "Thorin",
};

const GUEST_CTX: Extract<SaveSignupContext, { mode: "guest" }> = {
  mode: "guest",
  characterName: "Thorin",
  guestCombatants: [{ id: "c-1", name: "Thorin" } as unknown as Combatant],
};

beforeEach(() => {
  jest.clearAllMocks();
  guestRecapFlowProps.length = 0;
  readDismissalRecord.mockReturnValue({
    dismissalsByCampaign: {
      "camp-1": { count: 1, lastDismissedAt: new Date().toISOString() },
    },
    lastSeenCampaign: "camp-1",
  });
});

describe("RecapCtaCard (Story 03-D — anon flow, Cluster γ contract)", () => {
  it("renders the anon card with t.rich headline wrapping characterName in <strong>", () => {
    render(<RecapCtaCard context={ANON_CTX} />);

    const root = screen.getByTestId("conversion.recap-cta.anon.root");
    expect(root).toBeInTheDocument();

    // `t.rich` mock emits the key in a span + the em-wrapped chunk.
    expect(screen.getByTestId("rich-key")).toHaveTextContent(
      "conversion.recap_anon.headline",
    );
    // Verify the <em> callback wrapped the characterName in a <strong>
    const strong = root.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent("Thorin");
  });

  it("fires trackCtaShown('recap_anon', {...}) exactly once on mount (W#6 StrictMode guard)", () => {
    const { rerender } = render(<RecapCtaCard context={ANON_CTX} />);
    expect(trackCtaShown).toHaveBeenCalledTimes(1);
    expect(trackCtaShown).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
      hasCharacter: true,
    });
    // Re-render with a fresh context object (same data) — the ref gate
    // prevents a second fire.
    rerender(<RecapCtaCard context={{ ...ANON_CTX }} />);
    expect(trackCtaShown).toHaveBeenCalledTimes(1);
  });

  it("clicking primary CTA fires trackCtaClicked and calls onRequestAuthModal with moment:'recap_anon'", async () => {
    const user = userEvent.setup();
    const onRequestAuthModal = jest.fn();
    render(
      <RecapCtaCard context={ANON_CTX} onRequestAuthModal={onRequestAuthModal} />,
    );

    await user.click(
      screen.getByTestId("conversion.recap-cta.anon.primary"),
    );

    expect(trackCtaClicked).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
    });
    expect(onRequestAuthModal).toHaveBeenCalledTimes(1);
    expect(onRequestAuthModal).toHaveBeenCalledWith({
      sessionTokenId: "tok-abc",
      campaignId: "camp-1",
      moment: "recap_anon",
    });
  });

  it("card does NOT render its own AuthModal anymore (A#1 refactor)", () => {
    // Keep a loose guard: if the card accidentally re-introduces an inline
    // modal, this regex test will spot it. We explicitly assert the stub
    // isn't in the DOM — in the pre-refactor world a stubbed AuthModal
    // was mounted; now the parent owns it.
    render(<RecapCtaCard context={ANON_CTX} />);
    expect(screen.queryByTestId("auth-modal-stub")).not.toBeInTheDocument();
  });

  it("A#2 — secondary CTA records dismissal, fires trackCtaDismissed, hides the card, does NOT call onComplete", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    readDismissalRecord.mockReturnValueOnce({
      dismissalsByCampaign: {
        "camp-1": { count: 2, lastDismissedAt: new Date().toISOString() },
      },
      lastSeenCampaign: "camp-1",
    });

    render(<RecapCtaCard context={ANON_CTX} onComplete={onComplete} />);

    await user.click(
      screen.getByTestId("conversion.recap-cta.anon.secondary"),
    );

    expect(recordDismissal).toHaveBeenCalledWith("camp-1");
    expect(trackCtaDismissed).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
      dismissalCount: 2,
    });
    // Card hidden (returns null after cardDismissed flips to true).
    expect(
      screen.queryByTestId("conversion.recap-cta.anon.root"),
    ).not.toBeInTheDocument();
    // Critically: onComplete (which closes the whole recap) is NOT called.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("A#2 secondary defaults dismissalCount to 1 when storage read returns null", async () => {
    const user = userEvent.setup();
    readDismissalRecord.mockReturnValueOnce(null);
    render(<RecapCtaCard context={ANON_CTX} />);
    await user.click(
      screen.getByTestId("conversion.recap-cta.anon.secondary"),
    );
    expect(trackCtaDismissed).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
      dismissalCount: 1,
    });
  });

  it("hasCharacter is false when characterId is null", () => {
    render(
      <RecapCtaCard
        context={{ ...ANON_CTX, characterId: null, characterName: null }}
      />,
    );
    expect(trackCtaShown).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
      hasCharacter: false,
    });
  });

  it("onRequestAuthModal absent is a safe no-op (defensive)", async () => {
    const user = userEvent.setup();
    render(<RecapCtaCard context={ANON_CTX} />);
    await user.click(
      screen.getByTestId("conversion.recap-cta.anon.primary"),
    );
    // Analytics still fires even without the parent wired.
    expect(trackCtaClicked).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
    });
    // No explosion from the missing prop.
    expect(trackConversionFailed).not.toHaveBeenCalled();
  });
});

describe("RecapCtaCard (Story 03-D — guest delegation)", () => {
  it("delegates to GuestRecapFlow when mode === 'guest' and does NOT fire anon analytics", () => {
    const onComplete = jest.fn();
    render(<RecapCtaCard context={GUEST_CTX} onComplete={onComplete} />);

    // Guest stub rendered — anon card not in the DOM.
    expect(screen.getByTestId("guest-recap-flow-stub")).toBeInTheDocument();
    expect(
      screen.queryByTestId("conversion.recap-cta.anon.root"),
    ).not.toBeInTheDocument();

    // Anon analytics did NOT fire — agent C's GuestRecapFlow is responsible.
    expect(trackCtaShown).not.toHaveBeenCalled();

    // Props contract: context + onComplete forwarded verbatim.
    expect(guestRecapFlowProps).toHaveLength(1);
    expect(guestRecapFlowProps[0]).toMatchObject({
      context: GUEST_CTX,
      onComplete,
    });
  });
});
