/**
 * AuthModal unit tests — Story 02-C.
 *
 * We mock `@radix-ui/react-dialog` inline (same trick as
 * character-picker-modal.test.tsx) so the modal surface renders without
 * portal/focus-trap complications in jsdom.
 *
 * We mock `@/lib/supabase/client` (singleton returning a hand-built stub)
 * and `@/components/auth/GoogleOAuthButton` (so we can inspect the
 * `beforeRedirect` prop surface directly).
 */

import React from "react";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog");
  const TITLE_ID = "mock-dialog-title";
  const DESC_ID = "mock-dialog-description";
  return {
    ...actual,
    Root: ({
      children,
      open,
    }: {
      children: React.ReactNode;
      open: boolean;
    }) => (open ? <div data-testid="mock-dialog-root">{children}</div> : null),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={DESC_ID}
        {...props}
      >
        {children}
      </div>
    ),
    Title: ({ children }: { children: React.ReactNode }) => (
      <h2 id={TITLE_ID}>{children}</h2>
    ),
    Description: ({ children }: { children: React.ReactNode }) => (
      <p id={DESC_ID}>{children}</p>
    ),
    Close: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// next/navigation stubs — AuthModal doesn't call router but the nested
// forms read useSearchParams().
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// GoogleOAuthButton mock — exposes beforeRedirect to the test so we can
// assert the AuthModal invokes it.
jest.mock("@/components/auth/GoogleOAuthButton", () => ({
  GoogleOAuthButton: ({
    beforeRedirect,
    "data-testid": testId,
  }: {
    beforeRedirect?: () => void;
    "data-testid"?: string;
  }) => (
    <button
      type="button"
      data-testid={testId ?? "google-oauth-button"}
      onClick={() => beforeRedirect?.()}
    >
      Google
    </button>
  ),
}));

