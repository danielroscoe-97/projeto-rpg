"use client";

/**
 * AuthModal — reusable authentication dialog (Epic 02, Story 02-C).
 *
 * Wraps `LoginForm` + `SignUpForm` in a shadcn `Dialog`. Supports:
 *
 *   - Tab alternation (login ↔ signup) without closing.
 *   - `upgradeContext` — when provided, signup flow routes through
 *     `POST /api/player-identity/upgrade` (Epic 01 saga) instead of
 *     `supabase.auth.signUp`. Preserves the anon user's UUID.
 *   - Google OAuth full-page flow: clicking the OAuth button saves
 *     `upgradeContext` to localStorage under `identity-upgrade-context-v1`
 *     and closes the modal before redirect. The `/auth/callback` client-side
 *     handler reads that entry after OAuth completes and continues the flow.
 *   - `onSuccess` callback — fires after auth success with `{userId,
 *     isNewAccount, upgraded}`. Consumer decides routing.
 *
 * Testids: see `docs/testing-data-testid-contract.md` §3.4 (`auth.modal.*`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import type { Combatant } from "@/lib/types/combat";
import {
  IDENTITY_UPGRADE_CONTEXT_KEY,
  readPersistedUpgradeContext,
  type PersistedUpgradeContext,
} from "@/lib/auth/upgrade-context-storage";

export type AuthModalSuccessPayload = {
  userId: string;
  isNewAccount: boolean;
  upgraded: boolean;
};

export type AuthModalUpgradeContext = {
  sessionTokenId: string;
  campaignId?: string;
  guestCharacter?: Combatant;
  /**
   * Origin CTA (Epic 03 — Cluster Δ C1). When provided, the Google OAuth
   * pre-redirect serialiser forwards this to the persisted upgrade context so
   * the `/auth/callback/continue` handler can fire `conversion:completed`
   * with the right `moment`. Without this, the callback has no way to know
   * which CTA started the flow (in-memory state is lost across the OAuth
   * redirect) and the anon funnel lands in 0 across every moment.
   */
  moment?: "waiting" | "recap_anon";
};

export interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab: "login" | "signup";
  onSuccess: (result: AuthModalSuccessPayload) => void;
  /** If provided, signup flow routes through the upgrade saga. */
  upgradeContext?: AuthModalUpgradeContext;
  /** Optional greeting shown above the tabs (e.g. "Welcome back, Dani"). */
  preamble?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab,
  onSuccess,
  upgradeContext,
  preamble,
}: AuthModalProps) {
  const t = useTranslations("auth.modal");
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);

  // M6 (code review fix): lift shared form fields to the modal so tab
  // switches don't unmount+remount the inputs (and clobber typed text).
  // - `email` is shared between login and signup (same field semantics).
  // - `displayName` is signup-only but lives here so it survives the
  //   login → signup → login round-trip.
  // - `password` is intentionally NOT lifted: security requires the field to
  //   reset when the form unmounts, preventing leak-in-dom or accidental
  //   reuse across login↔signup.
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Reset tab when the caller opens the modal with a different defaultTab.
  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  // Reset controlled fields when the modal is closed so re-opening it starts
  // fresh. Avoids carrying email across unrelated modal sessions.
  useEffect(() => {
    if (!open) {
      setEmail("");
      setDisplayName("");
    }
  }, [open]);

  // Snapshot the upgrade context into a serialisable form each render. We
  // persist it just before the OAuth redirect — see `handleGoogleOAuth`.
  //
  // Cluster Δ C1 — carry the `moment` attribution tag through. Without it,
  // `/auth/callback/continue` has no way to distinguish waiting-room-triggered
  // OAuth from recap-triggered OAuth, which is why the anon conversion funnel
  // was landing in 0. Legacy callers that don't pass `moment` simply emit
  // nothing from the callback (old contract preserved — see
  // AuthCallbackContinueClient.runUpgrade's `if (persisted.moment)` guard).
  const serialisedContext = useMemo<PersistedUpgradeContext | null>(() => {
    if (!upgradeContext) return null;
    return {
      sessionTokenId: upgradeContext.sessionTokenId,
      campaignId: upgradeContext.campaignId,
      guestCharacter: upgradeContext.guestCharacter,
      moment: upgradeContext.moment,
      savedAt: Date.now(),
    };
  }, [upgradeContext]);

  const handleBeforeGoogleOAuth = useCallback(() => {
    // Close the modal visually — the OAuth redirect is full-page so a lingering
    // modal would flash. The /auth/callback handler reopens a minimal "finishing
    // upgrade" state if needed.
    if (serialisedContext) {
      try {
        // Cluster Δ C1 — merge-preserve any already-persisted `moment`.
        // PlayerJoinClient now writes `moment` directly at CTA-click time
        // (before the modal even opens) so the attribution survives even if
        // `upgradeContext.moment` is undefined on this particular render
        // (e.g. the CTA wires moment via the pre-write rather than via
        // props). If a fresh entry (< 30s) exists with a moment and the
        // incoming serialised context has no moment, keep the existing
        // moment; in all other cases overwrite (the incoming context is
        // more authoritative about sessionTokenId / campaignId).
        const existing = readPersistedUpgradeContext();
        const existingMomentFresh =
          !!existing?.moment &&
          typeof existing.savedAt === "number" &&
          Date.now() - existing.savedAt < 30_000;
        const payload: PersistedUpgradeContext =
          existingMomentFresh && !serialisedContext.moment
            ? { ...serialisedContext, moment: existing?.moment }
            : serialisedContext;
        localStorage.setItem(
          IDENTITY_UPGRADE_CONTEXT_KEY,
          JSON.stringify(payload),
        );
      } catch {
        // Safari ITP or storage disabled — we degrade to a plain OAuth signup
        // (new user, no UUID preservation). The saga's recovery endpoint is
        // NOT invoked in that case. This is documented as acceptable fallback
        // in docs/epics/player-identity/epic-02-player-dashboard-invite.md.
      }
    }
    onOpenChange(false);
  }, [serialisedContext, onOpenChange]);

  const switchTab = useCallback((next: "login" | "signup") => {
    setActiveTab(next);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="auth.modal.root"
        className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{t("dialog_title")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("dialog_description")}
          </DialogDescription>
        </DialogHeader>

        {preamble ? (
          <div
            data-testid="auth.modal.preamble"
            className="mb-2 rounded-md border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-gold/90"
          >
            {preamble}
          </div>
        ) : null}

        {upgradeContext ? (
          <div
            data-testid="auth.modal.upgrade-context-indicator"
            className="mb-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300/90"
          >
            {t("upgrade_indicator")}
          </div>
        ) : null}

        {/* Tabs — intentionally hand-built buttons rather than the shadcn Tabs
          primitive. This keeps the DOM small and predictable for jsdom tests
          and matches the contract testid shape (`auth.modal.tab-*`). */}
        <div
          role="tablist"
          aria-label={t("dialog_title")}
          className="mb-3 grid grid-cols-2 gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "login"}
            data-state={activeTab === "login" ? "active" : "inactive"}
            data-testid="auth.modal.tab-login"
            onClick={() => switchTab("login")}
            className={`min-h-[40px] rounded-sm text-sm font-medium transition-colors ${
              activeTab === "login"
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_login")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "signup"}
            data-state={activeTab === "signup" ? "active" : "inactive"}
            data-testid="auth.modal.tab-signup"
            onClick={() => switchTab("signup")}
            className={`min-h-[40px] rounded-sm text-sm font-medium transition-colors ${
              activeTab === "signup"
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tab_signup")}
          </button>
        </div>

        {activeTab === "login" ? (
          <>
            <LoginForm
              variant="inline"
              email={email}
              onEmailChange={setEmail}
              onSuccess={(payload) =>
                onSuccess({
                  userId: payload.userId,
                  isNewAccount: false,
                  upgraded: false,
                })
              }
              onRequestGoogleOAuth={handleBeforeGoogleOAuth}
              testIdPrefix="auth.modal"
            />
            <p className="mt-4 text-center text-sm text-muted-foreground/90">
              <button
                type="button"
                data-testid="auth.modal.switch-to-signup"
                onClick={() => switchTab("signup")}
                className="text-gold underline underline-offset-4 hover:text-gold/80"
              >
                {t("switch_to_signup")}
              </button>
            </p>
          </>
        ) : (
          <>
            <SignUpForm
              variant="inline"
              email={email}
              onEmailChange={setEmail}
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              upgradeContext={upgradeContext}
              onSuccess={(payload) => onSuccess(payload)}
              onRequestGoogleOAuth={handleBeforeGoogleOAuth}
              testIdPrefix="auth.modal"
            />
            <p className="mt-4 text-center text-sm text-muted-foreground/90">
              <button
                type="button"
                data-testid="auth.modal.switch-to-login"
                onClick={() => switchTab("login")}
                className="text-gold underline underline-offset-4 hover:text-gold/80"
              >
                {t("switch_to_login")}
              </button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
