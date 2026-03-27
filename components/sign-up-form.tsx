"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { getAuthErrorKey } from "@/lib/auth/translate-error";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const te = useTranslations("auth_errors");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const router = useRouter();

  // Capture invite params from URL (Story 4.4)
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const inviteToken = searchParams?.get("invite") ?? null;
  const inviteCampaignId = searchParams?.get("campaign") ?? null;

  const handleSignUp = async (e: React.FormEvent) => {
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
      // Preserve invite params through email confirmation redirect (Story 4.4)
      let redirectUrl = `${window.location.origin}/auth/confirm`;
      if (inviteToken && inviteCampaignId) {
        redirectUrl += `?invite=${inviteToken}&campaign=${inviteCampaignId}`;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email)}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      const key = getAuthErrorKey(msg);
      setError(key ? te(key) : tc("error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg focus:border-gold/60 focus:ring-gold/50";

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {/* Icon circle */}
      <div className="flex justify-center mb-5">
        <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 className="font-display text-2xl text-center text-foreground tracking-wide mb-1">
        {t("signup_title")}
      </h2>
      <p className="text-center text-muted-foreground text-sm mb-6">
        {t("signup_description")}
      </p>

      <form onSubmit={handleSignUp} className="space-y-5">
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
            className={inputClass}
          />
        </div>

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

        {/* Error */}
        {error && (
          <p id="signup-error" className="text-sm text-red-400" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="gold"
          className="w-full min-h-[44px] text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            t("signup_submitting")
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

      {/* Footer link */}
      <p className="mt-5 text-center text-sm text-muted-foreground/60">
        {t("have_account")}{" "}
        <Link href="/auth/login" className="text-gold hover:underline underline-offset-4">
          {t("login_link")}
        </Link>
      </p>
    </div>
  );
}
