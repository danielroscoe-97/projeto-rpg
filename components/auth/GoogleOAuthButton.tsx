"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface GoogleOAuthButtonProps {
  /** Where to redirect after login. Defaults to /app/dashboard */
  redirectTo?: string;
  /** i18n namespace to read labels from. Defaults to "auth" */
  namespace?: "auth" | "guest";
  /** Additional className */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
  /**
   * Fired synchronously right before the OAuth navigation starts. `AuthModal`
   * uses this to persist its `upgradeContext` into localStorage and close the
   * modal before the full-page redirect happens.
   */
  beforeRedirect?: () => void;
}

const GOOGLE_SVG = (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export function GoogleOAuthButton({
  redirectTo,
  namespace = "auth",
  className = "",
  "data-testid": testId = "google-oauth-button",
  beforeRedirect,
}: GoogleOAuthButtonProps) {
  const t = useTranslations(namespace);
  const [loading, setLoading] = useState(false);

  const labelKey = namespace === "guest" ? "upsell_google" : "google_login";
  const loadingKey = namespace === "guest" ? "upsell_google_loading" : "google_login_loading";

  const handleGoogleLogin = async () => {
    setLoading(true);
    // Fire `beforeRedirect` synchronously so any state persistence (e.g.
    // localStorage upgrade context) happens before the provider navigation.
    try {
      beforeRedirect?.();
    } catch {
      // A throwing beforeRedirect must not block OAuth.
    }
    try {
      const supabase = createClient();
      const resolvedRedirect = redirectTo ?? `${window.location.origin}/auth/callback`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: resolvedRedirect,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      data-testid={testId}
      className={`relative overflow-hidden w-full px-6 py-3 bg-white text-gray-800 font-medium rounded-lg hover:bg-gray-50 hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[48px] flex items-center justify-center gap-3 border border-gray-300 disabled:opacity-60 ${className}`}
    >
      {GOOGLE_SVG}
      {loading ? t(loadingKey) : t(labelKey)}
    </button>
  );
}
