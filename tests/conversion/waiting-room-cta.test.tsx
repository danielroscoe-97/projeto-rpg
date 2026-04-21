/**
 * WaitingRoomSignupCTA unit tests — Epic 03, Story 03-C.
 *
 * RTL + jest (not vitest — see jest.config.ts). We mock the dismissal store
 * and the analytics helpers so we can assert exact call shapes without
 * touching localStorage or the `/api/track` stub.
 *
 * next-intl is mocked globally in jest.setup.ts to return the full key
 * (`conversion.waiting_room.cta_primary`). That's enough for button copy
 * assertions. For the `t.rich("headline_with_char", …)` path we override the
 * mock locally so rich returns a ReactNode with the `<em>` handler invoked —
 * matching what next-intl does at runtime.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Override the default next-intl mock from jest.setup.ts to add `t.rich`
// support. The setup file returns a plain function; here we decorate it with
// a `rich` property so the component can call `t.rich("headline_with_char",
// { characterName, em: (c) => <strong>{c}</strong> })`.
jest.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const t = (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{${k}}`, String(v)),
          fullKey,
        );
      }
      return fullKey;
    };
    type RichValue =
      | string
      | number
      | ((chunks: React.ReactNode) => React.ReactNode);
    (t as unknown as { rich: (key: string, values: Record<string, RichValue>) => React.ReactNode }).rich = (
      key: string,
      values: Record<string, RichValue>,
    ) => {
      // Simulate what next-intl does: for `headline_with_char` return the
      // `<em>` handler wrapping the characterName, prefixed/suffixed with
      // stable strings so tests can target them.
      const characterName = values.characterName;
      const em = values.em;
      if (typeof em !== "function") {
        return namespace ? `${namespace}.${key}` : key;
      }
      return (
        <React.Fragment>
          <span data-testid={`t-rich.${key}.prefix`}>prefix_</span>
          {em(
            typeof characterName === "string" || typeof characterName === "number"
              ? characterName
              : "",
          )}
          <span data-testid={`t-rich.${key}.suffix`}>_suffix</span>
        </React.Fragment>
      );
    };
    return t;
  },
  useLocale: () => "pt-BR",
}));

const mockRecordDismissal = jest.fn();
const mockReadDismissalRecord = jest.fn();
jest.mock("@/components/conversion/dismissal-store", () => ({
  recordDismissal: (...args: unknown[]) => mockRecordDismissal(...args),
  readDismissalRecord: () => mockReadDismissalRecord(),
}));

const mockTrackCtaShown = jest.fn();
const mockTrackCtaDismissed = jest.fn();
const mockTrackCtaClicked = jest.fn();
const mockTrackConversionFailed = jest.fn();
jest.mock("@/lib/conversion/analytics", () => ({
  trackCtaShown: (...args: unknown[]) => mockTrackCtaShown(...args),
  trackCtaDismissed: (...args: unknown[]) => mockTrackCtaDismissed(...args),
  trackCtaClicked: (...args: unknown[]) => mockTrackCtaClicked(...args),
  trackConversionFailed: (...args: unknown[]) => mockTrackConversionFailed(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import {
  WaitingRoomSignupCTA,
  type WaitingRoomSignupCTAProps,
} from "@/components/conversion/WaitingRoomSignupCTA";

function makeProps(
  overrides: Partial<WaitingRoomSignupCTAProps> = {},
): WaitingRoomSignupCTAProps {
  return {
    sessionTokenId: "tok-1",
    campaignId: "camp-1",
    playerName: "Dani",
    characterId: "char-42",
    characterName: "Thorin",
    onOpenAuthModal: jest.fn(),
    onDismiss: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReadDismissalRecord.mockReturnValue({
    dismissalsByCampaign: { "camp-1": { count: 1, lastDismissedAt: new Date().toISOString() } },
    lastSeenCampaign: "camp-1",
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WaitingRoomSignupCTA", () => {
  describe("rendering", () => {
    it("renders as a region with labelled heading + both CTA buttons", () => {
      render(<WaitingRoomSignupCTA {...makeProps()} />);
      const region = screen.getByTestId("conversion.waiting-room-cta");
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("role", "region");
      expect(region).toHaveAttribute("aria-labelledby");
      expect(
        screen.getByTestId("conversion.waiting-room-cta.primary"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("conversion.waiting-room-cta.dismiss"),
      ).toBeInTheDocument();
    });

    it("uses t.rich with an <em> handler when characterName is present", () => {
      render(
        <WaitingRoomSignupCTA
          {...makeProps({ characterName: "Elora" })}
        />,
      );
      // The mocked t.rich emits a prefix/suffix marker around the <em> chunks.
      expect(
        screen.getByTestId("t-rich.headline_with_char.prefix"),
      ).toBeInTheDocument();
      // The `em:` handler in the component wraps characterName in <strong>.
      const strong = screen.getByText("Elora");
      expect(strong.tagName.toLowerCase()).toBe("strong");
    });

    it("falls back to plain headline_no_char when characterName is null", () => {
      render(
        <WaitingRoomSignupCTA
          {...makeProps({ characterName: null, characterId: null })}
        />,
      );
      // No <em> handler emitted → no rich prefix markers.
      expect(
        screen.queryByTestId("t-rich.headline_with_char.prefix"),
      ).not.toBeInTheDocument();
      // Body copy renders via plain `t()` → the full-key string appears.
      expect(
        screen.getByText("conversion.waiting_room.headline_no_char"),
      ).toBeInTheDocument();
    });
  });

  describe("mount analytics (Cluster γ Q#17 — responsibility moved to parent)", () => {
    it("does NOT fire trackCtaShown on mount (the parent PlayerJoinClient now owns session-level dedup by effectiveTokenId)", () => {
      render(<WaitingRoomSignupCTA {...makeProps()} />);
      expect(mockTrackCtaShown).not.toHaveBeenCalled();
    });

    it("does NOT fire trackCtaShown on re-render either", () => {
      const { rerender } = render(
        <WaitingRoomSignupCTA {...makeProps({ characterName: "A" })} />,
      );
      rerender(
        <WaitingRoomSignupCTA {...makeProps({ characterName: "B" })} />,
      );
      expect(mockTrackCtaShown).not.toHaveBeenCalled();
    });
  });

  describe("primary CTA", () => {
    it("fires trackCtaClicked and onOpenAuthModal with the full ctx on click", async () => {
      const user = userEvent.setup();
      const onOpenAuthModal = jest.fn();
      render(
        <WaitingRoomSignupCTA
          {...makeProps({ onOpenAuthModal })}
        />,
      );
      await user.click(
        screen.getByTestId("conversion.waiting-room-cta.primary"),
      );
      expect(mockTrackCtaClicked).toHaveBeenCalledWith("waiting", {
        campaignId: "camp-1",
      });
      expect(onOpenAuthModal).toHaveBeenCalledTimes(1);
      expect(onOpenAuthModal).toHaveBeenCalledWith({
        sessionTokenId: "tok-1",
        campaignId: "camp-1",
        characterId: "char-42",
      });
    });
  });

  describe("secondary / dismiss CTA", () => {
    it("records dismissal, fires trackCtaDismissed with fresh count, then onDismiss", async () => {
      const user = userEvent.setup();
      const onDismiss = jest.fn();
      mockReadDismissalRecord.mockReturnValueOnce({
        dismissalsByCampaign: {
          "camp-1": { count: 2, lastDismissedAt: new Date().toISOString() },
        },
        lastSeenCampaign: "camp-1",
      });

      render(
        <WaitingRoomSignupCTA {...makeProps({ onDismiss })} />,
      );
      await user.click(
        screen.getByTestId("conversion.waiting-room-cta.dismiss"),
      );

      expect(mockRecordDismissal).toHaveBeenCalledWith("camp-1");
      expect(mockTrackCtaDismissed).toHaveBeenCalledWith("waiting", {
        campaignId: "camp-1",
        dismissalCount: 2,
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("defaults dismissalCount to 1 when storage read returns null", async () => {
      const user = userEvent.setup();
      mockReadDismissalRecord.mockReturnValueOnce(null);
      render(<WaitingRoomSignupCTA {...makeProps()} />);
      await user.click(
        screen.getByTestId("conversion.waiting-room-cta.dismiss"),
      );
      expect(mockTrackCtaDismissed).toHaveBeenCalledWith("waiting", {
        campaignId: "camp-1",
        dismissalCount: 1,
      });
    });

    it("Q#3 — emits conversion:failed breadcrumb when recordDismissal throws (storage write failed)", async () => {
      const user = userEvent.setup();
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockRecordDismissal.mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });
      const onDismiss = jest.fn();
      render(<WaitingRoomSignupCTA {...makeProps({ onDismiss })} />);

      await user.click(
        screen.getByTestId("conversion.waiting-room-cta.dismiss"),
      );

      // Breadcrumb analytic fired with the sentinel error key.
      expect(mockTrackConversionFailed).toHaveBeenCalledWith("waiting", {
        campaignId: "camp-1",
        error: "storage_write_failed",
      });
      // User-visible behavior unchanged: onDismiss still invoked so the
      // parent hides the card.
      expect(onDismiss).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });
  });
});
