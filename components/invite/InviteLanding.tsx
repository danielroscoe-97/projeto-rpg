"use client";

/**
 * InviteLanding — client renderer for /invite/[token] (Story 02-D).
 *
 * Reads the pre-resolved state from `detectInviteState` (server-side) and
 * branches into 4 UX flows:
 *
 *   - `invalid`                      → error card + "back to dashboard" CTA
 *   - `guest`                        → landing + `AuthModal` (signup default)
 *   - `auth`                         → `CharacterPickerModal` (auto-opened)
 *                                      + "create account" alert when the user
 *                                      is anonymous (Supabase is_anonymous)
 *   - `auth-with-invite-pending`     → preamble "Bem-vindo de volta, {name}"
 *                                      + same picker as `auth`
 *
 * All accept-logic reuses `acceptInviteAction` from `app/invite/actions.ts`
 * — no duplication of the server-side saga here. The picker submits, this
 * component forwards to the action, toast + redirect on success.
 *
 * Testids follow the contract in docs/testing-data-testid-contract.md §3.2
 * (`invite.landing.*`).
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { acceptInviteAction } from "@/app/invite/actions";
import type { InviteState } from "@/lib/identity/detect-invite-state";
import {
  CharacterPickerModal,
  type CharacterPickerResult,
} from "@/components/character/CharacterPickerModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";

export interface InviteLandingProps {
  state: InviteState;
  token: string;
}

export function InviteLanding({ state, token }: InviteLandingProps) {
  const t = useTranslations("invite.landing");
  const tCampaign = useTranslations("campaign");
  const router = useRouter();

  // Shared accept handler for auth / auth-with-invite-pending branches. We
  // accept the picker result and forward to the server action — identical
  // semantics to InviteAcceptClient (backward compat preserved).
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickerSelect = useCallback(
    async (result: CharacterPickerResult) => {
      if (state.state !== "auth" && state.state !== "auth-with-invite-pending") {
        return;
      }
      const invite = state.invite;
      setIsSubmitting(true);
      try {
        if (result.mode === "claimed") {
          await acceptInviteAction({
            inviteId: invite.id,
            campaignId: invite.campaignId,
            token,
            claimCharacterId: result.characterId,
          });
        } else if (result.mode === "picked") {
          await acceptInviteAction({
            inviteId: invite.id,
            campaignId: invite.campaignId,
            token,
            existingCharacterId: result.characterId,
          });
        } else {
          const { characterData } = result;
          await acceptInviteAction({
            inviteId: invite.id,
            campaignId: invite.campaignId,
            token,
            name: characterData.name,
            maxHp: characterData.maxHp,
            currentHp: characterData.currentHp,
            ac: characterData.ac,
            spellSaveDc: characterData.spellSaveDc,
          });
        }

        toast.success(tCampaign("invite_accepted"));
        router.push("/app/dashboard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("já foi escolhido") || msg.includes("already chosen")) {
          toast.error(tCampaign("invite_claim_already_taken"));
          window.location.reload();
        } else {
          toast.error(tCampaign("invite_error"));
        }
        captureError(err, {
          component: "InviteLanding",
          action: "acceptInvite",
          category: "network",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [state, token, tCampaign, router],
  );

  // --- Branch: invalid -----------------------------------------------------
  if (state.state === "invalid") {
    const reasonKey =
      state.reason === "not_found"
        ? "error_not_found"
        : state.reason === "expired"
          ? "error_expired"
          : "error_accepted";

    return (
      <div
        data-testid="invite.landing.root"
        className="flex min-h-svh items-center justify-center p-6"
      >
        <div
          data-testid="invite.landing.state-invalid"
          className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-surface-secondary p-6 text-center space-y-4"
          role="alert"
        >
          <h1 className="text-foreground text-xl font-semibold">
            {t("error_title")}
          </h1>
          <p
            data-testid={`invite.landing.error-reason-${state.reason}`}
            className="text-sm text-muted-foreground"
          >
            {t(reasonKey)}
          </p>
          <Link
            href="/app/dashboard"
            data-testid="invite.landing.cta-primary"
            className="inline-block text-sm text-gold hover:underline"
          >
            {t("back_to_dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  // --- Shared header (campaign + DM name) ---------------------------------
  const { invite } = state;
  const dmNameDisplay = invite.dmName ?? t("dm_fallback");

  // --- Branch: guest -------------------------------------------------------
  if (state.state === "guest") {
    return (
      <GuestBranch
        token={token}
        campaignName={invite.campaignName}
        dmName={dmNameDisplay}
      />
    );
  }

  // --- Branch: auth or auth-with-invite-pending ----------------------------
  // Both render the picker. The pending branch also shows a preamble greeting.
  const displayName =
    state.state === "auth-with-invite-pending"
      ? state.displayName
      : null;

  return (
    <AuthBranch
      state={state.state}
      userId={state.user.id}
      isAnonymous={state.isAnonymous}
      inviteId={invite.id}
      campaignId={invite.campaignId}
      campaignName={invite.campaignName}
      dmName={dmNameDisplay}
      displayName={displayName}
      onSelect={handlePickerSelect}
      isSubmitting={isSubmitting}
    />
  );
}

/* -------------------------------------------------------------------------
 * Guest branch — standalone to keep `useState` scoped.
 * ---------------------------------------------------------------------- */

