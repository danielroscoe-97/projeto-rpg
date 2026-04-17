/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompendiumLoginNudge, __TEST_ONLY__ } from "./CompendiumLoginNudge";

const { DISMISS_KEY, DISMISS_TTL_MS } = __TEST_ONLY__;

// Minimal Link stub so tsx render doesn't require next-app router context.
jest.mock("next/link", () => {
  const Link = ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  Link.displayName = "Link";
  return { __esModule: true, default: Link };
});

// Analytics — spy on trackEvent.
const mockTrackEvent = jest.fn();
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

describe("CompendiumLoginNudge", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockTrackEvent.mockClear();
  });

  it("does not render when mode=authenticated (real auth user)", () => {
    render(<CompendiumLoginNudge mode="authenticated" />);
    expect(screen.queryByTestId("compendium-login-nudge")).toBeNull();
  });

  it('renders with "sign up" CTA for guest mode (no Supabase user)', () => {
    render(<CompendiumLoginNudge mode="guest" />);
    const cta = screen.getByTestId("compendium-login-nudge-cta");
    // With namespaced useTranslations mock, keys prefix with "compendium."
    expect(cta).toHaveTextContent("compendium.login_nudge_cta_guest");
    expect(cta).toHaveAttribute("href", "/auth/sign-up");
  });

  it('renders with "log in" CTA for anonymous mode (is_anonymous=true)', () => {
    render(<CompendiumLoginNudge mode="anonymous" />);
    const cta = screen.getByTestId("compendium-login-nudge-cta");
    expect(cta).toHaveTextContent("compendium.login_nudge_cta_anon");
    expect(cta).toHaveAttribute("href", "/auth/login");
  });

  it("appends sanitized returnUrl as next= query param", () => {
    render(<CompendiumLoginNudge mode="anonymous" returnUrl="/join/abc123" />);
    const cta = screen.getByTestId("compendium-login-nudge-cta");
    expect(cta).toHaveAttribute("href", `/auth/login?next=${encodeURIComponent("/join/abc123")}`);
  });

  it("drops unsafe returnUrl (open-redirect payload) — no next= param", () => {
    render(<CompendiumLoginNudge mode="guest" returnUrl="https://evil.com" />);
    const cta = screen.getByTestId("compendium-login-nudge-cta");
    // Sanitizer reduces to "/", which is omitted from the next param.
    expect(cta).toHaveAttribute("href", "/auth/sign-up");
  });

  it("fires compendium:login_nudge_shown once on mount (guest)", () => {
    render(<CompendiumLoginNudge mode="guest" />);
    expect(mockTrackEvent).toHaveBeenCalledWith("compendium:login_nudge_shown", { mode: "guest" });
  });

  it("fires CTA click telemetry", () => {
    render(<CompendiumLoginNudge mode="anonymous" />);
    fireEvent.click(screen.getByTestId("compendium-login-nudge-cta"));
    expect(mockTrackEvent).toHaveBeenCalledWith("compendium:login_nudge_cta_clicked", { mode: "anonymous" });
  });

  it("dismiss hides banner, persists TTL, and fires telemetry", () => {
    const { rerender } = render(<CompendiumLoginNudge mode="guest" />);
    fireEvent.click(screen.getByTestId("compendium-login-nudge-dismiss"));
    expect(mockTrackEvent).toHaveBeenCalledWith("compendium:login_nudge_dismissed", {
      mode: "guest",
      ttl_days: 3,
    });
    expect(screen.queryByTestId("compendium-login-nudge")).toBeNull();
    expect(localStorage.getItem(DISMISS_KEY)).toBeTruthy();

    // Remount: still hidden because TTL is 3d and we just dismissed.
    rerender(<CompendiumLoginNudge mode="guest" />);
    expect(screen.queryByTestId("compendium-login-nudge")).toBeNull();
  });

  it("remains hidden 2 days after dismissal", () => {
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    const dismissedAt = Date.now() - TWO_DAYS;
    localStorage.setItem(DISMISS_KEY, String(dismissedAt));

    render(<CompendiumLoginNudge mode="guest" />);
    expect(screen.queryByTestId("compendium-login-nudge")).toBeNull();
  });

  it("re-appears 4 days after dismissal (TTL expired)", () => {
    const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
    const dismissedAt = Date.now() - FOUR_DAYS;
    localStorage.setItem(DISMISS_KEY, String(dismissedAt));

    render(<CompendiumLoginNudge mode="guest" />);
    expect(screen.getByTestId("compendium-login-nudge")).toBeInTheDocument();
  });

  it("falls back to sessionStorage when localStorage throws", () => {
    // Simulate a Safari-private-mode style localStorage.setItem failure.
    const origSet = Storage.prototype.setItem;
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function mockSet(this: Storage, k: string, v: string) {
      if (this === window.localStorage) {
        throw new Error("QuotaExceededError");
      }
      // call the real one for sessionStorage
      return origSet.call(this, k, v);
    });

    try {
      render(<CompendiumLoginNudge mode="guest" />);
      fireEvent.click(screen.getByTestId("compendium-login-nudge-dismiss"));
      expect(sessionStorage.getItem(DISMISS_KEY)).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it("uses role=note (not complementary) to avoid duplicate landmarks", () => {
    render(<CompendiumLoginNudge mode="guest" />);
    const banner = screen.getByRole("note");
    expect(banner).toHaveAttribute("data-testid", "compendium-login-nudge");
  });

  it("uses bg-gold + text-surface-primary on CTA (WCAG AA contrast)", () => {
    render(<CompendiumLoginNudge mode="guest" />);
    const cta = screen.getByTestId("compendium-login-nudge-cta");
    expect(cta.className).toContain("bg-gold");
    expect(cta.className).toContain("text-surface-primary");
    expect(cta.className).not.toContain("text-white");
  });

  it("honors TTL constant in spec (3 days)", () => {
    expect(DISMISS_TTL_MS).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("does not fire shown event for authenticated mode", () => {
    render(<CompendiumLoginNudge mode="authenticated" />);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("is idempotent on remount within TTL (no second shown event)", () => {
    const { unmount } = render(<CompendiumLoginNudge mode="guest" />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    // Dismiss within TTL
    fireEvent.click(screen.getByTestId("compendium-login-nudge-dismiss"));
    unmount();

    mockTrackEvent.mockClear();
    // Mount a fresh instance — banner must stay hidden, no new shown event.
    render(<CompendiumLoginNudge mode="guest" />);
    expect(screen.queryByTestId("compendium-login-nudge")).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalledWith("compendium:login_nudge_shown", expect.anything());
  });
});
