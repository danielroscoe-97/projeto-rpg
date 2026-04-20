/**
 * Epic 03, Story 03-D — RecapCtaCard unit tests (anon + guest delegation).
 *
 * We mock:
 *   - `next-intl` with a local override that supports both `t()` and
 *     `t.rich()` (the project-wide jest.setup mock only supports `t()`).
 *     First use of `t.rich()` in the codebase — see epic §D7/F13.
 *   - `@/components/auth/AuthModal` — stub that exposes `open`, a helper
 *     to fire `onSuccess`, and an `onOpenChange` spy. Keeps the tests
 *     decoupled from supabase/forms and covers the contract we care about.
 *   - `@/lib/conversion/analytics` — jest.fn()s per helper.
 *   - `@/components/conversion/dismissal-store` — only `resetOnConversion`.
 *   - `@/components/conversion/GuestRecapFlow` — spy stub to assert the
 *     delegation contract (context forwarded + onComplete wired).
 *   - `sonner` toast.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
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
const trackConversionCompleted = jest.fn();
const trackConversionFailed = jest.fn();

jest.mock("@/lib/conversion/analytics", () => ({
  trackCtaShown: (...args: unknown[]) => trackCtaShown(...args),
  trackCtaClicked: (...args: unknown[]) => trackCtaClicked(...args),
  trackConversionCompleted: (...args: unknown[]) =>
    trackConversionCompleted(...args),
  trackConversionFailed: (...args: unknown[]) => trackConversionFailed(...args),
  trackModalOpened: jest.fn(),
  trackCtaDismissed: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Dismissal store — we only care resetOnConversion is called.
// ---------------------------------------------------------------------------

const resetOnConversion = jest.fn();
jest.mock("@/components/conversion/dismissal-store", () => ({
  resetOnConversion: () => resetOnConversion(),
  shouldShowCta: () => true,
  recordDismissal: jest.fn(),
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
// AuthModal stub — exposes a button to simulate success and records calls.
// ---------------------------------------------------------------------------

type AuthModalStubProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab: "login" | "signup";
  onSuccess: (payload: {
    userId: string;
    isNewAccount: boolean;
    upgraded: boolean;
  }) => void;
  upgradeContext?: { sessionTokenId: string; campaignId?: string };
};

const authModalPropsLog: AuthModalStubProps[] = [];

jest.mock("@/components/auth/AuthModal", () => ({
  AuthModal: (props: AuthModalStubProps) => {
    authModalPropsLog.push(props);
    if (!props.open) return null;
    return (
      <div data-testid="auth-modal-stub">
        <button
          type="button"
          data-testid="auth-modal-stub.fire-success"
          onClick={() =>
            props.onSuccess({
              userId: "user-123",
              isNewAccount: true,
              upgraded: true,
            })
          }
        >
          fire success
        </button>
        <button
          type="button"
          data-testid="auth-modal-stub.close"
          onClick={() => props.onOpenChange(false)}
        >
          close
        </button>
      </div>
    );
  },
}));

// ---------------------------------------------------------------------------
// sonner toast mock
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
  authModalPropsLog.length = 0;
  guestRecapFlowProps.length = 0;
});

describe("RecapCtaCard (Story 03-D — anon flow)", () => {
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

  it("fires trackCtaShown('recap_anon', {...}) exactly once on mount", () => {
    render(<RecapCtaCard context={ANON_CTX} />);
    expect(trackCtaShown).toHaveBeenCalledTimes(1);
    expect(trackCtaShown).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
      hasCharacter: true,
    });
  });

  it("clicking the primary CTA fires trackCtaClicked and opens AuthModal with upgradeContext", async () => {
    const user = userEvent.setup();
    render(<RecapCtaCard context={ANON_CTX} />);

    // Modal starts closed.
    expect(screen.queryByTestId("auth-modal-stub")).not.toBeInTheDocument();

    await user.click(
      screen.getByTestId("conversion.recap-cta.anon.primary"),
    );

    expect(trackCtaClicked).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
    });

    // Modal now open, with the correct upgradeContext.
    expect(screen.getByTestId("auth-modal-stub")).toBeInTheDocument();
    const latestProps = authModalPropsLog[authModalPropsLog.length - 1];
    expect(latestProps.defaultTab).toBe("signup");
    expect(latestProps.upgradeContext).toEqual({
      sessionTokenId: "tok-abc",
      campaignId: "camp-1",
    });
  });

  it("on AuthModal success: fires trackConversionCompleted, resets dismissal, shows toast, calls onComplete, closes modal", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<RecapCtaCard context={ANON_CTX} onComplete={onComplete} />);

    await user.click(screen.getByTestId("conversion.recap-cta.anon.primary"));
    await act(async () => {
      await user.click(screen.getByTestId("auth-modal-stub.fire-success"));
    });

    expect(trackConversionCompleted).toHaveBeenCalledWith("recap_anon", {
      campaignId: "camp-1",
      characterId: "char-1",
      flow: "upgrade",
    });
    expect(resetOnConversion).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    // Post-success toast key is `conversion.post_success.recap_anon`.
    // The mocked `t()` echoes the namespace.key path — we only verify
    // the key is present. (Real next-intl substitutes `{characterName}`
    // at runtime using `messages/*.json`; that layer is i18n's concern,
    // not the component's.)
    expect(toastSuccess.mock.calls[0][0]).toContain(
      "conversion.post_success.recap_anon",
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Modal dismissed.
    expect(screen.queryByTestId("auth-modal-stub")).not.toBeInTheDocument();
  });

  it("dismissing the modal without success does NOT fire trackConversionFailed (plain dismissal is not a failure)", async () => {
    const user = userEvent.setup();
    render(<RecapCtaCard context={ANON_CTX} />);
    await user.click(screen.getByTestId("conversion.recap-cta.anon.primary"));
    expect(screen.getByTestId("auth-modal-stub")).toBeInTheDocument();

    await user.click(screen.getByTestId("auth-modal-stub.close"));
    expect(trackConversionFailed).not.toHaveBeenCalled();
    expect(trackConversionCompleted).not.toHaveBeenCalled();
  });

  it("the secondary CTA ('continuar sem salvar') calls onComplete", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<RecapCtaCard context={ANON_CTX} onComplete={onComplete} />);

    await user.click(
      screen.getByTestId("conversion.recap-cta.anon.secondary"),
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
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
