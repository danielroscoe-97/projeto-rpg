"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { getAuthErrorKey } from "@/lib/auth/translate-error";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";

type LoginSuccessPayload = {
  userId: string;
};

type Variant = "page" | "inline";

export type LoginFormProps = React.ComponentPropsWithoutRef<"div"> & {
  /**
   * "page" (default) preserves the standalone page behavior — redirect on
   * success, mount "Forgot password?" link and sign-up footer.
   * "inline" is used inside `AuthModal` — no redirect, caller consumes
   * success via `onSuccess`, and the sign-up footer is suppressed.
   */
  variant?: Variant;
  onSuccess?: (payload: LoginSuccessPayload) => void;
  /**
   * Fired right before the Google OAuth redirect. Used by `AuthModal` to
   * persist `upgradeContext` to localStorage and close the modal.
   */
  onRequestGoogleOAuth?: () => void;
  /** Override the testid namespace — modal uses `auth.modal`. */
  testIdPrefix?: string;
};

export function LoginForm({
  className,
  variant = "page",
  onSuccess,
  onRequestGoogleOAuth,
  testIdPrefix,
  ...props
}: LoginFormProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const te = useTranslations("auth_errors");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // A2: Respect ?next= param from middleware redirect (e.g. /app/campaigns/abc)
  const nextUrl = useMemo(() => {
    const raw = searchParams.get("next");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return "/app/dashboard";
  }, [searchParams]);

  const tid = (slot: string) => (testIdPrefix ? `${testIdPrefix}.${slot}` : undefined);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      trackEvent("auth:login");

      // Delegate redirect to caller when in inline mode.
      if (variant === "inline" && onSuccess) {
        onSuccess({ userId: data.user?.id ?? "" });
        return;
      }

      // Sync language preference from DB to cookie
      try {
        const res = await fetch("/api/user/language");
        const { locale } = await res.json();
        if (locale) {
          document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
        }
      } catch {
        // Non-critical — middleware fallback handles locale
      }
      // Add welcome param to show loading screen on dashboard
      const target = new URL(nextUrl, window.location.origin);
      if (target.pathname === "/app/dashboard") {
        target.searchParams.set("welcome", "1");
      }
      router.push(target.pathname + target.search);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      const key = getAuthErrorKey(msg);
      setError(key ? te(key) : tc("error_generic"));
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const isInline = variant === "inline";
  const googleRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const params = new URLSearchParams();
    if (nextUrl !== "/app/dashboard") params.set("next", nextUrl);
    const qs = params.toString();
    return `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;
  }, [nextUrl]);

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {/* Page chrome — icon + title — suppressed in inline mode (the modal
        carries its own header). */}
      {!isInline && (
        <>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
          </div>
          <h2 className="font-display text-2xl text-center text-foreground tracking-wide mb-1">
            {t("login_title")}
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-4">
            {t("login_description")}
          </p>
        </>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            {t("email_label")}
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder={t("email_placeholder")}
            required
            aria-required="true"
            aria-describedby={error ? "login-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid={tid("email-input")}
            className="bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg focus:border-gold/60 focus:ring-gold/50"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="flex items-center gap-1.5 text-[11px] text-gold/80 uppercase tracking-widest font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              {t("password_label")}
            </label>
            {!isInline && (
              <Link
                href="/auth/forgot-password"
                className="text-[11px] text-muted-foreground/90 hover:text-gold transition-colors"
              >
                {t("forgot_password")}
              </Link>
            )}
          </div>
          <Input
            id="login-password"
            type="password"
            required
            aria-required="true"
            placeholder="••••••••"
            aria-describedby={error ? "login-error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid={tid("password-input")}
            className="bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg focus:border-gold/60 focus:ring-gold/50"
          />
        </div>

        {/* Error */}
        {error && (
          <p
            id="login-error"
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
            <span data-testid={tid("loading")}>{t("login_submitting")}</span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              {t("login_submit")}
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

      {/* Google OAuth — pass next param through /auth/callback */}
      <GoogleOAuthButton
        namespace="auth"
        data-testid={tid("oauth-google-button") ?? "google-oauth-button"}
        beforeRedirect={onRequestGoogleOAuth}
        redirectTo={googleRedirectTo ?? (() => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const params = new URLSearchParams();
          if (nextUrl !== "/app/dashboard") params.set("next", nextUrl);
          const qs = params.toString();
          return `${origin}/auth/confirm${qs ? `?${qs}` : ""}`;
        })()}
      />

      {/* Footer link — only in page mode; modal renders its own switcher. */}
      {!isInline && (
        <p className="mt-4 text-center text-sm text-muted-foreground/90">
          {t("no_account")}{" "}
          <Link href="/auth/sign-up" className="text-gold underline underline-offset-4 hover:text-gold/80">
            {t("signup_link")}
          </Link>
        </p>
      )}
    </div>
  );
}
