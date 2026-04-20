"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { getAuthErrorKey } from "@/lib/auth/translate-error";
import { Swords, Shield, Users } from "lucide-react";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import type { Combatant } from "@/lib/types/combat";

type SignUpSuccessPayload = {
  userId: string;
  isNewAccount: boolean;
  upgraded: boolean;
};

type Variant = "page" | "inline";

export interface SignUpUpgradeContext {
  sessionTokenId: string;
  campaignId?: string;
  guestCharacter?: Combatant;
}

export type SignUpFormProps = React.ComponentPropsWithoutRef<"div"> & {
  /**
   * "page" preserves the standalone-page behavior (role selection cards,
   * post-success redirect to /auth/sign-up-success, query-param pendingJoin
   * persistence). "inline" is the AuthModal variant — no role cards, no
   * redirect, caller consumes success via `onSuccess`.
   */
  variant?: Variant;
  onSuccess?: (payload: SignUpSuccessPayload) => void;
  /**
   * If provided (and variant="inline"), signup routes through
   * `POST /api/player-identity/upgrade` (Epic 01 saga) instead of
   * `supabase.auth.signUp`. Preserves the anon user's UUID.
   */
  upgradeContext?: SignUpUpgradeContext;
  /** Fired synchronously before the Google OAuth redirect. */
  onRequestGoogleOAuth?: () => void;
  /** Override the testid namespace — modal uses `auth.modal`. */
  testIdPrefix?: string;
  /**
   * M6 (code review fix): controlled email + displayName bindings. When
   * provided (AuthModal variant), the parent owns the values so login↔signup
   * tab switches don't reset them. Password fields stay uncontrolled and
   * reset on unmount (security).
   */
  email?: string;
  onEmailChange?: (value: string) => void;
  displayName?: string;
  onDisplayNameChange?: (value: string) => void;
};