function GuestBranch({
  token: _token,
  campaignName,
  dmName,
}: {
  token: string;
  campaignName: string;
  dmName: string;
}) {
  const t = useTranslations("invite.landing");
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  // /invite/[token] has no session_token (it's the email-invite entrypoint,
  // not the DM-link entrypoint) so we don't thread upgradeContext here —
  // the signup flow goes through plain supabase.auth.signUp.
  const handleAuthSuccess = useCallback(() => {
    setAuthOpen(false);
    // After signup/login, reload to re-run detectInviteState with the new
    // auth cookie. The server will now branch into "auth" or
    // "auth-with-invite-pending" and render the picker.
    router.refresh();
  }, [router]);

  return (
    <div
      data-testid="invite.landing.root"
      className="flex min-h-svh items-center justify-center p-6"
    >
      <div
        data-testid="invite.landing.state-guest"
        className="w-full max-w-md rounded-lg border border-white/[0.08] bg-surface-secondary p-6 space-y-6 text-center"
      >
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-foreground tracking-wide">
            {t("title_guest")}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span data-testid="invite.landing.dm-name">{dmName}</span>{" "}
            {t("guest_invited_by_separator")}{" "}
            <span
              data-testid="invite.landing.campaign-name"
              className="text-gold font-medium"
            >
              {campaignName}
            </span>
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="gold"
            data-testid="invite.landing.cta-primary"
            onClick={() => setAuthOpen(true)}
            className="w-full min-h-[44px]"
          >
            {t("cta_signup")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("cta_login")}{" "}
            <button
              type="button"
              data-testid="invite.landing.cta-secondary"
              onClick={() => setAuthOpen(true)}
              className="text-gold hover:underline"
            >
              {t("cta_login_link")}
            </button>
          </p>
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab="signup"
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Auth branch (both "auth" and "auth-with-invite-pending").
 * ---------------------------------------------------------------------- */

function AuthBranch({
  state,
  userId,
  isAnonymous,
  inviteId: _inviteId,
  campaignId,
  campaignName,
  dmName,
  displayName,
  onSelect,
  isSubmitting,
}: {
  state: "auth" | "auth-with-invite-pending";
  userId: string;
  isAnonymous: boolean;
  inviteId: string;
  campaignId: string;
  campaignName: string;
  dmName: string;
  displayName: string | null;
  onSelect: (result: CharacterPickerResult) => Promise<void>;
  isSubmitting: boolean;
}) {
  const t = useTranslations("invite.landing");
  // Picker auto-opens on mount — same UX as the legacy InviteAcceptClient.
  // We intentionally ignore close attempts so the user can't land on an
  // empty page (dead-end prevention — see CharacterPickerModal docs).
  const [pickerOpen, setPickerOpen] = useState(true);
  // Anon upgrade CTA opens a second modal. Keeps the picker untouched so
  // the player can still accept-as-anon if they prefer (non-blocking alert).
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handlePickerOpenChange = useCallback((next: boolean) => {
    if (next) setPickerOpen(true);
    // Silently drop close attempts.
  }, []);

  const greetingName = displayName ?? t("preamble_fallback");

  return (
    <div
      data-testid="invite.landing.root"
      className="flex min-h-svh items-center justify-center p-6"
    >
      <div
        data-testid={
          state === "auth-with-invite-pending"
            ? "invite.landing.state-auth-with-invite-pending"
            : "invite.landing.state-auth"
        }
        className="w-full max-w-md space-y-4"
      >
        {state === "auth-with-invite-pending" && (
          <div
            data-testid="invite.landing.preamble"
            className="rounded-md border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold/90 text-center"
          >
            {t("title_returning", { displayName: greetingName })}
          </div>
        )}

        <div className="sr-only">
          <span data-testid="invite.landing.campaign-name">{campaignName}</span>
          <span data-testid="invite.landing.dm-name">{dmName}</span>
        </div>

        {isAnonymous && (
          <div
            data-testid="invite.landing.anon-warning"
            role="alert"
            className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 space-y-2"
          >
            <p className="text-sm text-amber-300/90 font-medium">
              {t("anon_warning_title")}
            </p>
            <button
              type="button"
              data-testid="invite.landing.anon-warning-cta"
              onClick={() => setUpgradeOpen(true)}
              className="text-xs text-gold hover:underline"
            >
              {t("anon_warning_cta")}
            </button>
          </div>
        )}
      </div>

      <CharacterPickerModal
        campaignId={campaignId}
        playerIdentity={{ userId }}
        open={pickerOpen}
        onOpenChange={handlePickerOpenChange}
        onSelect={onSelect}
        campaignName={campaignName}
        dmName={dmName}
        isSubmitting={isSubmitting}
      />

      {isAnonymous && (
        <AuthModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          defaultTab="signup"
          onSuccess={() => setUpgradeOpen(false)}
        />
      )}
    </div>
  );
}
