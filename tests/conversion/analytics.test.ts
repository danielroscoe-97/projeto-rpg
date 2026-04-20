/**
 * Unit tests for `lib/conversion/analytics.ts` (Epic 03, Story 03-A).
 *
 * Validates:
 *   - Each of the 6 helpers fires `trackEvent` with the exact colon-style name.
 *   - Zero PII leaks through the payload (email, displayName, characterName,
 *     sessionTokenId must never be present).
 *   - `characterId` and `hasCharacter: boolean` ARE allowed.
 */

jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

import { trackEvent } from "@/lib/analytics/track";
import {
  trackCtaShown,
  trackCtaDismissed,
  trackCtaClicked,
  trackModalOpened,
  trackConversionCompleted,
  trackConversionFailed,
} from "@/lib/conversion/analytics";

const trackEventMock = trackEvent as jest.MockedFunction<typeof trackEvent>;

/** PII keys that must NEVER appear in any conversion payload. */
const PII_KEYS = ["email", "displayName", "characterName", "sessionTokenId"];

function assertNoPii(props: Record<string, unknown> | undefined) {
  if (!props) return;
  for (const key of PII_KEYS) {
    expect(props).not.toHaveProperty(key);
  }
}

describe("conversion analytics wrappers", () => {
  beforeEach(() => {
    trackEventMock.mockClear();
  });

  describe("trackCtaShown", () => {
    it("fires exactly `conversion:cta_shown` with moment + ctx", () => {
      trackCtaShown("waiting", {
        campaignId: "camp-123",
        hasCharacter: true,
        guestCombatantCount: 0,
      });
      expect(trackEventMock).toHaveBeenCalledTimes(1);
      const [name, props] = trackEventMock.mock.calls[0];
      expect(name).toBe("conversion:cta_shown");
      expect(props).toMatchObject({
        moment: "waiting",
        campaignId: "camp-123",
        hasCharacter: true,
      });
      assertNoPii(props);
    });
  });

  describe("trackCtaDismissed", () => {
    it("fires exactly `conversion:cta_dismissed` with dismissalCount", () => {
      trackCtaDismissed("recap_anon", {
        campaignId: "camp-xyz",
        dismissalCount: 2,
      });
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:cta_dismissed",
        expect.objectContaining({
          moment: "recap_anon",
          campaignId: "camp-xyz",
          dismissalCount: 2,
        }),
      );
      assertNoPii(trackEventMock.mock.calls[0][1]);
    });
  });

  describe("trackCtaClicked", () => {
    it("fires exactly `conversion:cta_clicked`", () => {
      trackCtaClicked("waiting", { campaignId: "camp-abc" });
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:cta_clicked",
        expect.objectContaining({ moment: "waiting", campaignId: "camp-abc" }),
      );
      assertNoPii(trackEventMock.mock.calls[0][1]);
    });
  });

  describe("trackModalOpened", () => {
    it("fires exactly `conversion:modal_opened` with only the moment", () => {
      trackModalOpened("recap_guest");
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:modal_opened",
        expect.objectContaining({ moment: "recap_guest" }),
      );
      assertNoPii(trackEventMock.mock.calls[0][1]);
    });
  });

  describe("trackConversionCompleted", () => {
    it("fires exactly `conversion:completed` and DOES pass characterId (not PII)", () => {
      trackConversionCompleted("recap_anon", {
        campaignId: "camp-1",
        characterId: "char-456",
        flow: "upgrade",
        guestCombatantCount: 0,
      });
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({
          moment: "recap_anon",
          campaignId: "camp-1",
          characterId: "char-456",
          flow: "upgrade",
        }),
      );
      assertNoPii(trackEventMock.mock.calls[0][1]);
    });

    it("accepts the signup_and_migrate flow for guest→auth conversion", () => {
      trackConversionCompleted("recap_guest", {
        flow: "signup_and_migrate",
        guestCombatantCount: 5,
      });
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({
          moment: "recap_guest",
          flow: "signup_and_migrate",
          guestCombatantCount: 5,
        }),
      );
      assertNoPii(trackEventMock.mock.calls[0][1]);
    });
  });

  describe("trackConversionFailed", () => {
    it("fires exactly `conversion:failed` with error reason", () => {
      trackConversionFailed("waiting", {
        campaignId: "camp-9",
        error: "network_error",
      });
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:failed",
        expect.objectContaining({
          moment: "waiting",
          campaignId: "camp-9",
          error: "network_error",
        }),
      );
      assertNoPii(trackEventMock.mock.calls[0][1]);
    });
  });

  describe("PII audit — hasCharacter is boolean, characterName never appears", () => {
    it("trackCtaShown with hasCharacter=true never leaks characterName", () => {
      // Even if a caller accidentally passed extra fields (TypeScript prevents it,
      // but runtime-wise we must ensure our wrapper does not echo them back).
      trackCtaShown("waiting", { hasCharacter: true });
      const props = trackEventMock.mock.calls[0][1] ?? {};
      expect(props).toHaveProperty("hasCharacter", true);
      expect(props).not.toHaveProperty("characterName");
    });
  });
});