// Supabase stub — per-test `mockSupabase` holds the current jest.fn()'s
// for updateUser / signUp / signInWithPassword.
const mockSupabase = {
  auth: {
    updateUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
  },
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

// Analytics stub
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

// fetch for the upgrade endpoint
const mockFetch = jest.fn();
beforeAll(() => {
  (global as unknown as { fetch: typeof fetch }).fetch =
    mockFetch as unknown as typeof fetch;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { AuthModal, type AuthModalProps } from "@/components/auth/AuthModal";
import { IDENTITY_UPGRADE_CONTEXT_KEY } from "@/lib/auth/upgrade-context-storage";
import type { Combatant } from "@/lib/types/combat";

const GUEST_CHAR: Combatant = {
  id: "c-1",
  name: "Thorin",
  role: "player",
  max_hp: 42,
  current_hp: 42,
  ac: 16,
  initiative: 0,
  initiative_modifier: 0,
  team: "ally",
  is_active: true,
} as unknown as Combatant;

function makeProps(overrides: Partial<AuthModalProps> = {}): AuthModalProps {
  return {
    open: true,
    onOpenChange: jest.fn(),
    defaultTab: "signup",
    onSuccess: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthModal", () => {
  describe("rendering", () => {
    it("renders nothing when open=false", () => {
      const { container } = render(<AuthModal {...makeProps({ open: false })} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("renders root + both tabs + submit when open=true (signup default)", () => {
      render(<AuthModal {...makeProps({ defaultTab: "signup" })} />);
      expect(screen.getByTestId("auth.modal.root")).toBeInTheDocument();
      expect(screen.getByTestId("auth.modal.tab-login")).toBeInTheDocument();
      expect(screen.getByTestId("auth.modal.tab-signup")).toBeInTheDocument();
      expect(screen.getByTestId("auth.modal.submit-button")).toBeInTheDocument();
      expect(screen.getByTestId("auth.modal.oauth-google-button")).toBeInTheDocument();
    });

    it("renders login panel when defaultTab=login", () => {
      render(<AuthModal {...makeProps({ defaultTab: "login" })} />);
      // login has no display-name input
      expect(
        screen.queryByTestId("auth.modal.display-name-input"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("auth.modal.switch-to-signup"),
      ).toBeInTheDocument();
    });

    it("renders signup panel when defaultTab=signup with display-name input", () => {
      render(<AuthModal {...makeProps({ defaultTab: "signup" })} />);
      expect(
        screen.getByTestId("auth.modal.display-name-input"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("auth.modal.switch-to-login"),
      ).toBeInTheDocument();
    });

    it("renders preamble when preamble prop provided", () => {
      render(
        <AuthModal
          {...makeProps({ preamble: "Bem-vindo de volta, Dani" })}
        />,
      );
      const preamble = screen.getByTestId("auth.modal.preamble");
      expect(preamble).toBeInTheDocument();
      expect(preamble).toHaveTextContent("Bem-vindo de volta, Dani");
    });

    it("does not render preamble when absent", () => {
      render(<AuthModal {...makeProps()} />);
      expect(screen.queryByTestId("auth.modal.preamble")).not.toBeInTheDocument();
    });

    it("renders upgrade-context-indicator when upgradeContext provided", () => {
      render(
        <AuthModal
          {...makeProps({
            upgradeContext: { sessionTokenId: "tok-1" },
          })}
        />,
      );
      expect(
        screen.getByTestId("auth.modal.upgrade-context-indicator"),
      ).toBeInTheDocument();
    });
  });

  describe("tab switching", () => {
    it("alternates login/signup without closing the modal", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(<AuthModal {...makeProps({ defaultTab: "login", onOpenChange })} />);

      // Starts on login
      expect(
        screen.queryByTestId("auth.modal.display-name-input"),
      ).not.toBeInTheDocument();

      await user.click(screen.getByTestId("auth.modal.switch-to-signup"));
      expect(
        screen.getByTestId("auth.modal.display-name-input"),
      ).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();

      await user.click(screen.getByTestId("auth.modal.switch-to-login"));
      expect(
        screen.queryByTestId("auth.modal.display-name-input"),
      ).not.toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("tab-login/tab-signup buttons also switch without closing", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...makeProps({ defaultTab: "login" })} />);
      await user.click(screen.getByTestId("auth.modal.tab-signup"));
      expect(
        screen.getByTestId("auth.modal.display-name-input"),
      ).toBeInTheDocument();
    });

    // M6 (code review fix) — email + displayName persist across tab switches.
    // Password is intentionally cleared on switch (security).
    it("M6: persists typed email across signup → login → signup tab switches", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...makeProps({ defaultTab: "signup" })} />);

      const signupEmail = screen.getByTestId(
        "auth.modal.email-input",
      ) as HTMLInputElement;
      await user.type(signupEmail, "dani@example.com");
      expect(signupEmail.value).toBe("dani@example.com");

      // Switch to login — email MUST survive.
      await user.click(screen.getByTestId("auth.modal.switch-to-login"));
      const loginEmail = screen.getByTestId(
        "auth.modal.email-input",
      ) as HTMLInputElement;
      expect(loginEmail.value).toBe("dani@example.com");

      // Switch back to signup — still there.
      await user.click(screen.getByTestId("auth.modal.switch-to-signup"));
      const signupEmailAgain = screen.getByTestId(
        "auth.modal.email-input",
      ) as HTMLInputElement;
      expect(signupEmailAgain.value).toBe("dani@example.com");
    });

    it("M6: persists displayName across signup → login → signup", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...makeProps({ defaultTab: "signup" })} />);

      const displayName = screen.getByTestId(
        "auth.modal.display-name-input",
      ) as HTMLInputElement;
      await user.type(displayName, "Dani the Bard");
      expect(displayName.value).toBe("Dani the Bard");

      // Switch to login + back — displayName restored.
      await user.click(screen.getByTestId("auth.modal.switch-to-login"));
      await user.click(screen.getByTestId("auth.modal.switch-to-signup"));

      const displayNameAgain = screen.getByTestId(
        "auth.modal.display-name-input",
      ) as HTMLInputElement;
      expect(displayNameAgain.value).toBe("Dani the Bard");
    });

    it("M6: password is CLEARED on tab switch (security — intentional)", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...makeProps({ defaultTab: "signup" })} />);

      const signupPw = screen.getByTestId(
        "auth.modal.password-input",
      ) as HTMLInputElement;
      await user.type(signupPw, "super-secret");
      expect(signupPw.value).toBe("super-secret");

      // Switch to login — password field is a fresh (different) input.
      await user.click(screen.getByTestId("auth.modal.switch-to-login"));
      const loginPw = screen.getByTestId(
        "auth.modal.password-input",
      ) as HTMLInputElement;
      expect(loginPw.value).toBe("");

      // Switch back to signup — password still cleared (unmount + remount).
      await user.click(screen.getByTestId("auth.modal.switch-to-signup"));
      const signupPwAgain = screen.getByTestId(
        "auth.modal.password-input",
      ) as HTMLInputElement;
      expect(signupPwAgain.value).toBe("");
    });
  });

  describe("upgrade flow (signup with upgradeContext)", () => {
    it("calls /api/player-identity/upgrade with mode=email (no client-side updateUser) — C2 fix", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, userId: "user-abc" }),
      });

      const onSuccess = jest.fn();
      render(
        <AuthModal
          {...makeProps({
            defaultTab: "signup",
            onSuccess,
            upgradeContext: {
              sessionTokenId: "tok-42",
              guestCharacter: GUEST_CHAR,
            },
          })}
        />,
      );

      await user.type(
        screen.getByTestId("auth.modal.email-input"),
        "dani@example.com",
      );
      await user.type(
        screen.getByTestId("auth.modal.display-name-input"),
        "Dani",
      );
      await user.type(
        screen.getByTestId("auth.modal.password-input"),
        "password123",
      );
      // The repeat-password input doesn't have its own testid in the
      // contract — find it by id so tests stay maintainable.
      const repeat = document.getElementById(
        "signup-repeat-password",
      ) as HTMLInputElement;
      await user.type(repeat, "password123");

      await user.click(screen.getByTestId("auth.modal.submit-button"));

      // C2 fix: client no longer calls updateUser — the server does the
      // admin.updateUserById in the upgrade endpoint. This eliminates the
      // half-upgraded state race.
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
      // Server saga called with credentials + mode=email.
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/player-identity/upgrade",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("tok-42"),
        }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mode).toBe("email");
      expect(body.credentials.email).toBe("dani@example.com");
      expect(body.credentials.password).toBe("password123");
      expect(body.credentials.displayName).toBe("Dani");
      // Critical: plain signUp NOT invoked in upgrade path
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
      // onSuccess receives upgraded=true with the userId from the server
      expect(onSuccess).toHaveBeenCalledWith({
        userId: "user-abc",
        isNewAccount: false,
        upgraded: true,
      });
    });

    it("surfaces error when upgrade endpoint returns ok=false", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          code: "migration_partial_failure",
          message: "partial",
        }),
      });
      render(
        <AuthModal
          {...makeProps({
            defaultTab: "signup",
            upgradeContext: { sessionTokenId: "tok-42" },
          })}
        />,
      );

      await user.type(screen.getByTestId("auth.modal.email-input"), "a@b.co");
      await user.type(
        screen.getByTestId("auth.modal.password-input"),
        "password123",
      );
      const repeat = document.getElementById(
        "signup-repeat-password",
      ) as HTMLInputElement;
      await user.type(repeat, "password123");

      await user.click(screen.getByTestId("auth.modal.submit-button"));

      expect(screen.getByTestId("auth.modal.error")).toBeInTheDocument();
      // Critical (C2): client must not have mutated auth state — server
      // is the single point of truth.
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("ordinary signup (no upgradeContext)", () => {
    it("calls supabase.auth.signUp and NOT the upgrade endpoint", async () => {
      const user = userEvent.setup();
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: "new-user-1", identities: [{ id: "i" }] },
        },
        error: null,
      });

      const onSuccess = jest.fn();
      render(
        <AuthModal
          {...makeProps({ defaultTab: "signup", onSuccess })}
        />,
      );

      await user.type(
        screen.getByTestId("auth.modal.email-input"),
        "new@example.com",
      );
      await user.type(
        screen.getByTestId("auth.modal.password-input"),
        "password123",
      );
      const repeat = document.getElementById(
        "signup-repeat-password",
      ) as HTMLInputElement;
      await user.type(repeat, "password123");
      await user.click(screen.getByTestId("auth.modal.submit-button"));

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@example.com",
          password: "password123",
        }),
      );
      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/player-identity/upgrade",
        expect.anything(),
      );
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith({
        userId: "new-user-1",
        isNewAccount: true,
        upgraded: false,
      });
    });
  });

  describe("login flow", () => {
    it("onSuccess receives isNewAccount=false, upgraded=false", async () => {
      const user = userEvent.setup();
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "existing-user" } },
        error: null,
      });
      const onSuccess = jest.fn();
      render(<AuthModal {...makeProps({ defaultTab: "login", onSuccess })} />);

      await user.type(
        screen.getByTestId("auth.modal.email-input"),
        "me@there.com",
      );
      await user.type(
        screen.getByTestId("auth.modal.password-input"),
        "sup3rsecret",
      );
      await user.click(screen.getByTestId("auth.modal.submit-button"));

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith({
        userId: "existing-user",
        isNewAccount: false,
        upgraded: false,
      });
    });
  });

  describe("Google OAuth persistence", () => {
    it("persists upgradeContext to localStorage and closes the modal", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(
        <AuthModal
          {...makeProps({
            defaultTab: "signup",
            onOpenChange,
            upgradeContext: {
              sessionTokenId: "tok-88",
              campaignId: "camp-1",
              guestCharacter: GUEST_CHAR,
            },
          })}
        />,
      );

      await user.click(screen.getByTestId("auth.modal.oauth-google-button"));

      const persisted = localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY);
      expect(persisted).toBeTruthy();
      const parsed = JSON.parse(persisted!);
      expect(parsed.sessionTokenId).toBe("tok-88");
      expect(parsed.campaignId).toBe("camp-1");
      expect(parsed.guestCharacter.name).toBe("Thorin");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not persist when no upgradeContext but still closes modal", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(<AuthModal {...makeProps({ onOpenChange })} />);

      await user.click(screen.getByTestId("auth.modal.oauth-google-button"));

      expect(localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY)).toBeNull();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("contract: all required testids present", () => {
    it("root, tabs, email, password, submit, oauth all present (signup)", () => {
      render(<AuthModal {...makeProps({ defaultTab: "signup" })} />);
      const dialog = screen.getByTestId("auth.modal.root");
      const w = within(dialog);
      expect(w.getByTestId("auth.modal.tab-login")).toBeInTheDocument();
      expect(w.getByTestId("auth.modal.tab-signup")).toBeInTheDocument();
      expect(w.getByTestId("auth.modal.email-input")).toBeInTheDocument();
      expect(w.getByTestId("auth.modal.password-input")).toBeInTheDocument();
      expect(w.getByTestId("auth.modal.display-name-input")).toBeInTheDocument();
      expect(w.getByTestId("auth.modal.submit-button")).toBeInTheDocument();
      expect(w.getByTestId("auth.modal.oauth-google-button")).toBeInTheDocument();
    });
  });

  describe("axe-core accessibility", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let axe: any;
    beforeAll(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        axe = require("axe-core");
      } catch {
        axe = null;
      }
    });

    it("has zero violations on initial open (signup tab)", async () => {
      const { container } = render(
        <AuthModal {...makeProps({ defaultTab: "signup" })} />,
      );
      if (!axe) {
        console.warn(
          "[auth-modal.test] axe-core not installed — skipping axe assertions.",
        );
        return;
      }
      const result = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      });
      expect(result.violations).toEqual([]);
    });

    it("has zero violations after switching to login", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AuthModal {...makeProps({ defaultTab: "signup" })} />,
      );
      await act(async () => {
        await user.click(screen.getByTestId("auth.modal.tab-login"));
      });
      if (!axe) return;
      const result = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      });
      expect(result.violations).toEqual([]);
    });
  });
});