export function SignUpForm({
  className,
  variant = "page",
  onSuccess,
  upgradeContext,
  onRequestGoogleOAuth,
  testIdPrefix,
  email: controlledEmail,
  onEmailChange,
  displayName: controlledDisplayName,
  onDisplayNameChange,
  ...props
}: SignUpFormProps) {
  const t = useTranslations("auth");
  const tModal = useTranslations("auth.modal");
  const tc = useTranslations("common");
  const te = useTranslations("auth_errors");
  const ts = useTranslations("signup");
  // Controlled-or-uncontrolled email + displayName (M6 fix for AuthModal tab
  // switching). Password + repeatPassword stay strictly local.
  const [uncontrolledEmail, setUncontrolledEmail] = useState("");
  const email = controlledEmail ?? uncontrolledEmail;
  const setEmail = (value: string) => {
    if (onEmailChange) onEmailChange(value);
    else setUncontrolledEmail(value);
  };
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [uncontrolledDisplayName, setUncontrolledDisplayName] = useState("");
  const displayName = controlledDisplayName ?? uncontrolledDisplayName;
  const setDisplayName = (value: string) => {
    if (onDisplayNameChange) onDisplayNameChange(value);
    else setUncontrolledDisplayName(value);
  };
  const [selectedRole, setSelectedRole] = useState<"player" | "dm" | "both">("both");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const router = useRouter();

  const isInline = variant === "inline";
  const tid = (slot: string) => (testIdPrefix ? `${testIdPrefix}.${slot}` : undefined);

  const roleOptions = [
    { value: "player" as const, icon: <Swords className="w-5 h-5" />, label: ts("role_player") },
    { value: "dm" as const, icon: <Shield className="w-5 h-5" />, label: ts("role_dm") },
    { value: "both" as const, icon: <Users className="w-5 h-5" />, label: ts("role_both") },
  ];

  // A6: Use Next.js useSearchParams for SSR-safe param reading (no hydration mismatch)
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? null;
  const inviteCampaignId = searchParams.get("campaign") ?? null;
  const joinCode = searchParams.get("join_code") ?? null;
  const signupContext = searchParams.get("context") ?? null;

  // JO-01/JO-02: Save pending tokens to localStorage as fallback for tab close/OAuth redirect
  useEffect(() => {
    if (isInline) return; // inline/modal mode — pending-token plumbing is caller's job
    try {
      if (inviteToken) {
        localStorage.setItem("pendingInvite", JSON.stringify({
          token: inviteToken,
          campaignId: inviteCampaignId,
          path: `/invite/${inviteToken}`,
          savedAt: Date.now(), // S1-EC-02: TTL anchor — expires in 24h
        }));
      }
      if (joinCode) {
        // P2-06: store with savedAt so dashboard can enforce 24h TTL
        localStorage.setItem("pendingJoinCode", JSON.stringify({
          code: joinCode,
          savedAt: Date.now(),
        }));
      }
    } catch {
      // localStorage unavailable — rely on URL params
    }
  }, [inviteToken, inviteCampaignId, joinCode, isInline]);

  /**
   * Inline signup — either via upgrade saga (anon→auth) or ordinary signup.
   * The modal owns redirect via `onSuccess`, so we never `router.push` here.
   */
  const handleInlineSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (password !== repeatPassword) {
      setError(t("passwords_mismatch"));
      setPasswordMismatch(true);
      setIsLoading(false);
      return;
    }
    setPasswordMismatch(false);
    trackEvent("auth:signup_start");

    try {
      const supabase = createClient();
      if (upgradeContext) {
        // Upgrade flow (Wave 2 C2 fix): we no longer call `updateUser`
        // client-side. Instead the server route runs
        // `admin.updateUserById` AND the saga in a single request. This
        // removes the half-upgraded window where a client crash between
        // the two calls would leave auth.users with new credentials but
        // public.users never populated.
        const response = await fetch("/api/player-identity/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionTokenId: upgradeContext.sessionTokenId,
            mode: "email",
            credentials: {
              email,
              password,
              displayName: displayName || undefined,
            },
            guestCharacter: upgradeContext.guestCharacter,
          }),
        });
        const result = await response.json();
        if (!response.ok || result?.ok === false) {
          const msg = result?.message ?? tModal("upgrade_failed");
          throw new Error(msg);
        }
        trackEvent("auth:signup", { method: "upgrade", source: "auth_modal" });
        onSuccess?.({
          userId: result?.userId ?? "",
          isNewAccount: false,
          upgraded: true,
        });
        return;
      }

      // Ordinary signup path (no upgradeContext). We still post to our own
      // confirm flow so the modal consumer can redirect wherever it wants.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      if (error) throw error;
      if (data.user && data.user.identities?.length === 0) {
        setError(te("user_already_registered"));
        setIsLoading(false);
        return;
      }
      trackEvent("auth:signup", { method: "email", source: "auth_modal" });
      onSuccess?.({
        userId: data.user?.id ?? "",
        isNewAccount: true,
        upgraded: false,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const key = getAuthErrorKey(msg);
      setError(key ? te(key) : `${tc("error_generic")} (${msg})`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Page-mode signup — unchanged from the pre-02-C behavior (redirect to
   * /auth/sign-up-success, preserve invite/join params through email confirm).
   */
  const handlePageSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t("passwords_mismatch"));
      setPasswordMismatch(true);
      setIsLoading(false);
      return;
    }
    setPasswordMismatch(false);

    trackEvent("auth:signup_start");

    try {
      // Preserve invite/join params through email confirmation redirect
      let redirectUrl = `${window.location.origin}/auth/confirm?role=${encodeURIComponent(selectedRole || "both")}`;
      if (joinCode) {
        redirectUrl += `&join_code=${encodeURIComponent(joinCode)}`;
      } else if (inviteToken) {
        // P1-02: campaignId is optional — invite token alone is sufficient
        redirectUrl += `&invite=${encodeURIComponent(inviteToken)}`;
        if (inviteCampaignId) redirectUrl += `&campaign=${encodeURIComponent(inviteCampaignId)}`;
      } else if (signupContext) {
        redirectUrl += `&context=${encodeURIComponent(signupContext)}`;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      // Supabase returns identities=[] when a user already exists (fake signup)
      if (data.user && data.user.identities?.length === 0) {
        setError(te("user_already_registered"));
        setIsLoading(false);
        return;
      }
      const ALLOWED_CONTEXTS = ["campaign_join"] as const;
      const safeContext = (ALLOWED_CONTEXTS as readonly string[]).includes(signupContext ?? "")
        ? signupContext
        : null;
      trackEvent("auth:signup", {
        role: selectedRole,
        source: inviteToken ? "/invite" : joinCode ? "/join" : safeContext ?? "direct",
        method: "email",
      });
      let successUrl = `/auth/sign-up-success?email=${encodeURIComponent(email)}&role=${encodeURIComponent(selectedRole || "both")}`;
      if (joinCode) {
        successUrl += `&join_code=${encodeURIComponent(joinCode)}`;
      } else if (inviteToken) {
        // P1-02: campaignId is optional
        successUrl += `&invite=${encodeURIComponent(inviteToken)}`;
        if (inviteCampaignId) successUrl += `&campaign=${encodeURIComponent(inviteCampaignId)}`;
      } else if (signupContext) {
        successUrl += `&context=${encodeURIComponent(signupContext)}`;
      }
      router.push(successUrl);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[signup] error:", msg, error);
      const key = getAuthErrorKey(msg);
      setError(key ? te(key) : `${tc("error_generic")} (${msg})`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = isInline ? handleInlineSignUp : handlePageSignUp;

  const inputClass =
    "bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg focus:border-gold/60 focus:ring-gold/50";

  // JO-03: Determine contextual signup type for banner display
  const signupContextType: "invite" | "join_code" | "campaign_join" | "generic" = inviteToken
    ? "invite"
    : joinCode
      ? "join_code"
      : signupContext === "campaign_join"
        ? "campaign_join"
        : "generic";

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {/* JO-03: Contextual banner when coming from invite/join/combat (page mode only) */}
      {!isInline && signupContextType !== "generic" && (
        <div data-testid="signup-context-banner" className="mb-4 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0 text-gold">
            {signupContextType === "invite" ? (
              <Swords className="w-5 h-5" />
            ) : signupContextType === "join_code" ? (
              <Shield className="w-5 h-5" />
            ) : (
              <Swords className="w-5 h-5" />
            )}
          </div>
          <p className="text-sm text-gold/90">
            {signupContextType === "invite" && ts("signup_context_invite")}
            {signupContextType === "join_code" && ts("signup_context_join_code")}
            {signupContextType === "campaign_join" && ts("signup_context_campaign_join")}
          </p>
        </div>
      )}

      {/* Page chrome — suppressed in inline mode. */}
      {!isInline && (
        <>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
            </div>
          </div>
          <h2 className="font-display text-2xl text-center text-foreground tracking-wide mb-1">
            {t("signup_title")}
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-4">
            {t("signup_description")}
          </p>
        </>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            {t("email_label")}
          </label>
          <Input
            id="signup-email"
            type="email"
            placeholder={t("email_placeholder")}
            required
            aria-required="true"
            aria-describedby={error ? "signup-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid={tid("email-input")}
            className={inputClass}
          />
        </div>

        {/* Inline mode: display name input (modal surfaces it since we have no role cards). */}
        {isInline && (
          <div className="space-y-1.5">
            <label htmlFor="signup-display-name" className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
              <Users className="w-3.5 h-3.5" />
              {tModal("display_name_label")}
            </label>
            <Input
              id="signup-display-name"
              type="text"
              placeholder={tModal("display_name_placeholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid={tid("display-name-input")}
              className={inputClass}
            />
          </div>
        )}

        {/* Password row — side by side like Liberty RO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              {t("password_label")}
            </label>
            <Input
              id="signup-password"
              type="password"
              required
              aria-required="true"
              placeholder={t("password_min_chars")}
              aria-describedby={error ? "signup-error" : undefined}
              aria-invalid={passwordMismatch || undefined}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordMismatch(false); }}
              data-testid={tid("password-input")}
              className={`${inputClass}${passwordMismatch ? " field-error" : ""}`}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="signup-repeat-password" className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              {t("repeat_password")}
            </label>
            <Input
              id="signup-repeat-password"
              type="password"
              required
              aria-required="true"
              placeholder={t("repeat_password")}
              aria-describedby={error ? "signup-error" : undefined}
              aria-invalid={passwordMismatch || undefined}
              value={repeatPassword}
              onChange={(e) => { setRepeatPassword(e.target.value); setPasswordMismatch(false); }}
              className={`${inputClass}${passwordMismatch ? " field-error" : ""}`}
            />
          </div>
        </div>

        {/* Role selection — page mode only. */}
        {!isInline && (
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
              <Shield className="w-3.5 h-3.5" />
              {ts("role_selection_title")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRole(option.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 ${
                    selectedRole === option.value
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.15]"
                  }`}
                  data-testid={`signup-role-${option.value}`}
                >
                  {option.icon}
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p
            id="signup-error"
            className="text-sm text-red-400"
            role="alert"
            aria-live="polite"
            data-testid={tid("error")}
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="gold"
          className="w-full min-h-[44px] text-sm"
          disabled={isLoading}
          data-testid={tid("submit-button")}
        >
          {isLoading ? (
            <span data-testid={tid("loading")}>{t("signup_submitting")}</span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
              {t("signup_submit")}
            </span>
          )}
        </Button>
      </form>

      {/* Separator */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground/90">{t("or_separator")}</span>
        </div>
      </div>

      {/* Google OAuth */}
      <GoogleOAuthButton
        namespace="auth"
        data-testid={tid("oauth-google-button") ?? "google-oauth-button"}
        beforeRedirect={onRequestGoogleOAuth}
        redirectTo={(() => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          if (isInline) {
            // Modal flow: callback reads localStorage for upgradeContext.
            return `${origin}/auth/callback`;
          }
          const params = new URLSearchParams();
          params.set("role", selectedRole || "both");
          if (joinCode) params.set("join_code", joinCode);
          if (inviteToken) params.set("invite", inviteToken);
          if (inviteCampaignId) params.set("campaign", inviteCampaignId);
          if (signupContext) params.set("context", signupContext);
          return `${origin}/auth/confirm?${params.toString()}`;
        })()}
      />

      {/* Footer link — page mode only */}
      {!isInline && (
        <p className="mt-4 text-center text-sm text-muted-foreground/90">
          {t("have_account")}{" "}
          <Link href="/auth/login" className="text-gold underline underline-offset-4 hover:text-gold/80">
            {t("login_link")}
          </Link>
        </p>
      )}
    </div>
  );
}
